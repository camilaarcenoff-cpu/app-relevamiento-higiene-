import { createClient } from "@/lib/supabase/server";

export default async function HistorialPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: asignaciones } = await supabase
    .from("asignaciones_semanales")
    .select(
      "id, semana:semanas(numero, etiqueta, fecha_inicio, fecha_fin), manzana:manzanas(codigo, barrio)"
    )
    .eq("usuario_id", user!.id)
    .order("semana_id", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">
        Historial de semanas trabajadas
      </h1>
      <p className="text-gray-500 mb-6">
        Todas las manzanas que tuviste asignadas, semana a semana.
      </p>

      {(!asignaciones || asignaciones.length === 0) && (
        <div className="bg-white rounded-2xl shadow p-6 text-gray-500 text-sm">
          Todavía no tenés semanas registradas.
        </div>
      )}

      <div className="grid gap-3">
        {asignaciones?.map((a: any) => (
          <div
            key={a.id}
            className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-semibold text-navy">
                {a.semana?.etiqueta ?? `Semana ${a.semana?.numero}`}
              </div>
              <div className="text-sm text-gray-500">
                {a.semana?.fecha_inicio} → {a.semana?.fecha_fin}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-semibold">{a.manzana?.codigo}</div>
              <div className="text-sm text-gray-500">{a.manzana?.barrio}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
