import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();

  // Solo admins pueden exportar
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol !== "admin") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { data: rels, error } = await supabase
    .from("relevamientos")
    .select(`
      id, fecha, resuelto, formulario, tipo, observacion, direccion,
      calle, numeracion, altura_desde, altura_hasta,
      creado_por,
      manzana:manzanas(codigo, barrio, comuna:comunas(nombre)),
      semana:semanas(numero, etiqueta)
    `)
    .order("semana_id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Construir CSV
  const encabezados = [
    "ID",
    "Semana Nro",
    "Semana Etiqueta",
    "Manzana Código",
    "Barrio",
    "Comuna",
    "Fecha",
    "Formulario",
    "Tipo",
    "Dirección",
    "Calle",
    "Numeración",
    "Altura Desde",
    "Altura Hasta",
    "Estado",
    "Observación",
  ];

  function escaparCSV(val: unknown): string {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const filas = (rels ?? []).map((r: any) => [
    r.id,
    r.semana?.numero ?? "",
    r.semana?.etiqueta ?? "",
    r.manzana?.codigo ?? "",
    r.manzana?.barrio ?? "",
    r.manzana?.comuna?.nombre?.split(" - ")[0] ?? "",
    r.fecha ?? "",
    r.formulario ?? "historico",
    r.tipo ?? "",
    r.direccion ?? "",
    r.calle ?? "",
    r.numeracion ?? "",
    r.altura_desde ?? "",
    r.altura_hasta ?? "",
    r.resuelto ?? "Pendiente",
    r.observacion ?? "",
  ]);

  const csvLineas = [encabezados, ...filas]
    .map((fila) => fila.map(escaparCSV).join(","))
    .join("\r\n");

  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csvLineas, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relevamientos_${fecha}.csv"`,
    },
  });
}
