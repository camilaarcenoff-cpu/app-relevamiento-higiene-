// ============================================================================
// SINCRONIZACIÓN: Google Sheets -> Supabase
// ============================================================================
// Este módulo lee las planillas de Google Drive (una por comuna, una pestaña
// por persona/manzana) y carga/actualiza los datos en Supabase:
//   - manzanas
//   - comunas (si aparece un código nuevo)
//   - semanas (solo se usan las que ya existen, no se crean automáticamente)
//   - asignaciones_semanales (si se puede identificar a la persona y la semana)
//   - relevamientos
//
// Lo usan dos lugares:
//   1. El botón "Sincronizar" del panel de administración
//      (app/api/admin/sync/route.ts)
//   2. El script de migración manual (scripts/sync.js -> npm run sync)
//
// No hace falta tocar este archivo para usar la sincronización: toda la
// configuración se hace con variables de entorno (ver .env.local.example
// y sync-sheets/README.md).
// ============================================================================

const { google } = require("googleapis");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

// ----------------------------------------------------------------------------
// Utilidades
// ----------------------------------------------------------------------------

// Saca tildes y pasa a minúsculas, para poder comparar encabezados de
// columnas sin importar cómo estén escritos ("Dirección", "direccion", etc.)
function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// Mapea encabezados de la planilla a los nombres de columna de Supabase.
const MAPA_COLUMNAS = {
  fecha: "fecha",
  direccion: "direccion",
  tipo: "tipo",
  observacion: "observacion",
  observaciones: "observacion",
  "contacto del vecino": "contacto_vecino",
  "contacto vecino": "contacto_vecino",
  resuelto: "resuelto",
  "¿resuelto?": "resuelto",
  estado: "resuelto",
};

// Extrae el código de manzana (ej: "C14PAL-014256") de un texto tipo
// "Manzana C14PAL-014256 · Seguimiento de incidencias"
const REGEX_MANZANA = /C\d+[A-Z]+-[A-Z0-9]+/;

// Convierte la fecha de la planilla (texto dd/mm/aaaa o número de serie de
// Excel/Sheets) a formato ISO (aaaa-mm-dd). Devuelve null si no se entiende.
function parsearFecha(valor) {
  if (valor === undefined || valor === null || valor === "") return null;

  // Número de serie de Sheets (días desde 30/12/1899)
  if (typeof valor === "number" || /^\d+(\.\d+)?$/.test(String(valor).trim())) {
    const serie = parseFloat(valor);
    if (!isNaN(serie) && serie > 0) {
      const ms = (serie - 25569) * 86400 * 1000; // 25569 = días entre 1899-12-30 y 1970-01-01
      const fecha = new Date(ms);
      if (!isNaN(fecha.getTime())) {
        return fecha.toISOString().slice(0, 10);
      }
    }
  }

  // Texto dd/mm/aaaa o d/m/aaaa
  const match = String(valor).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    let [, d, m, a] = match;
    if (a.length === 2) a = `20${a}`;
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    return `${a}-${mm}-${dd}`;
  }

  // Texto aaaa-mm-dd (ya viene en formato ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor).trim())) {
    return String(valor).trim();
  }

  return null;
}

// Normaliza el campo "Resuelto" de la planilla a uno de los 3 valores que
// acepta la base de datos: 'Pendiente', 'En proceso', 'Resuelto'.
function parsearResuelto(valor) {
  const v = normalizar(valor);
  if (!v) return "Pendiente";
  if (["si", "sí", "x", "true", "resuelto", "ok"].includes(v)) return "Resuelto";
  if (v.includes("proceso") || v.includes("curso")) return "En proceso";
  if (v.includes("resuelto")) return "Resuelto";
  return "Pendiente";
}

// Hash estable para detectar duplicados entre corridas del script.
function calcularHash(partes) {
  return crypto.createHash("sha256").update(partes.join("|")).digest("hex");
}

// ----------------------------------------------------------------------------
// Función principal
// ----------------------------------------------------------------------------
//
// options:
//   googleClientEmail   - email de la cuenta de servicio de Google Cloud
//   googlePrivateKey    - clave privada de la cuenta de servicio
//   driveFolderId       - ID de la carpeta de Drive con las planillas
//   supabaseUrl         - URL del proyecto Supabase
//   supabaseServiceKey  - service_role key de Supabase
//   onLog(mensaje)      - callback opcional para ir mostrando el progreso
//
async function runSync(options) {
  const {
    googleClientEmail,
    googlePrivateKey,
    driveFolderId,
    supabaseUrl,
    supabaseServiceKey,
    onLog = () => {},
  } = options;

  if (!googleClientEmail || !googlePrivateKey) {
    throw new Error(
      "Faltan las credenciales de Google (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY). " +
        "Revisá sync-sheets/README.md."
    );
  }
  if (!driveFolderId) {
    throw new Error("Falta GOOGLE_DRIVE_FOLDER_ID (carpeta de Drive con las planillas).");
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Faltan las credenciales de Supabase (URL / service_role key).");
  }

  const resumen = {
    hojas_procesadas: 0,
    manzanas_nuevas: 0,
    relevamientos_nuevos: 0,
    relevamientos_actualizados: 0,
    asignaciones_creadas: 0,
    errores: [],
  };

  // --- Autenticación con Google -------------------------------------------
  const auth = new google.auth.JWT({
    email: googleClientEmail,
    key: googlePrivateKey.replace(/\\n/g, "\n"),
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  });
  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });

  // --- Cliente de Supabase (con permisos de administrador) -----------------
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Cargar catálogos existentes (comunas, manzanas, semanas, perfiles) --
  const [{ data: comunasDb }, { data: manzanasDb }, { data: semanasDb }, { data: perfilesDb }] =
    await Promise.all([
      supabase.from("comunas").select("id, codigo"),
      supabase.from("manzanas").select("id, codigo"),
      supabase.from("semanas").select("id, numero, fecha_inicio, fecha_fin"),
      supabase.from("perfiles").select("id, nombre"),
    ]);

  const mapaComunas = new Map((comunasDb || []).map((c) => [c.codigo, c.id]));
  const mapaManzanas = new Map((manzanasDb || []).map((m) => [m.codigo, m.id]));
  const semanas = semanasDb || [];
  const mapaPerfiles = new Map((perfilesDb || []).map((p) => [normalizar(p.nombre), p.id]));
  const cacheAsignaciones = new Map(); // "usuario|manzana|semana" -> asignacion_id

  function buscarSemana(fechaIso) {
    if (!fechaIso) return null;
    const f = semanas.find((s) => fechaIso >= s.fecha_inicio && fechaIso <= s.fecha_fin);
    return f ? f.id : null;
  }

  async function obtenerOcrearManzana(codigo) {
    if (mapaManzanas.has(codigo)) return mapaManzanas.get(codigo);

    const codigoComuna = (codigo.match(/^C\d+/) || [])[0];
    let comunaId = codigoComuna ? mapaComunas.get(codigoComuna) : null;

    if (codigoComuna && !comunaId) {
      const { data, error } = await supabase
        .from("comunas")
        .upsert({ codigo: codigoComuna }, { onConflict: "codigo" })
        .select("id")
        .single();
      if (error) throw error;
      comunaId = data.id;
      mapaComunas.set(codigoComuna, comunaId);
    }

    const { data, error } = await supabase
      .from("manzanas")
      .upsert({ codigo, comuna_id: comunaId }, { onConflict: "codigo" })
      .select("id")
      .single();
    if (error) throw error;

    mapaManzanas.set(codigo, data.id);
    resumen.manzanas_nuevas += 1;
    return data.id;
  }

  async function obtenerOcrearAsignacion(usuarioId, manzanaId, semanaId) {
    if (!usuarioId || !manzanaId || !semanaId) return null;
    const clave = `${usuarioId}|${manzanaId}|${semanaId}`;
    if (cacheAsignaciones.has(clave)) return cacheAsignaciones.get(clave);

    const { data, error } = await supabase
      .from("asignaciones_semanales")
      .upsert(
        { usuario_id: usuarioId, manzana_id: manzanaId, semana_id: semanaId },
        { onConflict: "usuario_id,manzana_id,semana_id" }
      )
      .select("id")
      .single();
    if (error) throw error;

    cacheAsignaciones.set(clave, data.id);
    resumen.asignaciones_creadas += 1;
    return data.id;
  }

  // --- Listar las planillas de la carpeta de Drive --------------------------
  let archivos = [];
  let pageToken;
  do {
    const resp = await drive.files.list({
      q: `'${driveFolderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: "nextPageToken, files(id, name)",
      pageToken,
    });
    archivos = archivos.concat(resp.data.files || []);
    pageToken = resp.data.nextPageToken;
  } while (pageToken);

  onLog(`Encontradas ${archivos.length} planillas en la carpeta de Drive.`);

  // --- Procesar cada planilla -----------------------------------------------
  for (const archivo of archivos) {
    let metadata;
    try {
      metadata = await sheets.spreadsheets.get({ spreadsheetId: archivo.id });
    } catch (err) {
      resumen.errores.push(`No se pudo abrir "${archivo.name}": ${err.message}`);
      continue;
    }

    for (const hoja of metadata.data.sheets || []) {
      const tituloHoja = hoja.properties.title;

      let valores;
      try {
        const resp = await sheets.spreadsheets.values.get({
          spreadsheetId: archivo.id,
          range: tituloHoja,
        });
        valores = resp.data.values || [];
      } catch (err) {
        resumen.errores.push(
          `No se pudo leer "${archivo.name}" / "${tituloHoja}": ${err.message}`
        );
        continue;
      }

      if (valores.length === 0) continue;

      // Buscar la fila que indica el código de manzana
      let codigoManzana = null;
      let filaEncabezado = -1;
      let columnas = {};

      for (let i = 0; i < valores.length; i++) {
        const fila = valores[i];
        const textoFila = fila.join(" ");

        if (!codigoManzana) {
          const m = textoFila.match(REGEX_MANZANA);
          if (m) codigoManzana = m[0];
        }

        if (filaEncabezado === -1) {
          const tieneDireccion = fila.some((c) => normalizar(c) === "direccion");
          if (tieneDireccion) {
            filaEncabezado = i;
            fila.forEach((celda, idx) => {
              const clave = MAPA_COLUMNAS[normalizar(celda)];
              if (clave) columnas[idx] = clave;
            });
          }
        }
      }

      if (!codigoManzana) {
        // No es una hoja de manzana (puede ser una hoja de "instrucciones", etc.)
        continue;
      }
      if (filaEncabezado === -1) {
        resumen.errores.push(
          `"${archivo.name}" / "${tituloHoja}": no se encontró la fila de encabezados (Dirección...).`
        );
        continue;
      }

      resumen.hojas_procesadas += 1;
      const manzanaId = await obtenerOcrearManzana(codigoManzana);

      // ¿La pestaña corresponde a una persona del equipo?
      const usuarioId = mapaPerfiles.get(normalizar(tituloHoja)) || null;

      // Filas de datos: todo lo que está después del encabezado
      const filasDatos = valores.slice(filaEncabezado + 1);
      const registros = [];

      for (const fila of filasDatos) {
        const item = {};
        Object.entries(columnas).forEach(([idx, clave]) => {
          item[clave] = fila[parseInt(idx, 10)];
        });

        if (!item.direccion || !String(item.direccion).trim()) continue; // fila vacía

        const fechaIso = parsearFecha(item.fecha) || null;
        const semanaId = buscarSemana(fechaIso);
        const asignacionId = usuarioId
          ? await obtenerOcrearAsignacion(usuarioId, manzanaId, semanaId)
          : null;

        const direccion = String(item.direccion).trim();
        const tipo = item.tipo ? String(item.tipo).trim() : "Primera visita";
        const observacion = item.observacion ? String(item.observacion).trim() : null;
        const contacto = item.contacto_vecino ? String(item.contacto_vecino).trim() : null;
        const resuelto = parsearResuelto(item.resuelto);

        const origenHash = calcularHash([
          codigoManzana,
          fechaIso || "",
          direccion,
          tipo,
          observacion || "",
        ]);

        registros.push({
          manzana_id: manzanaId,
          semana_id: semanaId,
          asignacion_id: asignacionId,
          fecha: fechaIso || new Date().toISOString().slice(0, 10),
          direccion,
          tipo,
          observacion,
          contacto_vecino: contacto,
          resuelto,
          creado_por: usuarioId,
          origen_hash: origenHash,
        });
      }

      // Insertar/actualizar en lotes de 200
      for (let i = 0; i < registros.length; i += 200) {
        const lote = registros.slice(i, i + 200);
        const { error, data } = await supabase
          .from("relevamientos")
          .upsert(lote, { onConflict: "origen_hash", ignoreDuplicates: false })
          .select("id");
        if (error) {
          resumen.errores.push(
            `"${archivo.name}" / "${tituloHoja}": error al guardar relevamientos: ${error.message}`
          );
        } else {
          resumen.relevamientos_nuevos += data?.length || 0;
        }
      }

      onLog(
        `OK: ${archivo.name} / ${tituloHoja} (${codigoManzana}) — ${registros.length} filas.`
      );
    }
  }

  return resumen;
}

module.exports = { runSync, parsearFecha, parsearResuelto, normalizar };
