import { createClient } from "@/lib/supabase/server";
import { crearUsuario, actualizarUsuario } from "../actions";

export default async function UsuariosPage() {
  const supabase = createClient();
  const { data: usuarios } = await supabase
    .from("perfiles")
    .select("id, nombre, email, rol, activo, created_at")
    .order("nombre");

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Usuarios</h1>
      <p className="text-gray-500 mb-6">
        Crear, editar y desactivar usuarios del equipo (~100 personas).
      </p>

      {/* Alta de usuario */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <h2 className="font-semibold text-navy mb-3">Nuevo usuario</h2>
        <form action={crearUsuario} className="grid sm:grid-cols-4 gap-3">
          <input
            name="nombre"
            placeholder="Nombre y apellido"
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <input
            name="email"
            type="email"
            placeholder="email@ejemplo.com"
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <input
            name="password"
            type="text"
            placeholder="Contraseña inicial"
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <select
            name="rol"
            defaultValue="relevador"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-1"
          >
            <option value="relevador">Relevador/a</option>
            <option value="admin">Administrador/a</option>
          </select>
          <button className="bg-navy text-white text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-90 sm:col-span-4">
            Crear usuario
          </button>
        </form>
      </div>

      {/* Listado */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Activo</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios?.map((u) => {
              const formId = `editar-usuario-${u.id}`;
              return (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <form id={formId} action={actualizarUsuario} className="hidden" />
                    <input type="hidden" name="id" value={u.id} form={formId} />
                    <input
                      name="nombre"
                      defaultValue={u.nombre}
                      form={formId}
                      className="rounded border border-transparent hover:border-gray-300 focus:border-turquesa px-2 py-1 text-sm w-full"
                    />
                  </td>
                  <td className="px-4 py-2 text-gray-500">{u.email}</td>
                  <td className="px-4 py-2">
                    <select
                      name="rol"
                      defaultValue={u.rol}
                      form={formId}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="relevador">Relevador/a</option>
                      <option value="admin">Administrador/a</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="checkbox" name="activo" defaultChecked={u.activo} form={formId} />
                  </td>
                  <td className="px-4 py-2">
                    <button form={formId} className="text-turquesa text-sm font-semibold hover:underline">
                      Guardar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Para desactivar a alguien, destildá &quot;Activo&quot; y guardá: la persona deja de
        poder ver datos, pero su historial se conserva.
      </p>
    </div>
  );
}
