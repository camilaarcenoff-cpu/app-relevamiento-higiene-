import { createClient } from "@/lib/supabase/server";
import { crearUsuario, actualizarUsuario, eliminarUsuario, subirFotoManzana } from "../actions";

export default async function UsuariosPage() {
  const supabase = createClient();

  // Usuarios + sus asignaciones de la semana más reciente
  const { data: usuarios } = await supabase
    .from("perfiles")
    .select("id, nombre, email, rol, activo, created_at")
    .order("nombre");

  // Semana más reciente
  const { data: semanas } = await supabase
    .from("semanas")
    .select("id, numero, etiqueta")
    .order("numero", { ascending: false })
    .limit(1);
  const semanaActual = semanas?.[0];

  // Todas las asignaciones de la semana más reciente con foto
  let asignacionesPorUsuario: Record<string, { id: string; manzana_id: string; codigo: string; barrio: string | null; foto_url: string | null }[]> = {};
  if (semanaActual) {
    const { data: asignaciones } = await supabase
      .from("asignaciones_semanales")
      .select("id, usuario_id, manzana_id, manzana:manzanas(id, codigo, barrio, foto_url)")
      .eq("semana_id", semanaActual.id);

    for (const a of asignaciones ?? []) {
      const manzana = (a as any).manzana;
      if (!asignacionesPorUsuario[a.usuario_id]) {
        asignacionesPorUsuario[a.usuario_id] = [];
      }
      asignacionesPorUsuario[a.usuario_id].push({
        id: a.id,
        manzana_id: a.manzana_id,
        codigo: manzana?.codigo ?? "",
        barrio: manzana?.barrio ?? null,
        foto_url: manzana?.foto_url ?? null,
      });
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Usuarios</h1>
      <p className="text-gray-500 mb-6">
        Crear, editar y desactivar usuarios del equipo. Las fotos de manzanas se cargan desde acá.
        {semanaActual && (
          <span className="ml-2 text-xs text-turquesa font-semibold">
            Manzanas de: {semanaActual.etiqueta ?? `Semana ${semanaActual.numero}`}
          </span>
        )}
      </p>

      {/* ── Alta de usuario ── */}
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

      {/* ── Listado con manzanas y fotos ── */}
      <div className="space-y-3">
        {usuarios?.map((u) => {
          const formId = `editar-${u.id}`;
          const manzanas = asignacionesPorUsuario[u.id] ?? [];
          const manzana1 = manzanas[0] ?? null;
          const manzana2 = manzanas[1] ?? null;

          return (
            <div key={u.id} className="bg-white rounded-xl shadow-sm p-4">
              {/* Fila superior: datos del usuario */}
              <div className="flex flex-wrap gap-3 items-center">
                <form id={formId} action={actualizarUsuario} className="hidden" />
                <input type="hidden" name="id" value={u.id} form={formId} />

                <input
                  name="nombre"
                  defaultValue={u.nombre}
                  form={formId}
                  className="rounded border border-transparent hover:border-gray-300 focus:border-turquesa px-2 py-1 text-sm font-semibold text-navy w-48"
                />
                <span className="text-gray-400 text-sm">{u.email}</span>
                <select
                  name="rol"
                  defaultValue={u.rol}
                  form={formId}
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="relevador">Relevador/a</option>
                  <option value="admin">Admin</option>
                </select>
                <label className="flex items-center gap-1 text-sm text-gray-600">
                  <input type="checkbox" name="activo" defaultChecked={u.activo} form={formId} />
                  Activo
                </label>
                <button
                  form={formId}
                  className="text-turquesa text-sm font-semibold hover:underline"
                >
                  Guardar
                </button>

                {/* Eliminar usuario */}
                <form action={eliminarUsuario}>
                  <input type="hidden" name="id" value={u.id} />
                  <button
                    type="submit"
                    className="text-red-400 text-sm hover:text-red-600 hover:underline"
                    onClick={(e) => {
                      if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </form>
              </div>

              {/* Fila inferior: manzanas con fotos */}
              {(manzana1 || manzana2) && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid sm:grid-cols-2 gap-3">
                  {[manzana1, manzana2].map((m, idx) => {
                    if (!m) return null;
                    const fotoFormId = `foto-${m.manzana_id}-${idx}`;
                    return (
                      <div key={m.manzana_id} className="flex gap-3 items-start">
                        {/* Miniatura de la foto */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                          {m.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.foto_url}
                              alt={m.codigo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs text-center leading-tight p-1">
                              Sin foto
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-navy font-mono truncate">{m.codigo}</p>
                          {m.barrio && <p className="text-xs text-gray-500">{m.barrio}</p>}

                          {/* Upload foto */}
                          <form id={fotoFormId} action={subirFotoManzana} className="mt-1">
                            <input type="hidden" name="manzana_id" value={m.manzana_id} />
                            <div className="flex gap-2 items-center">
                              <input
                                type="file"
                                name="foto"
                                accept="image/*"
                                className="text-xs text-gray-500 w-32"
                              />
                              <button
                                type="submit"
                                className="text-xs bg-turquesa/20 text-turquesa font-semibold px-2 py-1 rounded hover:bg-turquesa/30 whitespace-nowrap"
                              >
                                {m.foto_url ? "Actualizar foto" : "Cargar foto"}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {manzanas.length === 0 && (
                <p className="mt-2 text-xs text-gray-400 italic">
                  Sin manzana asignada en la semana actual.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Para desactivar a alguien, destildá &quot;Activo&quot; y guardá. El historial se conserva.
      </p>
    </div>
  );
}
