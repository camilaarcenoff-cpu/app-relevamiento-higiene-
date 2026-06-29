"use client";

import { useState } from "react";

type ItemFormulario = {
  id: string;
  etiqueta: string;
  tipo: "valoracion" | "si_no" | "opcion_multiple" | "numero" | "texto";
  opciones: string[] | null;
};

type AggValoracion = { itemId: string; etiqueta: string; promedio: number; total: number };
type AggSiNo = { itemId: string; etiqueta: string; si: number; no: number };
type AggOpcion = { itemId: string; etiqueta: string; conteos: Record<string, number>; total: number };
type AggNumero = { itemId: string; etiqueta: string; suma: number; promedio: number; total: number };

type DatoManzana = { codigo: string; barrio: string; total: number };

interface Props {
  formulario: "vecino" | "veedor";
  totalFormularios: number;
  manzanas: DatoManzana[];
  valoraciones: AggValoracion[];
  siNo: AggSiNo[];
  opciones: AggOpcion[];
  numeros: AggNumero[];
}

function Estrellas({ promedio }: { promedio: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 16 16" className="w-4 h-4">
          <polygon
            points="8,1 10,6 15,6 11,9.5 12.5,15 8,11.5 3.5,15 5,9.5 1,6 6,6"
            fill={i <= Math.round(promedio) ? "#FFD000" : "#E5E7EB"}
          />
        </svg>
      ))}
      <span className="text-sm font-semibold text-navy ml-1">{promedio.toFixed(1)}</span>
    </div>
  );
}

function BarraHorizontal({ valor, max, color = "#00B4C8", label }: { valor: number; max: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-600 w-24 shrink-0 truncate">{label}</span>}
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono w-5 text-right text-gray-700">{valor}</span>
    </div>
  );
}

export default function DashboardFormularios({ formulario, totalFormularios, manzanas, valoraciones, siNo, opciones, numeros }: Props) {
  const [tab, setTab] = useState<"vecino" | "veedor">(formulario);

  const sinDatos = totalFormularios === 0;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        {(["vecino", "veedor"] as const).map((f) => (
          <a
            key={f}
            href={`/admin/dashboard?formulario=${f}`}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
              tab === f ? "bg-navy text-white" : "bg-white text-navy border border-navy/20 hover:bg-navy/5"
            }`}
            onClick={() => setTab(f)}
          >
            Formulario {f.charAt(0).toUpperCase() + f.slice(1)}
          </a>
        ))}
      </div>

      {sinDatos ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 font-medium">Todavía no hay formularios cargados para este tipo.</p>
          <p className="text-gray-400 text-sm mt-1">Los datos van a aparecer acá a medida que los veedores y vecinos completen los formularios.</p>
        </div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-navy text-white rounded-2xl p-5">
              <div className="text-3xl font-bold">{totalFormularios}</div>
              <div className="text-sm text-white/70 mt-1">Formularios cargados</div>
            </div>
            <div className="bg-turquesa text-navy rounded-2xl p-5">
              <div className="text-3xl font-bold">{manzanas.length}</div>
              <div className="text-sm text-navy/70 mt-1">Manzanas con datos</div>
            </div>
          </div>

          {/* Valoraciones */}
          {valoraciones.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-navy text-lg mb-5">Valoraciones promedio</h2>
              <div className="space-y-4">
                {valoraciones.map((v) => (
                  <div key={v.itemId}>
                    <div className="text-sm text-gray-700 mb-1">{v.etiqueta}</div>
                    <div className="flex items-center gap-4">
                      <Estrellas promedio={v.promedio} />
                      <span className="text-xs text-gray-400">({v.total} respuesta{v.total !== 1 ? "s" : ""})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Si / No */}
          {siNo.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-navy text-lg mb-5">Preguntas Sí / No</h2>
              <div className="space-y-5">
                {siNo.map((item) => {
                  const total = item.si + item.no;
                  const pctSi = total > 0 ? Math.round((item.si / total) * 100) : 0;
                  return (
                    <div key={item.itemId}>
                      <div className="text-sm text-gray-700 mb-2">{item.etiqueta}</div>
                      <div className="flex gap-3 items-center">
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className="h-3 rounded-full bg-turquesa" style={{ width: `${pctSi}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-turquesa w-10">Sí {pctSi}%</span>
                        <span className="text-xs text-gray-400 w-16">No {100 - pctSi}%</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{item.si} sí · {item.no} no · {total} total</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opciones múltiples */}
          {opciones.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-navy text-lg mb-5">Opciones seleccionadas</h2>
              <div className="space-y-6">
                {opciones.map((item) => {
                  const maxConteo = Math.max(...Object.values(item.conteos), 1);
                  return (
                    <div key={item.itemId}>
                      <div className="text-sm text-gray-700 mb-3">{item.etiqueta}</div>
                      <div className="space-y-2">
                        {Object.entries(item.conteos)
                          .sort((a, b) => b[1] - a[1])
                          .map(([opcion, conteo]) => (
                            <BarraHorizontal key={opcion} valor={conteo} max={maxConteo} color="#001F5C" label={opcion} />
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Numéricos (solo veedor) */}
          {numeros.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-navy text-lg mb-5">Conteos registrados</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-xs">
                      <th className="text-left py-2 pr-4 font-normal">Pregunta</th>
                      <th className="text-center py-2 px-3 font-normal">Total acumulado</th>
                      <th className="text-center py-2 px-3 font-normal">Promedio por cuadra</th>
                      <th className="text-center py-2 px-3 font-normal">Respuestas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {numeros.map((n) => (
                      <tr key={n.itemId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-4 text-gray-700">{n.etiqueta}</td>
                        <td className="text-center py-2 px-3 font-bold text-navy">{n.suma}</td>
                        <td className="text-center py-2 px-3 text-gray-600">{n.promedio.toFixed(1)}</td>
                        <td className="text-center py-2 px-3 text-gray-400 text-xs">{n.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Manzanas con datos */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-navy text-lg">Manzanas relevadas</h2>
              <a href="/api/export/relevamientos" className="text-sm bg-navy text-white px-4 py-2 rounded-lg hover:opacity-90">
                ↓ Exportar CSV
              </a>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {manzanas.map((m) => (
                <div key={m.codigo} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                  <div>
                    <div className="font-mono text-xs text-navy">{m.codigo}</div>
                    <div className="text-xs text-gray-500">{m.barrio}</div>
                  </div>
                  <span className="text-sm font-bold text-turquesa">{m.total} form.</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
