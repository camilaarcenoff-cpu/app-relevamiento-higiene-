// ============================================================================
// Script de migración / sincronización manual: Google Sheets -> Supabase
//
// Uso:
//   1. Completá el archivo .env.local con las variables que pide
//      sync-sheets/README.md (credenciales de Google + Supabase).
//   2. Corré:  npm run sync
//
// Este script hace lo mismo que el botón "Sincronizar" del panel de
// administración, pero corriendo desde tu computadora (sin límite de tiempo,
// ideal para la primera migración con muchos datos).
// ============================================================================

require("dotenv").config({ path: ".env.local" });
const { runSync } = require("../lib/syncSheets");

async function main() {
  console.log("Iniciando sincronización con Google Sheets...\n");

  const resumen = await runSync({
    googleClientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY,
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    onLog: (msg) => console.log(msg),
  });

  console.log("\n========== RESUMEN ==========");
  console.log(`Hojas procesadas:        ${resumen.hojas_procesadas}`);
  console.log(`Manzanas nuevas:         ${resumen.manzanas_nuevas}`);
  console.log(`Relevamientos guardados: ${resumen.relevamientos_nuevos}`);
  console.log(`Asignaciones creadas:    ${resumen.asignaciones_creadas}`);
  console.log(`Errores:                 ${resumen.errores.length}`);

  if (resumen.errores.length > 0) {
    console.log("\nDetalle de errores:");
    resumen.errores.forEach((e) => console.log(` - ${e}`));
  }
}

main().catch((err) => {
  console.error("\nLa sincronización falló:", err.message);
  process.exit(1);
});
