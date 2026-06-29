import { createClient } from "@/lib/supabase/server";
import DashboardFormularios from "./DashboardFormularios";

type ItemFormulario = {
  id: string;
  etiqueta: string;
  tipo: "valoracion" | "si_no" | "opcion_multiple" | "numero" | "texto";
  opciones: string[] | null;
};

type RelevamientoRaw = {
  id: string;
  formulario: string;
  valoraciones: Record<string, string | number | string[]> | null;
  manzana: { codigo: string; barrio: string } | null;
};

interface Props {
  searchParams: { formulario?: string };
}

export default async function DashboardPage({ searchParams }: Props) {
  const formulario = (searchParams.formulario === "veedor" ? "veedor" : "vecino") as "vecino" | "veedor";
  const supabase = createClient();

  // Items del formulario
  const { data: items } = await supabase
    .from("items_formulario")
    .select("id, etiqueta, tipo, opciones")
    .eq("formulario", formulario)
    .eq("activo", true)
    .order("orden");

  const itemsFormulario: ItemFormulario[] = (items ?? []) as ItemFormulario[];

  // Relevamientos reales (con formulario)
  const { data: rels } = await supabase
    .from("relevamientos")
    .select("id, formulario, valoraciones, manzana:manzanas(codigo, barrio)")
    .eq("formulario", formulario);

  const relevamientos: RelevamientoRaw[] = (rels ?? []) as unknown as RelevamientoRaw[];
  const totalFormularios = relevamientos.length;

  // Manzanas con datos
  const manzanaMap = new Map<string, { barrio: string; total: number }>();
  for (const r of relevamientos) {
    const cod = r.manzana?.codigo ?? "—";
    if (!manzanaMap.has(cod)) manzanaMap.set(cod, { barrio: r.manzana?.barrio ?? "—", total: 0 });
    manzanaMap.get(cod)!.total += 1;
  }
  const manzanas = [...manzanaMap.entries()]
    .map(([codigo, d]) => ({ codigo, barrio: d.barrio, total: d.total }))
    .sort((a, b) => b.total - a.total);

  // Agrupar por tipo de item
  const valoraciones: { itemId: string; etiqueta: string; promedio: number; total: number }[] = [];
  const siNo: { itemId: string; etiqueta: string; si: number; no: number }[] = [];
  const opciones: { itemId: string; etiqueta: string; conteos: Record<string, number>; total: number }[] = [];
  const numeros: { itemId: string; etiqueta: string; suma: number; promedio: number; total: number }[] = [];

  for (const item of itemsFormulario) {
    if (item.tipo === "texto") continue; // texto libre no se agrega

    if (item.tipo === "valoracion") {
      const valores = relevamientos
        .map((r) => r.valoraciones?.[item.id])
        .filter((v) => typeof v === "number") as number[];
      if (valores.length === 0) continue;
      const promedio = valores.reduce((s, v) => s + v, 0) / valores.length;
      valoraciones.push({ itemId: item.id, etiqueta: item.etiqueta, promedio, total: valores.length });
    }

    if (item.tipo === "si_no") {
      let si = 0, no = 0;
      for (const r of relevamientos) {
        const v = r.valoraciones?.[item.id];
        if (v === "Si" || v === "Sí") si++;
        else if (v === "No") no++;
      }
      if (si + no === 0) continue;
      siNo.push({ itemId: item.id, etiqueta: item.etiqueta, si, no });
    }

    if (item.tipo === "opcion_multiple") {
      const conteos: Record<string, number> = {};
      for (const opcion of item.opciones ?? []) conteos[opcion] = 0;
      let total = 0;
      for (const r of relevamientos) {
        const v = r.valoraciones?.[item.id];
        const arr = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
        for (const sel of arr) {
          conteos[sel] = (conteos[sel] ?? 0) + 1;
          total++;
        }
      }
      if (total === 0) continue;
      opciones.push({ itemId: item.id, etiqueta: item.etiqueta, conteos, total });
    }

    if (item.tipo === "numero") {
      const valores = relevamientos
        .map((r) => r.valoraciones?.[item.id])
        .filter((v) => typeof v === "number") as number[];
      if (valores.length === 0) continue;
      const suma = valores.reduce((s, v) => s + v, 0);
      numeros.push({ itemId: item.id, etiqueta: item.etiqueta, suma, promedio: suma / valores.length, total: valores.length });
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy mb-1">Dashboard</h1>
        <p className="text-gray-500 text-sm">
          Resultados de los formularios cargados desde la app.
        </p>
      </div>

      <DashboardFormularios
        formulario={formulario}
        totalFormularios={totalFormularios}
        manzanas={manzanas}
        valoraciones={valoraciones}
        siNo={siNo}
        opciones={opciones}
        numeros={numeros}
      />
    </div>
  );
}
