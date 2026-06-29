import { createClient } from "@/lib/supabase/server";
import {
  crearItemFormulario,
  actualizarItemFormulario,
  eliminarItemFormulario,
} from "../actions";

const TITULOS: Record<string, string> = {
  veedor: "Relevamiento del Veedor",
  vecino: "Percepción del vecino",
};

const TIPOS_PREGUNTA: Record<string, string> = {
  valoracion: "Valoración (1-5)",
  si_no: "Sí / No",
  texto: "Texto libre",
  numero: "Número (cantidad)",
  opcion_unica: "Opción única (a elección)",
  opcion_multiple: "Opción múltiple (varias)",
};

export default async function ItemsFormularioPage() {
  const supabase = createClient();
  const { data: items } = await supabase
    .from("items_formulario")
    .select(
      "id, formulario, etiqueta, orden, activo, tipo, obligatoria, condicion_item_id, condicion_valor, opciones"
    )
    .order("formulario")
    .order("orden");

  const grupos: Record<string, typeof items> = { veedor: [], vecino: [] };
  for (const item of items || []) {
    grupos[item.formulario]?.push(item);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Ítems de formulario</h1>
      <p className="text-gray-500 mb-6">
        Preguntas que aparecen en los formularios de relevamiento. Editá y guardá fila por fila.
      </p>

      {(["veedor", "vecino"] as const).map((formulario) => (
        <div key={formulario} className="mb-10">
          <h2 className="font-semibold text-navy mb-3">{TITULOS[formulario]}</h2>

          {/* Alta */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nueva pregunta</p>
            <form action={crearItemFormulario} className="flex flex-wrap gap-2">
              <input type="hidden" name="formulario" value={formulario} />
              <input
                name="etiqueta"
                placeholder="Texto de la pregunta"
                required
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm flex-1 min-w-48"
              />
              <select
                name="tipo"
                defaultValue="valoracion"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {Object.entries(TIPOS_PREGUNTA).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
              <input
                name="orden"
                type="number"
                placeholder="Orden"
                defaultValue={(grupos[formulario]?.length ?? 0) + 1}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-20"
              />
              <label className="flex items-center gap-1 text-xs text-gray-600 px-2">
                <input type="checkbox" name="obligatoria" />
                Obligatoria
              </label>
              <input
                name="opciones"
                placeholder="Opciones: Bien, Regular, Mal (solo si aplica)"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-full"
              />
              <button className="bg-navy text-white text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-90">
                Agregar
              </button>
            </form>
          </div>

          {/* Listado */}
          <div className="space-y-2">
            {grupos[formulario]?.map((item) => {
              const otrosItems = grupos[formulario]?.filter((i) => i.id !== item.id) || [];
              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm p-4">
                  <form action={actualizarItemFormulario}>
                    {/* Todos los inputs DENTRO del form — sin form association */}
                    <input type="hidden" name="id" value={item.id} />

                    <div className="flex flex-wrap gap-3 items-start">
                      {/* Orden */}
                      <div className="w-16">
                        <label className="block text-xs text-gray-500 mb-1">Orden</label>
                        <input
                          name="orden"
                          type="number"
                          defaultValue={item.orden}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>

                      {/* Etiqueta */}
                      <div className="flex-1 min-w-48">
                        <label className="block text-xs text-gray-500 mb-1">Pregunta</label>
                        <input
                          name="etiqueta"
                          defaultValue={item.etiqueta}
                          className="w-full rounded border border-gray-300 hover:border-gray-400 focus:border-turquesa px-2 py-1 text-sm"
                        />
                      </div>

                      {/* Tipo */}
                      <div className="w-40">
                        <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                        <select
                          name="tipo"
                          defaultValue={item.tipo}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          {Object.entries(TIPOS_PREGUNTA).map(([v, label]) => (
                            <option key={v} value={v}>{label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Checkboxes */}
                      <div className="flex flex-col gap-2 pt-5">
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input type="checkbox" name="obligatoria" defaultChecked={item.obligatoria} />
                          Obligatoria
                        </label>
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input type="checkbox" name="activo" defaultChecked={item.activo} />
                          Activa
                        </label>
                      </div>

                      {/* Guardar */}
                      <div className="pt-5">
                        <button
                          type="submit"
                          className="bg-turquesa/20 text-turquesa text-sm font-semibold rounded-lg px-3 py-1.5 hover:bg-turquesa/30"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>

                    {/* Opciones (solo para opcion_unica/multiple) */}
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500 mb-1">
                        Opciones (separadas por coma — solo para &quot;Opción única&quot; o &quot;Opción múltiple&quot;)
                      </label>
                      <input
                        name="opciones"
                        defaultValue={(item as any).opciones?.join(", ") ?? ""}
                        placeholder="Bien, Regular, Mal"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>

                    {/* Condición */}
                    <div className="mt-2 flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Mostrar solo si...</label>
                        <select
                          name="condicion_item_id"
                          defaultValue={item.condicion_item_id ?? ""}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          <option value="">Sin condición (siempre visible)</option>
                          {otrosItems.map((otro) => (
                            <option key={otro.id} value={otro.id}>
                              &quot;{otro.etiqueta}&quot; es igual a...
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <label className="block text-xs text-gray-500 mb-1">...este valor</label>
                        <input
                          name="condicion_valor"
                          defaultValue={item.condicion_valor ?? ""}
                          placeholder="Si / No / valor"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </form>

                  {/* Eliminar (form separado) */}
                  <form action={eliminarItemFormulario} className="mt-2">
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className="text-red-400 text-xs hover:text-red-600 hover:underline">
                      Eliminar
                    </button>
                  </form>
                </div>
              );
            })}

            {(!grupos[formulario] || grupos[formulario]!.length === 0) && (
              <div className="bg-white rounded-xl shadow-sm px-4 py-8 text-center text-gray-400 text-sm">
                Todavía no hay preguntas cargadas para este formulario.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
