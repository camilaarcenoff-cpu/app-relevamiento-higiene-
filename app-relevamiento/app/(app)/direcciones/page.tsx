import { createClient } from "@/lib/supabase/server";

export default async function DireccionesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Manzanas que el usuario tuvo asignadas (alguna vez).
  const { data: asignaciones } = await supabase
    .from("asignaciones_semanales")
    .select("manzana:manzanas(id, codigo, barrio)")
    .eq("usuario_id", user!.id);

  const manzanasUnicas = new Map<string, { id: string; codigo: string; barrio: string }>();
  asignaciones?.forEach((a: any) => {
    if (a.manzana) manzanasUnicas.set(a.manzana.id, a.manzana);
  });
  const manzanaIds = Array.from(manzanasUnicas.keys());

  const { data: direcciones } = manzanaIds.length
    ? await supabase
        .from("vista_direcciones_manzana")
        .select("manzana_id, direccion, cantidad_relevamientos, ultima_visita, alguna_resuelta")
        .in("manzana_id", manzanaIds)
    : { data: [] as any[] };

  const direccionesPorManzana = new Map<string, any[]>();
  direcciones?.forEach((d: any) => {
    const lista = direccionesPorManzana.get(d.manzana_id) ?? [];
    lista.push(d);
    direccionesPorManzana.set(d.manzana_id, lista);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">
        Direcciones relevadas
      </h1>
      <p className="text-gray-500 mb-6">
        Direcciones cargadas dentro de cada manzana que te corresponde.
      </p>

      {manzanaIds.length === 0 && (
        <div className="bg-white rounded-2xl shadow p-6 text-gray-500 text-sm">
          Todavía no tenés manzanas asignadas.
        </div>
      )}

      <div className="space-y-6">
        {Array.from(manzanasUnicas.values()).map((manzana) => (
          <div key={manzana.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-navy text-white px-4 py-2 flex items-center justify-between">
              <span className="font-mono font-semibold">{manzana.codigo}</span>
              <span className="text-sm text-turquesa">{manzana.barrio}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2">Dirección</th>
                  <th className="px-4 py-2">Relevamientos</th>
                  <th className="px-4 py-2">Última visita</th>
                  <th className="px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(direccionesPorManzana.get(manzana.id) ?? []).map((d, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2">{d.direccion}</td>
                    <td className="px-4 py-2">{d.cantidad_relevamientos}</td>
                    <td className="px-4 py-2">{d.ultima_visita}</td>
                    <td className="px-4 py-2">
                      {d.alguna_resuelta ? (
                        <span className="text-xs font-semibold rounded-full px-2 py-1 bg-green-100 text-green-700">
                          Con resolución registrada
                        </span>
                      ) : (
                        <span className="text-xs font-semibold rounded-full px-2 py-1 bg-gray-100 text-gray-600">
                          Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {(direccionesPorManzana.get(manzana.id) ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                      Todavía no hay relevamientos cargados en esta manzana.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
