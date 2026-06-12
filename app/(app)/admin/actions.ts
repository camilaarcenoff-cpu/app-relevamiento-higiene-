"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Todas estas funciones verifican que quien las ejecuta sea admin
// (la tabla perfiles + RLS ya lo exige para las operaciones sobre tablas;
// para las operaciones de Authentication usamos el cliente admin, así que
// repetimos la verificación acá).
async function verificarAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol !== "admin") throw new Error("No autorizado");
  return user;
}

// ---------------------------------------------------------------------------
// USUARIOS
// ---------------------------------------------------------------------------
export async function crearUsuario(formData: FormData) {
  await verificarAdmin();
  const admin = createAdminClient();

  const nombre = String(formData.get("nombre") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const rol = String(formData.get("rol") || "relevador");

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}

export async function actualizarUsuario(formData: FormData) {
  await verificarAdmin();
  const supabase = createClient();

  const id = String(formData.get("id"));
  const nombre = String(formData.get("nombre") || "");
  const rol = String(formData.get("rol") || "relevador");
  const activo = formData.get("activo") === "on";

  const { error } = await supabase
    .from("perfiles")
    .update({ nombre, rol, activo })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}

// ---------------------------------------------------------------------------
// ASIGNACIONES SEMANALES
// ---------------------------------------------------------------------------
export async function crearAsignacion(formData: FormData) {
  await verificarAdmin();
  const supabase = createClient();

  const usuario_id = String(formData.get("usuario_id"));
  const manzana_id = String(formData.get("manzana_id"));
  const semana_id = String(formData.get("semana_id"));

  const { error } = await supabase
    .from("asignaciones_semanales")
    .upsert(
      { usuario_id, manzana_id, semana_id },
      { onConflict: "usuario_id,manzana_id,semana_id" }
    );

  if (error) throw new Error(error.message);
  revalidatePath("/admin/asignaciones");
}

export async function eliminarAsignacion(formData: FormData) {
  await verificarAdmin();
  const supabase = createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("asignaciones_semanales").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/asignaciones");
}

// ---------------------------------------------------------------------------
// ÍTEMS DE FORMULARIO (catálogo de valoraciones 1 a 5)
// ---------------------------------------------------------------------------
const TIPOS_VALIDOS = [
  "valoracion",
  "si_no",
  "texto",
  "numero",
  "opcion_unica",
  "opcion_multiple",
];

// Convierte el texto de "opciones" (una por línea o separadas por coma) en un
// array prolijo, sin vacíos ni espacios de más. Solo aplica a los tipos
// opcion_unica / opcion_multiple.
function parseOpciones(formData: FormData, tipo: string): string[] | null {
  if (tipo !== "opcion_unica" && tipo !== "opcion_multiple") return null;
  const crudo = String(formData.get("opciones") || "");
  const opciones = crudo
    .split(/[\n,]/)
    .map((o) => o.trim())
    .filter(Boolean);
  return opciones.length > 0 ? opciones : null;
}

export async function crearItemFormulario(formData: FormData) {
  await verificarAdmin();
  const supabase = createClient();

  const formulario = String(formData.get("formulario") || "");
  const etiqueta = String(formData.get("etiqueta") || "").trim();
  const orden = parseInt(String(formData.get("orden") || "0"), 10) || 0;
  const tipo = String(formData.get("tipo") || "valoracion");
  const obligatoria = formData.get("obligatoria") === "on";
  const condicionItemId = String(formData.get("condicion_item_id") || "").trim() || null;
  const condicionValor = String(formData.get("condicion_valor") || "").trim() || null;

  if (!["veedor", "vecino"].includes(formulario)) {
    throw new Error("Tipo de formulario inválido");
  }
  if (!etiqueta) throw new Error("La etiqueta es obligatoria.");
  if (!TIPOS_VALIDOS.includes(tipo)) throw new Error("Tipo de pregunta inválido");

  const opciones = parseOpciones(formData, tipo);
  if ((tipo === "opcion_unica" || tipo === "opcion_multiple") && !opciones) {
    throw new Error("Las preguntas de opción única/múltiple necesitan al menos una opción.");
  }

  const { error } = await supabase.from("items_formulario").insert({
    formulario,
    etiqueta,
    orden,
    activo: true,
    tipo,
    obligatoria,
    condicion_item_id: condicionItemId,
    condicion_valor: condicionItemId ? condicionValor : null,
    opciones,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/items");
}

export async function actualizarItemFormulario(formData: FormData) {
  await verificarAdmin();
  const supabase = createClient();

  const id = String(formData.get("id"));
  const etiqueta = String(formData.get("etiqueta") || "").trim();
  const orden = parseInt(String(formData.get("orden") || "0"), 10) || 0;
  const activo = formData.get("activo") === "on";
  const tipo = String(formData.get("tipo") || "valoracion");
  const obligatoria = formData.get("obligatoria") === "on";
  const condicionItemId = String(formData.get("condicion_item_id") || "").trim() || null;
  const condicionValor = String(formData.get("condicion_valor") || "").trim() || null;

  if (!etiqueta) throw new Error("La etiqueta es obligatoria.");
  if (!TIPOS_VALIDOS.includes(tipo)) throw new Error("Tipo de pregunta inválido");

  const opciones = parseOpciones(formData, tipo);
  if ((tipo === "opcion_unica" || tipo === "opcion_multiple") && !opciones) {
    throw new Error("Las preguntas de opción única/múltiple necesitan al menos una opción.");
  }

  const { error } = await supabase
    .from("items_formulario")
    .update({
      etiqueta,
      orden,
      activo,
      tipo,
      obligatoria,
      condicion_item_id: condicionItemId,
      condicion_valor: condicionItemId ? condicionValor : null,
      opciones,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/items");
}

export async function eliminarItemFormulario(formData: FormData) {
  await verificarAdmin();
  const supabase = createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("items_formulario").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/items");
}
