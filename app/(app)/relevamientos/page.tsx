import { createClient } from "@/lib/supabase/server";
import { Fragment } from "react";

export default async function RelevamientosPage({
  searchParams,
}: {
  searchParams: { semana?: string; q?: string; creado?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Manzanas asignadas al usuario logueado: solo mostramos relevamientos de
  // esas manzanas (no el histórico completo de toda la ciudad).
  const { data: asignaciones } = await supabase
    .from("asignaciones_semanales")
    .select("manzana_id")
    .eq("usuario_id", user!.id);

  const manzanaIds = Array.from(
    new Set((asignaciones || []).map((a: any) => a.manzana_id).filter(Boolean))
  );

  // Semanas para el selector de filtro (RLS: visibles para todos los logueados).
  const { data: semanas } = await supabase
    .from("semanas")
    .select("id, numero, etiqueta")
    .order("numero", { ascending: false });

  let query = supabase
    .from("relevamientos")
    .select(
      "id, fecha, created_at, direccion, tipo, observacion, contacto_vecino, resuelto, formulario, fotos, fotos_cestos, fotos_contenedores, manzana:manzanas(codigo), semana:semanas(numero, etiqueta)"
    )
    .in("manzana_id", manzanaIds.length > 0 ? manzanaIds : ["__ninguna__"])
    .order("fecha", { ascending: false });

  if (searchParams.semana) {
    query = query.eq("semana_id", searchParams.semana);
  }
  if (searchParams.q) {
    query = query.or(
      `direccion.ilike.%${searchParams.q}%,observacion.ilike.%${searchParams.q}%`
    );
  }

  const { data: relevamientosRaw } = await query;

  // Agrupamos por manzana (cada manzana puede tener una cantidad y
  // frecuencia de relevamientos totalmente distinta a las demás).
  // Dentro de cada grupo respetamos el orden por fecha (descendente) que
  // ya viene de la consulta. Ordenamos los grupos por código de manzana.
  const grupos = new Map<string, { codigo: string; items: any[] }>();
  for (const r of relevamientosRaw || []) {
    const codigo = (r as any).manzana?.codigo ?? "Sin manzana";
    if (!grupos.has(codigo)) grupos.set(codigo, { codigo, items: [] });
    grupos.get(codigo)!.items.push(r);
  }
  const gruposOrdenados = Array.from(grupos.values()).sort((a, b) =>
    a.codigo.localeCompare(b.codigo)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Relevamientos</h1>
      <p className="text-gray-500 mb-6">
        Todos los relevamientos cargados en las manzanas que te corresponden.
      </p>

      {searchParams.creado === "1" && (
        <div className="bg-turquesa/10 border border-turquesa/40 text-navy text-sm font-medium rounded-xl px-4 py-3 mb-6">
          ✅ Relevamiento guardado correctamente.
        </div>
      )}

      {/* Filtros */}
      <form className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <select
          name="semana"
          defaultValue={searchParams.semana ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm flex-1"
        >
          <option value="">Todas las semanas</option>
          {semanas?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.etiqueta ?? `Semana ${s.numero}`}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Buscar por dirección u observación..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm flex-1"
        />
        <button className="bg-navy text-white text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-90">
          Buscar
        </button>
      </form>

      {/* Resultados: una sola tabla, agrupada por manzana */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Fecha de carga</th>
              <th className="px-4 py-2">Manzana</th>
              <th className="px-4 py-2">Semana</th>
              <th className="px-4 py-2">Dirección</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Observación</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Fotos</th>
            </tr>
          </thead>
          <tbody>
            {gruposOrdenados.map((grupo) => (
              <Fragment key={grupo.codigo}>
                <tr className="border-t border-gray-200 bg-turquesa/10">
                  <td colSpan={9} className="px-4 py-2 font-semibold text-navy font-mono">
                    Manzana {grupo.codigo} · {grupo.items.length} relevamiento
                    {grupo.items.length === 1 ? "" : "s"}
                  </td>
                </tr>
                {grupo.items.map((r: any) => {
                  const totalFotos =
                    (r.fotos?.length ?? 0) +
                    (r.fotos_cestos?.length ?? 0) +
                    (r.fotos_contenedores?.length ?? 0);
                  return (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-4 py-2 whitespace-nowrap">{r.fecha}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString("es-AR")
                          : "—"}
                      </td>
                      <td className="px-4 py-2 font-mono">{r.manzana?.codigo}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {r.semana?.etiqueta ?? r.semana?.numero}
                      </td>
                      <td className="px-4 py-2">{r.direccion}</td>
                      <td className="px-4 py-2">{r.tipo}</td>
                      <td className="px-4 py-2 max-w-xs">{r.observacion}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            "text-xs font-semibold rounded-full px-2 py-1 " +
                            (r.resuelto === "Resuelto"
                              ? "bg-green-100 text-green-700"
                              : r.resuelto === "En proceso"
                              ? "bg-amarillo/30 text-navy"
                              : "bg-gray-100 text-gray-600")
                          }
                        >
                          {r.resuelto}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {totalFotos > 0 ? `📷 ${totalFotos}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
            {gruposOrdenados.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                  No hay relevamientos para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
