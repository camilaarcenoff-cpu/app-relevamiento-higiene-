"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

// Crea un relevamiento cargado desde la app (formulario "veedor" o "vecino").
export async function crearRelevamientoCampo(formData: FormData) {
  const asignacionId = String(formData.get("asignacion_id") || "");
  const formulario = String(formData.get("formulario") || "veedor");

  try {
    await _crearRelevamiento(formData, asignacionId, formulario);
  } catch (e: any) {
    // Re-lanzar errores de redirect de Next.js (no son errores reales).
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    const msg = e?.message || String(e) || "Error desconocido";
    redirect(
      `/relevamientos/nuevo/${formulario}?asignacion=${asignacionId}&error=${encodeURIComponent(msg)}`
    );
  }
}

async function _crearRelevamiento(formData: FormData, asignacionId: string, formulario: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  if (!["veedor", "vecino"].includes(formulario)) {
    throw new Error("Tipo de formulario inválido");
  }

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

  // ---- Respuestas a las preguntas del formulario ---------------------------
  const { data: itemsFormulario } = await supabase
    .from("items_formulario")
    .select("id, tipo, obligatoria, condicion_item_id, condicion_valor")
    .eq("formulario", formulario)
    .eq("activo", true);

  // Paso 1: recolectar todas las respuestas crudas del form para evaluar condiciones.
  const rawRespuestas: Record<string, string | string[]> = {};
  for (const item of itemsFormulario || []) {
    if (item.tipo === "opcion_multiple") {
      rawRespuestas[item.id] = formData.getAll(`respuesta_${item.id}`).map(String).filter(v => v !== "");
    } else {
      const v = formData.get(`respuesta_${item.id}`);
      if (v !== null && v !== "") rawRespuestas[item.id] = String(v);
    }
  }

  // Una pregunta es "visible" si no tiene condición, o si la condición se cumple.
  function esItemVisible(item: { condicion_item_id: string | null; condicion_valor: string | null }) {
    if (!item.condicion_item_id) return true;
    const ctrl = rawRespuestas[item.condicion_item_id];
    if (ctrl === undefined) return false;
    if (Array.isArray(ctrl)) return ctrl.includes(item.condicion_valor ?? "");
    return ctrl === item.condicion_valor;
  }

  // Paso 2: validar y construir el objeto de valoraciones.
  const valoraciones: Record<string, number | string | string[]> = {};
  for (const item of itemsFormulario || []) {
    const visible = esItemVisible(item);

    if (item.tipo === "opcion_multiple") {
      const valores = (rawRespuestas[item.id] as string[] | undefined) ?? [];
      if (valores.length === 0) {
        if (item.obligatoria && visible) {
          throw new Error("Faltan completar preguntas obligatorias del formulario.");
        }
        continue;
      }
      valoraciones[item.id] = valores;
      continue;
    }

    const valor = rawRespuestas[item.id] as string | undefined;
    if (!valor) {
      if (item.obligatoria && visible) {
        throw new Error("Faltan completar preguntas obligatorias del formulario.");
      }
      continue;
    }
    if (item.tipo === "valoracion" || item.tipo === "numero") {
      const numero = parseInt(valor, 10);
      if (!isNaN(numero)) valoraciones[item.id] = numero;
    } else {
      valoraciones[item.id] = valor;
    }
  }

  // ---- Fotos -----------------------------------------------------------
  async function subirFotos(campo: string): Promise<string[]> {
    const rutas: string[] = [];
    const archivos = formData.getAll(campo) as File[];
    for (const archivo of archivos) {
      if (!archivo || archivo.size === 0) continue;

      const extension = archivo.name.split(".").pop() || "jpg";
      const ruta = `${user!.id}/${randomUUID()}.${extension}`;

      const { error: errSubida } = await supabase.storage
        .from("relevamientos")
        .upload(ruta, archivo, {
          contentType: archivo.type || "image/jpeg",
        });

      if (errSubida) {
        throw new Error(`No se pudo subir una foto: ${errSubida.message}`);
      }
      rutas.push(ruta);
    }
    return rutas;
  }

  const fotos = await subirFotos("fotos");
  const fotosCestos = await subirFotos("fotos_cestos");
  const fotosContenedores = await subirFotos("fotos_contenedores");

  // ---- Relevamiento ------------------------------------------------------
  const tipo = String(formData.get("tipo") || "Primera visita");
  const observacion = String(formData.get("observacion") || "").trim() || null;
  const contactoVecino = String(formData.get("contacto_vecino") || "").trim() || null;
  const resuelto = String(formData.get("resuelto") || "Pendiente");

  // El veedor identifica la cuadra por calle + numeración (par/impar) +
  // altura desde/hasta. El vecino sigue usando un campo de dirección libre.
  let direccion = "";
  let calle: string | null = null;
  let numeracion: string | null = null;
  let alturaDesde: number | null = null;
  let alturaHasta: number | null = null;

  if (formulario === "veedor") {
    calle = String(formData.get("calle") || "").trim();
    numeracion = String(formData.get("numeracion") || "").trim();
    const alturaDesdeRaw = String(formData.get("altura_desde") || "").trim();
    const alturaHastaRaw = String(formData.get("altura_hasta") || "").trim();

    if (!calle) throw new Error("La calle es obligatoria.");
    if (!["par", "impar"].includes(numeracion)) {
      throw new Error("La numeración (par/impar) es obligatoria.");
    }
    if (alturaDesdeRaw === "" || alturaHastaRaw === "") {
      throw new Error("La altura desde y hasta son obligatorias.");
    }

    alturaDesde = parseInt(alturaDesdeRaw, 10);
    alturaHasta = parseInt(alturaHastaRaw, 10);
    if (isNaN(alturaDesde) || isNaN(alturaHasta)) {
      throw new Error("La altura desde y hasta deben ser números.");
    }

    const numeracionTexto = numeracion === "par" ? "par" : "impar";
    direccion = `${calle} ${alturaDesde} a ${alturaHasta} (${numeracionTexto})`;
  } else {
    direccion = String(formData.get("direccion") || "").trim();
    if (!direccion) throw new Error("La dirección es obligatoria.");
  }

  const { error: errInsert } = await supabase.from("relevamientos").insert({
    manzana_id: asignacion.manzana_id,
    semana_id: asignacion.semana_id,
    asignacion_id: asignacion.id,
    fecha: new Date().toISOString().slice(0, 10),
    direccion,
    calle,
    numeracion,
    altura_desde: alturaDesde,
    altura_hasta: alturaHasta,
    tipo,
    observacion,
    contacto_vecino: contactoVecino,
    resuelto,
    creado_por: user.id,
    formulario,
    valoraciones: Object.keys(valoraciones).length > 0 ? valoraciones : null,
    fotos: fotos.length > 0 ? fotos : null,
    fotos_cestos: fotosCestos.length > 0 ? fotosCestos : null,
    fotos_contenedores: fotosContenedores.length > 0 ? fotosContenedores : null,
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
