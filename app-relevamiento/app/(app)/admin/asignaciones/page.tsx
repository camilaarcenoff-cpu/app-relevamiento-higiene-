import { createClient } from "@/lib/supabase/server";
import { crearAsignacion, eliminarAsignacion } from "../actions";

export default async function AsignacionesPage({
  searchParams,
}: {
  searchParams: { semana?: string };
}) {
  const supabase = createClient();

  const [{ data: usuarios }, { data: manzanas }, { data: semanas }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("manzanas").select("id, codigo, barrio").order("codigo"),
    supabase.from("semanas").select("id, numero, etiqueta").order("numero", { ascending: false }),
  ]);

  const semanaSeleccionada = searchParams.semana || semanas?.[0]?.id;

  const { data: asignaciones } = semanaSeleccionada
    ? await supabase
        .from("asignaciones_semanales")
        .select("id, usuario:perfiles(id, nombre), manzana:manzanas(id, codigo, barrio)")
        .eq("semana_id", semanaSeleccionada)
        .order("id")
    : { data: [] as any[] };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">
        Asignaciones por semana
      </h1>
      <p className="text-gray-500 mb-6">
        Definí qué manzana le corresponde a cada persona en cada semana.
      </p>

      {/* Selector de semana */}
      <form className="mb-6 flex gap-2" method="get">
        <select
          name="semana"
          defaultValue={semanaSeleccionada}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {semanas?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.etiqueta ?? `Semana ${s.numero}`}
            </option>
          ))}
        </select>
        <button className="bg-white border border-gray-300 text-sm font-semibold rounded-lg px-4 py-2 hover:bg-gray-50">
          Ver
        </button>
      </form>

      {/* Nueva asignación */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <h2 className="font-semibold text-navy mb-3">Nueva asignación</h2>
        <form action={crearAsignacion} className="grid sm:grid-cols-4 gap-3">
          <input type="hidden" name="semana_id" value={semanaSeleccionada} />
          <select name="usuario_id" required className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Persona...</option>
            {usuarios?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
          <select name="manzana_id" required className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Manzana...</option>
            {manzanas?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.codigo} {m.barrio ? `· ${m.barrio}` : ""}
              </option>
            ))}
          </select>
          <button className="bg-navy text-white text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-90 sm:col-span-2">
            Asignar
          </button>
        </form>
      </div>

      {/* Listado */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Persona</th>
              <th className="px-4 py-2">Manzana</th>
              <th className="px-4 py-2">Barrio</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {asignaciones?.map((a: any) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{a.usuario?.nombre}</td>
                <td className="px-4 py-2 font-mono">{a.manzana?.codigo}</td>
                <td className="px-4 py-2">{a.manzana?.barrio}</td>
                <td className="px-4 py-2 text-right">
                  <form action={eliminarAsignacion}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="text-red-500 text-sm hover:underline">Quitar</button>
                  </form>
                </td>
              </tr>
            ))}
            {(!asignaciones || asignaciones.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No hay asignaciones cargadas para esta semana.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
