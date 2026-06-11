"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

// Crea un relevamiento cargado desde la app (formulario "veedor" o "vecino").
export async function crearRelevamientoCampo(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const asignacionId = String(formData.get("asignacion_id") || "");
  const formulario = String(formData.get("formulario") || "");

  if (!["veedor", "vecino"].includes(formulario)) {
    throw new Error("Tipo de formulario inválido");
  }

  // Volvemos a buscar la asignación en la base para confirmar que es del
  // usuario logueado y para obtener manzana/semana de forma confiable
  // (no nos fiamos de valores ocultos del formulario).
  const { data: asignacion, error: errAsignacion } = await supabase
    .from("asignaciones_semanales")
    .select("id, usuario_id, manzana_id, semana_id")
    .eq("id", asignacionId)
    .single();

  if (errAsignacion || !asignacion || asignacion.usuario_id !== user.id) {
    throw new Error("No tenés esta manzana asignada esta semana.");
  }

  // ---- Valoraciones (1 a 5 por cada ítem del formulario) -------------------
  const valoraciones: Record<string, number> = {};
  for (const [clave, valor] of formData.entries()) {
    if (clave.startsWith("valoracion_") && valor) {
      const itemId = clave.replace("valoracion_", "");
      const puntaje = parseInt(String(valor), 10);
      if (!isNaN(puntaje)) valoraciones[itemId] = puntaje;
    }
  }

  // ---- Fotos -----------------------------------------------------------
  const fotos: string[] = [];
  const archivos = formData.getAll("fotos") as File[];
  for (const archivo of archivos) {
    if (!archivo || archivo.size === 0) continue;

    const extension = archivo.name.split(".").pop() || "jpg";
    const ruta = `${user.id}/${randomUUID()}.${extension}`;

    const { error: errSubida } = await supabase.storage
      .from("relevamientos")
      .upload(ruta, archivo, {
        contentType: archivo.type || "image/jpeg",
      });

    if (errSubida) {
      throw new Error(`No se pudo subir una foto: ${errSubida.message}`);
    }
    fotos.push(ruta);
  }

  // ---- Relevamiento ------------------------------------------------------
  const direccion = String(formData.get("direccion") || "").trim();
  const tipo = String(formData.get("tipo") || "Primera visita");
  const observacion = String(formData.get("observacion") || "").trim() || null;
  const contactoVecino = String(formData.get("contacto_vecino") || "").trim() || null;
  const resuelto = String(formData.get("resuelto") || "Pendiente");

  if (!direccion) throw new Error("La dirección es obligatoria.");

  const { error: errInsert } = await supabase.from("relevamientos").insert({
    manzana_id: asignacion.manzana_id,
    semana_id: asignacion.semana_id,
    asignacion_id: asignacion.id,
    fecha: new Date().toISOString().slice(0, 10),
    direccion,
    tipo,
    observacion,
    contacto_vecino: contactoVecino,
    resuelto,
    creado_por: user.id,
    formulario,
    valoraciones: Object.keys(valoraciones).length > 0 ? valoraciones : null,
    fotos: fotos.length > 0 ? fotos : null,
  });

  if (errInsert) throw new Error(errInsert.message);

  await supabase.from("registro_actividad").insert({
    usuario_id: user.id,
    accion: "carga_relevamiento",
    detalle: `${formulario === "veedor" ? "Relevamiento de manzana" : "Percepción del vecino"} — ${direccion}`,
  });

  revalidatePath("/relevamientos");
  revalidatePath("/direcciones");
  revalidatePath("/mi-semana");
  redirect("/relevamientos?creado=1");
}
