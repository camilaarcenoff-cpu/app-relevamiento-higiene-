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

  // ---- Respuestas a las preguntas del formulario ---------------------------
  // Cada pregunta (items_formulario) puede ser de tipo "valoracion" (1-5),
  // "si_no" (Sí/No) o "texto" (libre). El nombre del campo en el formulario
  // es siempre `respuesta_${item.id}`; acá lo guardamos según corresponda.
  const { data: itemsFormulario } = await supabase
    .from("items_formulario")
    .select("id, tipo, obligatoria")
    .eq("formulario", formulario)
    .eq("activo", true);

  const valoraciones: Record<string, number | string | string[]> = {};
  for (const item of itemsFormulario || []) {
    if (item.tipo === "opcion_multiple") {
      const valores = formData
        .getAll(`respuesta_${item.id}`)
        .map((v) => String(v))
        .filter((v) => v !== "");
      if (valores.length === 0) {
        if (item.obligatoria) {
          throw new Error("Faltan completar preguntas obligatorias del formulario.");
        }
        continue;
      }
      valoraciones[item.id] = valores;
      continue;
    }

    const valor = formData.get(`respuesta_${item.id}`);
    if (valor === null || valor === "") {
      if (item.obligatoria) {
        throw new Error("Faltan completar preguntas obligatorias del formulario.");
      }
      continue;
    }
    if (item.tipo === "valoracion" || item.tipo === "numero") {
      const numero = parseInt(String(valor), 10);
      if (!isNaN(numero)) valoraciones[item.id] = numero;
    } else {
      valoraciones[item.id] = String(valor);
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
