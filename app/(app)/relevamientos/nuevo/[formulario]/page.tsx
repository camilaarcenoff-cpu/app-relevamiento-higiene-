import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { crearRelevamientoCampo } from "../actions";
import FotoInput from "../FotoInput";
import PreguntasFormulario, { ItemFormulario } from "../PreguntasFormulario";

const TITULOS: Record<string, { titulo: string; bajada: string }> = {
  veedor: {
    titulo: "Relevamiento del Veedor",
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
    .select("id, usuario_id, manzana_id, manzana:manzanas(codigo, barrio)")
    .eq("id", asignacionId)
    .maybeSingle();

  if (!asignacion || asignacion.usuario_id !== user.id) {
    redirect("/mi-semana");
  }

  const { data: items } = await supabase
    .from("items_formulario")
    .select("id, etiqueta, orden, tipo, obligatoria, condicion_item_id, condicion_valor, opciones")
    .eq("formulario", formulario)
    .eq("activo", true)
    .order("orden");

  // Direcciones / calles ya relevadas en esta manzana, para sugerir (autocompletar).
  const { data: previas } = await supabase
    .from("relevamientos")
    .select("direccion, calle")
    .eq("manzana_id", asignacion.manzana_id);

  const direccionesUnicas = Array.from(
    new Set((previas || []).map((r: any) => r.direccion).filter(Boolean))
  );
  const callesUnicas = Array.from(
    new Set((previas || []).map((r: any) => r.calle).filter(Boolean))
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
          {(asignacion.manzana as any)?.codigo}
        </span>{" "}
        · {(asignacion.manzana as any)?.barrio}
      </p>

      <form action={crearRelevamientoCampo} className="space-y-5 bg-white rounded-2xl shadow p-6">
        <input type="hidden" name="asignacion_id" value={asignacion.id} />
        <input type="hidden" name="formulario" value={formulario} />

        {formulario === "veedor" ? (
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">
              Calle *
            </label>
            <input
              name="calle"
              required
              list="calles-previas"
              placeholder="Ej: Av. Rivadavia"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4"
            />
            <datalist id="calles-previas">
              {callesUnicas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-navy mb-1">
                  Numeración *
                </label>
                <select
                  name="numeracion"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Elegir...
                  </option>
                  <option value="par">Par</option>
                  <option value="impar">Impar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1">
                  Altura desde *
                </label>
                <input
                  type="number"
                  name="altura_desde"
                  required
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="Ej: 1000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1">
                  Altura hasta *
                </label>
                <input
                  type="number"
                  name="altura_hasta"
                  required
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="Ej: 1100"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Ej: Av. Rivadavia, del 1000 al 1100 mano par / del 1001 al 1099 mano
              impar.
            </p>
          </div>
        ) : (
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
        )}

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

        {/* ---- Preguntas del formulario (configurables desde el panel admin) ---- */}
        {items && items.length > 0 && (
          <PreguntasFormulario items={items as ItemFormulario[]} />
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

        {formulario === "veedor" && (
          <div className="space-y-4 border-t pt-4">
            <h2 className="text-sm font-semibold text-navy">Fotos</h2>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Fotos de cestos</label>
              <FotoInput
                name="fotos_cestos"
                ayuda="Opcional. Fotos del estado de los cestos papeleros de la cuadra."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Fotos de contenedores</label>
              <FotoInput
                name="fotos_contenedores"
                ayuda="Opcional. Fotos del estado de los contenedores de la cuadra."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Otras fotos</label>
              <FotoInput ayuda="Opcional. Otras fotos relevantes (microbasurales, veredas, etc.)." />
            </div>
          </div>
        )}

        <button className="w-full bg-amarillo text-navy font-bold rounded-lg px-4 py-3 hover:opacity-90">
          Guardar relevamiento
        </button>
      </form>
    </div>
  );
}
