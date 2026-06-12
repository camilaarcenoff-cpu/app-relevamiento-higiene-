import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";

// Nombres de manzana, en orden (Manzana 1, Manzana 2, ...).
const NOMBRES_MANZANA = [
  "Manzana 1",
  "Manzana 2",
  "Manzana 3",
  "Manzana 4",
  "Manzana 5",
  "Manzana 6",
];

// Imagen por defecto si la manzana todavía no tiene foto cargada en
// /public/manzanas/<codigo>.jpg
const FOTO_POR_DEFECTO = "/manzanas/default.svg";

export default async function MiSemanaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Traemos TODAS las asignaciones del usuario, con su manzana.
  const { data: asignaciones } = await supabase
    .from("asignaciones_semanales")
    .select(
      "id, manzana_id, manzana:manzanas(codigo, barrio, comuna:comunas(codigo, nombre))"
    )
    .eq("usuario_id", user!.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Mi semana</h1>
      <p className="text-gray-500 mb-6">
        Estas son las manzanas asignadas a tu cuenta. A medida que avance la
        campaña se van a ir sumando más.
      </p>

      {(!asignaciones || asignaciones.length === 0) && (
        <div className="bg-yellow-50 border border-amarillo/50 text-sm text-gray-700 rounded-xl p-4">
          Todavía no tenés manzanas asignadas. Consultá con la coordinación.
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {asignaciones?.map((asignacion, index) => {
          const manzana = asignacion.manzana as any;

          const titulo = NOMBRES_MANZANA[index] ?? `Manzana ${index + 1}`;
          const foto = manzana?.codigo
            ? `/manzanas/${manzana.codigo.toLowerCase()}.jpg`
            : FOTO_POR_DEFECTO;

          return (
            <div
              key={asignacion.id}
              className="bg-white rounded-2xl shadow overflow-hidden flex flex-col"
            >
              <div className="relative w-full h-44 bg-gray-100">
                <Image
                  src={foto}
                  alt={`Foto de ${manzana?.codigo ?? titulo}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block text-xs font-semibold text-navy bg-turquesa/20 rounded-full px-3 py-1">
                    {titulo}
                  </span>
                </div>

                <div className="text-2xl font-bold text-navy mb-1">
                  {manzana?.codigo}
                </div>
                <div className="text-gray-500 mb-5 flex items-center gap-2">
                  <span>
                    {manzana?.barrio} ·{" "}
                    {manzana?.comuna?.nombre ?? manzana?.comuna?.codigo}
                  </span>
                  {manzana?.barrio && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${manzana.barrio}, Ciudad Autónoma de Buenos Aires`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-turquesa hover:underline whitespace-nowrap"
                    >
                      Ver en el mapa
                    </a>
                  )}
                </div>

                <div className="mt-auto flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/relevamientos/nuevo/veedor?asignacion=${asignacion.id}`}
                    className="bg-navy text-white text-sm font-semibold rounded-lg px-4 py-2.5 text-center hover:opacity-90"
                  >
                    Relevamiento del Veedor
                  </Link>
                  <Link
                    href={`/relevamientos/nuevo/vecino?asignacion=${asignacion.id}`}
                    className="bg-turquesa text-navy text-sm font-semibold rounded-lg px-4 py-2.5 text-center hover:opacity-90"
                  >
                    Cargar percepción del vecino
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
