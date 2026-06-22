"use client";

import { eliminarUsuario } from "../actions";

export function EliminarButton({ id, nombre }: { id: string; nombre: string }) {
  return (
    <form
      action={eliminarUsuario}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-red-400 text-sm hover:text-red-600 hover:underline"
      >
        Eliminar
      </button>
    </form>
  );
}
