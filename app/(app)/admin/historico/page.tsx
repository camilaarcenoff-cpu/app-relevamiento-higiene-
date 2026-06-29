import { createClient } from "@/lib/supabase/server";
import DashboardCharts from "./DashboardCharts";

type RelevamientoRaw = {
  id: string;
  fecha: string;
  resuelto: string | null;
  formulario: string | null;
  manzana: { codigo: string; barrio: string; comuna: { nombre: string } | null } | null;
  semana: { numero: number; etiqueta: string } | null;
};

type FilaDashboard = {
  id: string;
  fecha: string;
  resuelto: string;
  formulario: string | null;
  manzana_codigo: string;
  barrio: string;
  comuna_nombre: string;
  semana_numero: number;
};

function abreviarComuna(nombre: string): string {
  return nombre?.split(" - ")[0] ?? nombre ?? "Sin comuna";
}

export default async function HistoricoPage() {
  const supabase = createClient();

  const { data: rels } = await supabase
    .from("relevamientos")
    .select(`
      id, fecha, resuelto, formulario,
      manzana:manzanas(codigo, barrio, comuna:comunas(nombre)),
      semana:semanas(numero, etiqueta)
    `);

  const relevamientos: FilaDashboard[] = ((rels ?? []) as unknown as RelevamientoRaw[]).map((r) => ({
    id: r.id,
    fecha: r.fecha,
    resuelto: r.resuelto ?? "Pendiente",
    formulario: r.formulario,
    manzana_codigo: r.manzana?.codigo ?? "—",
    barrio: r.manzana?.barrio ?? "—",
    comuna_nombre: r.manzana?.comuna?.nombre ?? "Sin comuna",
    semana_numero: r.semana?.numero ?? 0,
  }));

  const semanasSet = new Set<number>();
  for (const r of relevamientos) semanasSet.add(r.semana_numero);
  const semanas = [...semanasSet].sort((a, b) => a - b);

  const porSemanaMap = new Map<number, number>();
  for (const r of relevamientos) porSemanaMap.set(r.semana_numero, (porSemanaMap.get(r.semana_numero) ?? 0) + 1);
  const porSemana = semanas.map((s) => ({ etiqueta: `Sem. ${s}`, total: porSemanaMap.get(s) ?? 0 }));

  const porBarrioMap = new Map<string, number>();
  for (const r of relevamientos) porBarrioMap.set(r.barrio, (porBarrioMap.get(r.barrio) ?? 0) + 1);
  const porBarrio = [...porBarrioMap.entries()].map(([barrio, total]) => ({ barrio, total })).sort((a, b) => b.total - a.total);

  const porComunaMap = new Map<string, number>();
  for (const r of relevamientos) {
    const c = abreviarComuna(r.comuna_nombre);
    porComunaMap.set(c, (porComunaMap.get(c) ?? 0) + 1);
  }
  const porComuna = [...porComunaMap.entries()].map(([comuna, total]) => ({ comuna, total })).sort((a, b) => b.total - a.total);

  const porManzanaMap = new Map<string, { barrio: string; porSemana: Record<number, number>; total: number }>();
  for (const r of relevamientos) {
    if (!porManzanaMap.has(r.manzana_codigo)) porManzanaMap.set(r.manzana_codigo, { barrio: r.barrio, porSemana: {}, total: 0 });
    const m = porManzanaMap.get(r.manzana_codigo)!;
    m.porSemana[r.semana_numero] = (m.porSemana[r.semana_numero] ?? 0) + 1;
    m.total += 1;
  }
  const porManzana = [...porManzanaMap.entries()].map(([codigo, data]) => ({ codigo, ...data })).sort((a, b) => b.total - a.total);

  const estadoColores: Record<string, string> = { Pendiente: "#FFD000", "En proceso": "#00B4C8", Resuelto: "#22C55E" };
  const porEstadoMap = new Map<string, number>();
  for (const r of relevamientos) porEstadoMap.set(r.resuelto || "Pendiente", (porEstadoMap.get(r.resuelto || "Pendiente") ?? 0) + 1);
  const porEstado = ["Pendiente", "En proceso", "Resuelto"].map((e) => ({ estado: e, total: porEstadoMap.get(e) ?? 0, color: estadoColores[e] }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy mb-1">Datos históricos</h1>
        <p className="text-gray-500 text-sm">Relevamientos importados de semanas anteriores.</p>
      </div>
      {relevamientos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">Sin datos.</div>
      ) : (
        <DashboardCharts
          porSemana={porSemana}
          porBarrio={porBarrio}
          porComuna={porComuna}
          porManzana={porManzana}
          porEstado={porEstado}
          totalRelevamientos={relevamientos.length}
          totalManzanas={porManzanaMap.size}
          semanas={semanas}
        />
      )}
    </div>
  );
}
