"use client";

type DatoSemana = { etiqueta: string; total: number };
type DatoBarrio = { barrio: string; total: number };
type DatoComuna = { comuna: string; total: number };
type DatoManzana = { codigo: string; barrio: string; porSemana: Record<number, number>; total: number };
type DatoEstado = { estado: string; total: number; color: string };

interface Props {
  porSemana: DatoSemana[];
  porBarrio: DatoBarrio[];
  porComuna: DatoComuna[];
  porManzana: DatoManzana[];
  porEstado: DatoEstado[];
  totalRelevamientos: number;
  totalManzanas: number;
  semanas: number[];
}

function BarraHorizontal({ valor, max, color = "#00B4C8" }: { valor: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-mono w-6 text-right text-gray-700">{valor}</span>
    </div>
  );
}

function GraficoBarras({ datos, color = "#001F5C" }: { datos: DatoSemana[]; color?: string }) {
  const max = Math.max(...datos.map((d) => d.total), 1);
  const alturaMax = 120;

  return (
    <svg viewBox={`0 0 ${datos.length * 80} ${alturaMax + 40}`} className="w-full" style={{ maxHeight: 180 }}>
      {datos.map((d, i) => {
        const h = Math.round((d.total / max) * alturaMax);
        const x = i * 80 + 10;
        const y = alturaMax - h;
        return (
          <g key={d.etiqueta}>
            <rect x={x} y={y} width={60} height={h} rx={4} fill={color} opacity={0.85} />
            <text x={x + 30} y={y - 6} textAnchor="middle" fontSize={13} fill="#374151" fontWeight="600">
              {d.total}
            </text>
            <text x={x + 30} y={alturaMax + 20} textAnchor="middle" fontSize={11} fill="#6B7280">
              {d.etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutEstados({ datos }: { datos: DatoEstado[] }) {
  const total = datos.reduce((s, d) => s + d.total, 0);
  if (total === 0) return <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>;

  const r = 50;
  const cx = 70;
  const cy = 70;
  let anguloAcum = -Math.PI / 2;
  const segmentos: { path: string; color: string; label: string; pct: number }[] = [];

  for (const d of datos) {
    if (d.total === 0) continue;
    const angulo = (d.total / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(anguloAcum);
    const y1 = cy + r * Math.sin(anguloAcum);
    anguloAcum += angulo;
    const x2 = cx + r * Math.cos(anguloAcum);
    const y2 = cy + r * Math.sin(anguloAcum);
    const grande = angulo > Math.PI ? 1 : 0;
    segmentos.push({
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${grande} 1 ${x2} ${y2} Z`,
      color: d.color,
      label: d.estado,
      pct: Math.round((d.total / total) * 100),
    });
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 140 140" className="w-32 h-32 shrink-0">
        {segmentos.map((s) => (
          <path key={s.label} d={s.path} fill={s.color} />
        ))}
        <circle cx={cx} cy={cy} r={28} fill="white" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight="700" fill="#001F5C">
          {total}
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {datos.map((d) => (
          <div key={d.estado} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-gray-700">{d.estado}</span>
            <span className="font-semibold text-navy ml-auto pl-4">{d.total}</span>
            <span className="text-gray-400 text-xs">({total > 0 ? Math.round((d.total / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardCharts({
  porSemana,
  porBarrio,
  porComuna,
  porManzana,
  porEstado,
  totalRelevamientos,
  totalManzanas,
  semanas,
}: Props) {
  const maxBarrio = Math.max(...porBarrio.map((d) => d.total), 1);
  const maxComuna = Math.max(...porComuna.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-navy text-white rounded-2xl p-5">
          <div className="text-3xl font-bold">{totalRelevamientos}</div>
          <div className="text-sm text-white/70 mt-1">Relevamientos totales</div>
        </div>
        <div className="bg-turquesa text-navy rounded-2xl p-5">
          <div className="text-3xl font-bold">{totalManzanas}</div>
          <div className="text-sm text-navy/70 mt-1">Manzanas relevadas</div>
        </div>
        <div className="bg-amarillo text-navy rounded-2xl p-5 col-span-2 sm:col-span-1">
          <div className="text-3xl font-bold">{semanas.length}</div>
          <div className="text-sm text-navy/70 mt-1">Semanas con datos</div>
        </div>
      </div>

      {/* Evolución por semana */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="font-bold text-navy text-lg mb-4">Evolución semanal</h2>
        {porSemana.length > 0 ? (
          <GraficoBarras datos={porSemana} color="#001F5C" />
        ) : (
          <p className="text-sm text-gray-400">Sin datos</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Por barrio */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Por barrio</h2>
          <div className="space-y-3">
            {porBarrio.map((d) => (
              <div key={d.barrio}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{d.barrio}</span>
                </div>
                <BarraHorizontal valor={d.total} max={maxBarrio} color="#00B4C8" />
              </div>
            ))}
          </div>
        </div>

        {/* Por estado */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-navy text-lg mb-4">Estado de manzanas</h2>
          <DonutEstados datos={porEstado} />
        </div>
      </div>

      {/* Por comuna */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="font-bold text-navy text-lg mb-4">Por comuna</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {porComuna.map((d) => (
            <div key={d.comuna}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{d.comuna}</span>
              </div>
              <BarraHorizontal valor={d.total} max={maxComuna} color="#FFD000" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabla por manzana con tendencia semana a semana */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy text-lg">Detalle por manzana</h2>
          <a
            href="/api/export/relevamientos"
            className="text-sm bg-navy text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
          >
            ↓ Exportar CSV
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 font-semibold text-gray-500 font-normal">Manzana</th>
                <th className="text-left py-2 pr-4 font-semibold text-gray-500 font-normal">Barrio</th>
                {semanas.map((s) => (
                  <th key={s} className="text-center py-2 px-2 font-semibold text-gray-500 font-normal whitespace-nowrap">
                    Sem. {s}
                  </th>
                ))}
                <th className="text-center py-2 px-2 font-semibold text-gray-500 font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {porManzana.map((m) => (
                <tr key={m.codigo} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-mono text-xs text-navy">{m.codigo}</td>
                  <td className="py-2 pr-4 text-gray-600">{m.barrio}</td>
                  {semanas.map((s) => (
                    <td key={s} className="text-center py-2 px-2">
                      {m.porSemana[s] ? (
                        <span className="inline-block bg-turquesa/20 text-navy rounded px-2 py-0.5 text-xs font-semibold">
                          {m.porSemana[s]}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                  <td className="text-center py-2 px-2 font-bold text-navy">{m.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
