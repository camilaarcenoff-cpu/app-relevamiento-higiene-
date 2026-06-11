import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function MiSemanaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hoy = new Date().toISOString().slice(0, 10);

  // Buscamos la semana de campaña que incluye la fecha de hoy.
  const { data: semanaActual } = await supabase
    .from("semanas")
    .select("id, numero, etiqueta, fecha_inicio, fecha_fin")
    .lte("fecha_inicio", hoy)
    .gte("fecha_fin", hoy)
    .maybeSingle();

  let asignacion = null;
  if (semanaActual) {
    const { data } = await supabase
      .from("asignaciones_semanales")
      .select(
        "id, manzana_id, manzana:manzanas(codigo, barrio, comuna:comunas(codigo, nombre))"
      )
      .eq("usuario_id", user!.id)
      .eq("semana_id", semanaActual.id)
      .maybeSingle();
    asignacion = data;
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
          Todavía no se cargó la semana actual en el calendario de la
          campaña. Consultá con la coordinación.
        </div>
      )}

      {semanaActual && !asignacion && (
        <div className="bg-yellow-50 border border-amarillo/50 text-sm text-gray-700 rounded-xl p-4">
          Todavía no tenés una manzana asignada para esta semana. Consultá
          con la coordinación.
        </div>
      )}

      {asignacion && (
        <div className="bg-white rounded-2xl shadow p-6 max-w-md">
          <span className="inline-block text-xs font-semibold text-navy bg-turquesa/20 rounded-full px-3 py-1 mb-3">
            Manzana asignada esta semana
          </span>
          <div className="text-3xl font-bold text-navy mb-1">
            {/* @ts-expect-error - relación anidada de Supabase */}
            {asignacion.manzana?.codigo}
          </div>
          <div className="text-gray-500 mb-5">
            {/* @ts-expect-error - relación anidada de Supabase */}
            {asignacion.manzana?.barrio} ·{" "}
            {/* @ts-expect-error - relación anidada de Supabase */}
            {asignacion.manzana?.comuna?.nombre ?? asignacion.manzana?.comuna?.codigo}
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
              className="bg-turquesa text-navy text-sm font-semibold rounded-lg px-4 py-2.5 text-center hover:opacity-90"
            >
              Cargar percepción del vecino
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
