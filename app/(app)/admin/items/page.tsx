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
        Estas son las preguntas que se muestran al cargar un relevamiento
        desde la app. Podés editar el texto, el orden, el tipo de respuesta,
        marcarlas como obligatorias, configurar lógica condicional, desactivar
        las que no uses o agregar nuevas (incluyendo bloques de preguntas
        libres que se pueden duplicar). Los cambios se ven al instante en los
        formularios &quot;Relevamiento del Veedor&quot; y &quot;Percepción del vecino&quot;.
      </p>

      {(["veedor", "vecino"] as const).map((formulario) => (
        <div key={formulario} className="mb-8">
          <h2 className="font-semibold text-navy mb-3">{TITULOS[formulario]}</h2>

          {/* Alta de ítem */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
            <form action={crearItemFormulario} className="grid sm:grid-cols-12 gap-3">
              <input type="hidden" name="formulario" value={formulario} />
              <input
                name="etiqueta"
                placeholder="Ej: Estado de los contenedores"
                required
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-4"
              />
              <select
                name="tipo"
                defaultValue="valoracion"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
              >
                {Object.entries(TIPOS_PREGUNTA).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
              <input
                name="orden"
                type="number"
                placeholder="Orden"
                defaultValue={(grupos[formulario]?.length ?? 0) + 1}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-1"
              />
              <select
                name="condicion_item_id"
                defaultValue=""
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
              >
                <option value="">Sin condición (siempre visible)</option>
                {grupos[formulario]?.map((item) => (
                  <option key={item.id} value={item.id}>
                    Si &quot;{item.etiqueta}&quot;...
                  </option>
                ))}
              </select>
              <input
                name="condicion_valor"
                placeholder="= Si / No / valor"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-1"
              />
              <label className="flex items-center gap-1 text-xs text-gray-600 sm:col-span-1">
                <input type="checkbox" name="obligatoria" />
                Obligatoria
              </label>
              <input
                name="opciones"
                placeholder="Opciones (solo para Opción única/múltiple): Bien, Regular, Mal"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-11"
              />
              <button className="bg-navy text-white text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-90 sm:col-span-1">
                Agregar
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-2">
              Para condicionar una pregunta a otra: elegí de qué pregunta
              depende y qué valor debe tener (&quot;Si&quot; o &quot;No&quot; para preguntas
              Sí/No). La pregunta condicionada solo se muestra si se cumple
              esa condición.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Para preguntas de &quot;Opción única&quot; u &quot;Opción múltiple&quot;, completá
              el campo &quot;Opciones&quot; con la lista de respuestas posibles,
              separadas por coma o por renglón (ej: Bien, Regular, Mal).
            </p>
          </div>

          {/* Listado */}
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2 w-16">Orden</th>
                  <th className="px-4 py-2">Pregunta / ítem</th>
                  <th className="px-4 py-2 w-32">Tipo</th>
                  <th className="px-4 py-2 w-48">Opciones</th>
                  <th className="px-4 py-2 w-44">Condición</th>
                  <th className="px-4 py-2 w-20">Oblig.</th>
                  <th className="px-4 py-2 w-20">Activo</th>
                  <th className="px-4 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {grupos[formulario]?.map((item) => {
                  const formId = `editar-item-${item.id}`;
                  const otrosItems = grupos[formulario]?.filter((i) => i.id !== item.id) || [];
                  return (
                    <tr key={item.id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-2">
                        <form id={formId} action={actualizarItemFormulario} className="hidden" />
                        <input type="hidden" name="id" value={item.id} form={formId} />
                        <input
                          name="orden"
                          type="number"
                          defaultValue={item.orden}
                          form={formId}
                          className="w-14 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          name="etiqueta"
                          defaultValue={item.etiqueta}
                          form={formId}
                          className="w-full rounded border border-transparent hover:border-gray-300 focus:border-turquesa px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          name="tipo"
                          defaultValue={item.tipo}
                          form={formId}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          {Object.entries(TIPOS_PREGUNTA).map(([valor, etiqueta]) => (
                            <option key={valor} value={valor}>
                              {etiqueta}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          name="opciones"
                          defaultValue={(item as any).opciones?.join(", ") ?? ""}
                          placeholder="Bien, Regular, Mal"
                          form={formId}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          name="condicion_item_id"
                          defaultValue={item.condicion_item_id ?? ""}
                          form={formId}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm mb-1"
                        >
                          <option value="">Sin condición</option>
                          {otrosItems.map((otro) => (
                            <option key={otro.id} value={otro.id}>
                              Si &quot;{otro.etiqueta}&quot;...
                            </option>
                          ))}
                        </select>
                        <input
                          name="condicion_valor"
                          defaultValue={item.condicion_valor ?? ""}
                          placeholder="= Si / No / valor"
                          form={formId}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          name="obligatoria"
                          defaultChecked={item.obligatoria}
                          form={formId}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          name="activo"
                          defaultChecked={item.activo}
                          form={formId}
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button form={formId} className="text-turquesa text-sm font-semibold hover:underline mr-3">
                          Guardar
                        </button>
                        <form action={eliminarItemFormulario} className="inline">
                          <input type="hidden" name="id" value={item.id} />
                          <button className="text-red-500 text-sm font-semibold hover:underline">
                            Borrar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {(!grupos[formulario] || grupos[formulario]!.length === 0) && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                      Todavía no hay ítems cargados para este formulario.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400 mt-1">
        Para desactivar un ítem sin perder el historial de respuestas ya
        cargadas, destildá &quot;Activo&quot; en vez de borrarlo. Para duplicar un
        bloque de preguntas libres (tipo &quot;Texto libre&quot;), agregá un nuevo
        ítem con el mismo tipo y un texto distinto.
      </p>
    </div>
  );
}
