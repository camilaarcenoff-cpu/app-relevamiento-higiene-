"use client";

import { useState } from "react";

export type ItemFormulario = {
  id: string;
  etiqueta: string;
  tipo:
    | "valoracion"
    | "si_no"
    | "texto"
    | "numero"
    | "opcion_unica"
    | "opcion_multiple";
  obligatoria: boolean;
  condicion_item_id: string | null;
  condicion_valor: string | null;
  opciones: string[] | null;
};

type Props = {
  items: ItemFormulario[];
};

// Renderiza las preguntas configuradas desde el panel de administración
// (Ítems de formulario). Soporta 6 tipos de pregunta:
//  - "valoracion": escala de 1 a 5
//  - "si_no": Sí / No
//  - "texto": respuesta libre (se puede duplicar desde el admin)
//  - "numero": cantidad (entero >= 0), usado en el checklist de cestos/contenedores
//  - "opcion_unica": opciones definidas desde el admin, se elige una (radio)
//  - "opcion_multiple": opciones definidas desde el admin, se pueden elegir
//    varias (checkboxes)
//
// Además aplica lógica condicional: una pregunta puede configurarse para
// mostrarse solo si OTRA pregunta (condicion_item_id) fue respondida con un
// valor determinado (condicion_valor). Por ejemplo: "¿Se detectó un
// microbasural?" = Sí -> muestra "Descripción del microbasural".
export default function PreguntasFormulario({ items }: Props) {
  const [respuestas, setRespuestas] = useState<
    Record<string, string | string[]>
  >({});

  function setRespuesta(id: string, valor: string | string[]) {
    setRespuestas((prev) => ({ ...prev, [id]: valor }));
  }

  function toggleOpcionMultiple(id: string, opcion: string, marcado: boolean) {
    setRespuestas((prev) => {
      const actuales = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const nuevas = marcado
        ? [...actuales, opcion]
        : actuales.filter((o) => o !== opcion);
      return { ...prev, [id]: nuevas };
    });
  }

  function esVisible(item: ItemFormulario): boolean {
    if (!item.condicion_item_id) return true;
    const valorControlador = respuestas[item.condicion_item_id];
    if (Array.isArray(valorControlador)) {
      return valorControlador.includes(item.condicion_valor ?? "");
    }
    return valorControlador === item.condicion_valor;
  }

  const visibles = items.filter(esVisible);

  if (visibles.length === 0) return null;

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold text-navy border-t pt-4">
        Preguntas del relevamiento
      </h2>

      {visibles.map((item) => (
        <div key={item.id}>
          <label className="block text-sm text-gray-700 mb-1">
            {item.etiqueta}
            {item.obligatoria && <span className="text-red-500"> *</span>}
          </label>

          {item.tipo === "valoracion" && (
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <label
                  key={n}
                  className="flex items-center gap-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 cursor-pointer has-[:checked]:bg-turquesa has-[:checked]:text-white has-[:checked]:border-turquesa"
                >
                  <input
                    type="radio"
                    name={`respuesta_${item.id}`}
                    value={n}
                    className="sr-only"
                    required={item.obligatoria}
                    onChange={() => setRespuesta(item.id, String(n))}
                  />
                  {n}
                </label>
              ))}
              <p className="text-xs text-gray-400 self-center ml-1">
                1 = muy malo · 5 = muy bueno
              </p>
            </div>
          )}

          {item.tipo === "si_no" && (
            <div className="flex gap-3">
              {["Si", "No"].map((opcion) => (
                <label
                  key={opcion}
                  className="flex items-center gap-1 text-sm border border-gray-300 rounded-lg px-4 py-1.5 cursor-pointer has-[:checked]:bg-turquesa has-[:checked]:text-white has-[:checked]:border-turquesa"
                >
                  <input
                    type="radio"
                    name={`respuesta_${item.id}`}
                    value={opcion}
                    className="sr-only"
                    required={item.obligatoria}
                    onChange={() => setRespuesta(item.id, opcion)}
                  />
                  {opcion === "Si" ? "Sí" : "No"}
                </label>
              ))}
            </div>
          )}

          {item.tipo === "texto" && (
            <textarea
              name={`respuesta_${item.id}`}
              rows={2}
              required={item.obligatoria}
              onChange={(e) => setRespuesta(item.id, e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Escribí la respuesta..."
            />
          )}

          {item.tipo === "numero" && (
            <input
              type="number"
              name={`respuesta_${item.id}`}
              min={0}
              step={1}
              inputMode="numeric"
              required={item.obligatoria}
              onChange={(e) => setRespuesta(item.id, e.target.value)}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="0"
            />
          )}

          {item.tipo === "opcion_unica" && (
            <div className="flex flex-wrap gap-3">
              {(item.opciones ?? []).map((opcion) => (
                <label
                  key={opcion}
                  className="flex items-center gap-1 text-sm border border-gray-300 rounded-lg px-4 py-1.5 cursor-pointer has-[:checked]:bg-turquesa has-[:checked]:text-white has-[:checked]:border-turquesa"
                >
                  <input
                    type="radio"
                    name={`respuesta_${item.id}`}
                    value={opcion}
                    className="sr-only"
                    required={item.obligatoria}
                    onChange={() => setRespuesta(item.id, opcion)}
                  />
                  {opcion}
                </label>
              ))}
            </div>
          )}

          {item.tipo === "opcion_multiple" && (
            <div className="flex flex-wrap gap-3">
              {(item.opciones ?? []).map((opcion) => (
                <label
                  key={opcion}
                  className="flex items-center gap-1 text-sm border border-gray-300 rounded-lg px-4 py-1.5 cursor-pointer has-[:checked]:bg-turquesa has-[:checked]:text-white has-[:checked]:border-turquesa"
                >
                  <input
                    type="checkbox"
                    name={`respuesta_${item.id}`}
                    value={opcion}
                    className="sr-only"
                    onChange={(e) =>
                      toggleOpcionMultiple(item.id, opcion, e.target.checked)
                    }
                  />
                  {opcion}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
