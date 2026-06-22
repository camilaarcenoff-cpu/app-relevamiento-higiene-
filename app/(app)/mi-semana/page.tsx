import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function MiSemanaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hoy = new Date().toISOString().slice(0, 10);

  const { data: semanaActual } = await supabase
    .from("semanas")
    .select("id, numero, etiqueta, fecha_inicio, fecha_fin")
    .lte("fecha_inicio", hoy)
    .gte("fecha_fin", hoy)
    .maybeSingle();

  // Busca TODAS las manzanas asignadas al usuario esta semana (puede ser 2)
  let asignaciones: any[] = [];
  if (semanaActual) {
    const { data } = await supabase
      .from("asignaciones_semanales")
      .select(
        "id, manzana_id, manzana:manzanas(codigo, barrio, foto_url, comuna:comunas(codigo, nombre))"
      )
      .eq("usuario_id", user!.id)
      .eq("semana_id", semanaActual.id);
    asignaciones = data ?? [];
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Mi semana</h1>
      <p className="text-gray-500 mb-6">
        {semanaActual
          ? semanaActual.etiqueta ?? `Semana ${semanaActual.numero}`
          : "No hay una semana de campaña configurada para hoy."}
      </p>

      {!semanaActual && (
        <div className="bg-yellow-50 border border-amarillo/50 text-sm text-gray-700 rounded-xl p-4">
          Todavía no se cargó la semana actual en el calendario de la campaña. Consultá con la
          coordinación.
        </div>
      )}

      {semanaActual && asignaciones.length === 0 && (
        <div className="bg-yellow-50 border border-amarillo/50 text-sm text-gray-700 rounded-xl p-4">
          Todavía no tenés manzanas asignadas para esta semana. Consultá con la coordinación.
        </div>
      )}

      <div className="space-y-4">
        {asignaciones.map((asignacion, idx) => {
          const manzana = asignacion.manzana;
          return (
            <div key={asignacion.id} className="bg-white rounded-2xl shadow p-6 max-w-md">
              <span className="inline-block text-xs font-semibold text-navy bg-turquesa/20 rounded-full px-3 py-1 mb-3">
                {asignaciones.length > 1 ? `Manzana ${idx + 1}` : "Manzana asignada esta semana"}
              </span>

              {/* Foto de referencia de la manzana */}
              {manzana?.foto_url && (
                <div className="mb-4 rounded-xl overflow-hidden border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={manzana.foto_url}
                    alt={`Foto de ${manzana.codigo}`}
                    className="w-full h-40 object-cover"
                  />
                </div>
              )}

              <div className="text-3xl font-bold text-navy mb-1">{manzana?.codigo}</div>
              <div className="text-gray-500 mb-5">
                {manzana?.barrio} ·{" "}
                {manzana?.comuna?.nombre ?? manzana?.comuna?.codigo}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/relevamientos/nuevo/veedor?asignacion=${asignacion.id}`}
                  className="bg-navy text-white text-sm font-semibold rounded-lg px-4 py-2.5 text-center hover:opacity-90"
                >
                  Cargar relevamiento de la manzana
                </Link>
                <Link
                  href={`/relevamientos/nuevo/vecino?asignacion=${asignacion.id}`}
                  className="border border-navy text-navy text-sm font-semibold rounded-lg px-4 py-2.5 text-center hover:bg-navy/5"
                >
                  Registrar percepción del vecino
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
