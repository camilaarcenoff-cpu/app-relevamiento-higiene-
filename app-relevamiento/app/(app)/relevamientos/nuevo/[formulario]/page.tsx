import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { crearRelevamientoCampo } from "../actions";
import FotoInput from "../FotoInput";

const TITULOS: Record<string, { titulo: string; bajada: string }> = {
  veedor: {
    titulo: "Relevamiento de la manzana",
    bajada: "Lo completa el equipo de campo (veedor/a) sobre el estado general de la manzana.",
  },
  vecino: {
    titulo: "Percepción del vecino",
    bajada: "Lo completa el equipo de campo a partir de una charla con un vecino o comercio.",
  },
};

export default async function NuevoRelevamientoPage({
  params,
  searchParams,
}: {
  params: { formulario: string };
  searchParams: { asignacion?: string };
}) {
  const formulario = params.formulario;
  if (!TITULOS[formulario]) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const asignacionId = searchParams.asignacion;
  if (!asignacionId) redirect("/mi-semana");

  const { data: asignacion } = await supabase
    .from("asignaciones_semanales")
    .select(
      "id, usuario_id, manzana_id, manzana:manzanas(codigo, barrio), semana:semanas(etiqueta, numero)"
    )
    .eq("id", asignacionId)
    .maybeSingle();

  if (!asignacion || asignacion.usuario_id !== user.id) {
    redirect("/mi-semana");
  }

  const { data: items } = await supabase
    .from("items_formulario")
    .select("id, etiqueta, orden")
    .eq("formulario", formulario)
    .eq("activo", true)
    .order("orden");

  // Direcciones ya relevadas en esta manzana, para sugerir (autocompletar).
  const { data: direccionesPrevias } = await supabase
    .from("relevamientos")
    .select("direccion")
    .eq("manzana_id", asignacion.manzana_id);

  const direccionesUnicas = Array.from(
    new Set((direccionesPrevias || []).map((r: any) => r.direccion))
  );

  const { titulo, bajada } = TITULOS[formulario];

  return (
    <div className="max-w-2xl">
      <Link href="/mi-semana" className="text-sm text-turquesa hover:underline">
        ← Volver a Mi semana
      </Link>

      <h1 className="text-2xl font-bold text-navy mt-2 mb-1">{titulo}</h1>
      <p className="text-gray-500 mb-1">{bajada}</p>
      <p className="text-sm text-gray-400 mb-6">
        Manzana{" "}
        <span className="font-mono text-navy">
          {/* @ts-expect-error - relación anidada de Supabase */}
          {asignacion.manzana?.codigo}
        </span>{" "}
        {/* @ts-expect-error - relación anidada de Supabase */}
        · {asignacion.manzana?.barrio} ·{" "}
        {/* @ts-expect-error - relación anidada de Supabase */}
        {asignacion.semana?.etiqueta ?? `Semana ${asignacion.semana?.numero}`}
      </p>

      <form action={crearRelevamientoCampo} className="space-y-5 bg-white rounded-2xl shadow p-6">
        <input type="hidden" name="asignacion_id" value={asignacion.id} />
        <input type="hidden" name="formulario" value={formulario} />

        <div>
          <label className="block text-sm font-semibold text-navy mb-1">
            Dirección *
          </label>
          <input
            name="direccion"
            required
            list="direcciones-previas"
            placeholder="Ej: Av. Santa Fe 3500"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <datalist id="direcciones-previas">
            {direccionesUnicas.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">Tipo</label>
            <select
              name="tipo"
              defaultValue="Primera visita"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="Primera visita">Primera visita</option>
              <option value="Seguimiento">Seguimiento</option>
              <option value="Recorrida">Recorrida</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy mb-1">Estado</label>
            <select
              name="resuelto"
              defaultValue="Pendiente"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="Pendiente">Pendiente</option>
              <option value="En proceso">En proceso</option>
              <option value="Resuelto">Resuelto</option>
            </select>
          </div>
        </div>

        {formulario === "vecino" && (
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">
              Contacto del vecino
            </label>
            <input
              name="contacto_vecino"
              placeholder="Nombre, teléfono u otro dato de contacto (opcional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        {/* ---- Valoraciones 1 a 5 ---- */}
        {items && items.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-navy border-t pt-4">
              Valoraciones (1 = muy malo, 5 = muy bueno)
            </h2>
            {items.map((item) => (
              <div key={item.id}>
                <label className="block text-sm text-gray-700 mb-1">{item.etiqueta}</label>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label
                      key={n}
                      className="flex items-center gap-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 cursor-pointer has-[:checked]:bg-turquesa has-[:checked]:text-white has-[:checked]:border-turquesa"
                    >
                      <input
                        type="radio"
                        name={`valoracion_${item.id}`}
                        value={n}
                        className="sr-only"
                        required
                      />
                      {n}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-navy mb-1">Observaciones</label>
          <textarea
            name="observacion"
            rows={3}
            placeholder="Cualquier comentario adicional (opcional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-navy mb-1">Fotos</label>
          <FotoInput />
        </div>

        <button className="w-full bg-amarillo text-navy font-bold rounded-lg px-4 py-3 hover:opacity-90">
          Guardar relevamiento
        </button>
      </form>
    </div>
  );
}
