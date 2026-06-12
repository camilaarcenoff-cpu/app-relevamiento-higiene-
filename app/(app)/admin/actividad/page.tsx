import { createClient } from "@/lib/supabase/server";

export default async function ActividadPage() {
  const supabase = createClient();

  const { data: actividad } = await supabase
    .from("registro_actividad")
    .select("id, accion, detalle, created_at, usuario:perfiles(nombre, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">
        Actividad del equipo
      </h1>
      <p className="text-gray-500 mb-6">
        Últimos 200 eventos: inicios de sesión y cargas de relevamientos.
      </p>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Fecha y hora</th>
              <th className="px-4 py-2">Persona</th>
              <th className="px-4 py-2">Acción</th>
              <th className="px-4 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {actividad?.map((a: any) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(a.created_at).toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-2">{a.usuario?.nombre ?? a.usuario?.email}</td>
                <td className="px-4 py-2">{a.accion}</td>
                <td className="px-4 py-2 text-gray-500">{a.detalle}</td>
              </tr>
            ))}
            {(!actividad || actividad.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Todavía no hay actividad registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
