import { createClient } from "@/lib/supabase/server";
import {
  crearItemFormulario,
  actualizarItemFormulario,
  eliminarItemFormulario,
} from "../actions";

const TITULOS: Record<string, string> = {
  veedor: "Relevamiento de la manzana (veedor/a)",
  vecino: "Percepción del vecino",
};

export default async function ItemsFormularioPage() {
  const supabase = createClient();
  const { data: items } = await supabase
    .from("items_formulario")
    .select("id, formulario, etiqueta, orden, activo")
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
        Estas son las preguntas que el equipo valora del 1 al 5 al cargar un
        relevamiento desde la app. Podés editar el texto, el orden, desactivar
        las que no uses o agregar nuevas. Los cambios se ven al instante en
        los formularios &quot;Relevamiento de la manzana&quot; y &quot;Percepción del
        vecino&quot;.
      </p>

      {(["veedor", "vecino"] as const).map((formulario) => (
        <div key={formulario} className="mb-8">
          <h2 className="font-semibold text-navy mb-3">{TITULOS[formulario]}</h2>

          {/* Alta de ítem */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
            <form action={crearItemFormulario} className="grid sm:grid-cols-6 gap-3">
              <input type="hidden" name="formulario" value={formulario} />
              <input
                name="etiqueta"
                placeholder="Ej: Estado de los contenedores"
                required
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-4"
              />
              <input
                name="orden"
                type="number"
                placeholder="Orden"
                defaultValue={(grupos[formulario]?.length ?? 0) + 1}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-1"
              />
              <button className="bg-navy text-white text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-90 sm:col-span-1">
                Agregar
              </button>
            </form>
          </div>

          {/* Listado */}
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2 w-20">Orden</th>
                  <th className="px-4 py-2">Pregunta / ítem</th>
                  <th className="px-4 py-2 w-20">Activo</th>
                  <th className="px-4 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {grupos[formulario]?.map((item) => {
                  const formId = `editar-item-${item.id}`;
                  return (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-4 py-2">
                        <form id={formId} action={actualizarItemFormulario} className="hidden" />
                        <input type="hidden" name="id" value={item.id} form={formId} />
                        <input
                          name="orden"
                          type="number"
                          defaultValue={item.orden}
                          form={formId}
                          className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
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
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
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
        cargadas, destildá &quot;Activo&quot; en vez de borrarlo.
      </p>
    </div>
  );
}
