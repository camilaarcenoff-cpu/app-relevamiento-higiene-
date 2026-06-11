"use client";

import { useState } from "react";

export default function SyncButton() {
  const [estado, setEstado] = useState<"idle" | "cargando" | "ok" | "error">("idle");
  const [mensaje, setMensaje] = useState<string>("");
  const [resumen, setResumen] = useState<any>(null);

  async function sincronizar() {
    setEstado("cargando");
    setMensaje("");
    setResumen(null);

    try {
      const resp = await fetch("/api/admin/sync", { method: "POST" });
      const data = await resp.json();

      if (!resp.ok) {
        setEstado("error");
        setMensaje(data.error || "Ocurrió un error inesperado.");
        return;
      }

      setEstado("ok");
      setResumen(data.resumen);
    } catch (err: any) {
      setEstado("error");
      setMensaje(err.message || "Ocurrió un error inesperado.");
    }
  }

  return (
    <div>
      <button
        onClick={sincronizar}
        disabled={estado === "cargando"}
        className="bg-navy text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:opacity-90 disabled:opacity-50"
      >
        {estado === "cargando" ? "Sincronizando..." : "Sincronizar ahora"}
      </button>

      {estado === "error" && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {mensaje}
        </div>
      )}

      {estado === "ok" && resumen && (
        <div className="mt-4 bg-turquesa/10 border border-turquesa/30 text-navy text-sm rounded-lg p-4 space-y-1">
          <p className="font-semibold mb-2">Sincronización completa ✅</p>
          <p>Hojas procesadas: {resumen.hojas_procesadas}</p>
          <p>Manzanas nuevas: {resumen.manzanas_nuevas}</p>
          <p>Relevamientos guardados: {resumen.relevamientos_nuevos}</p>
          <p>Asignaciones creadas: {resumen.asignaciones_creadas}</p>
          <p>Errores: {resumen.errores?.length || 0}</p>
          {resumen.errores?.length > 0 && (
            <ul className="list-disc list-inside text-red-600 mt-2">
              {resumen.errores.map((e: string, i: number) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
