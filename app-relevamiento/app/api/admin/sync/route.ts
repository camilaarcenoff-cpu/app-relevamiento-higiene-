import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { runSync } from "@/lib/syncSheets";

// POST /api/admin/sync
// Dispara la sincronización con Google Sheets desde el panel de admin.
// Solo puede ejecutarla un usuario con rol 'admin'.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, nombre")
    .eq("id", user.id)
    .single();

  if (perfil?.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const googleClientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const googlePrivateKey = process.env.GOOGLE_PRIVATE_KEY;
  const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!googleClientEmail || !googlePrivateKey || !driveFolderId) {
    return NextResponse.json(
      {
        error:
          "Faltan configurar las variables de entorno de Google (GOOGLE_CLIENT_EMAIL, " +
          "GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID). Mirá sync-sheets/README.md para el paso a paso.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  try {
    const resumen = await runSync({
      googleClientEmail,
      googlePrivateKey,
      driveFolderId,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });

    await admin.from("registro_actividad").insert({
      usuario_id: user.id,
      accion: "sync_sheets",
      detalle: `Hojas: ${resumen.hojas_procesadas} · Manzanas nuevas: ${resumen.manzanas_nuevas} · Relevamientos: ${resumen.relevamientos_nuevos} · Errores: ${resumen.errores.length}`,
    });

    return NextResponse.json({ ok: true, resumen });
  } catch (err: any) {
    await admin.from("registro_actividad").insert({
      usuario_id: user.id,
      accion: "sync_sheets",
      detalle: `Error: ${err.message}`,
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
