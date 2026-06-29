import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Ruta temporal para reparar usuarios @higiene.gob.ar via Admin API.
// Protegida con un token secreto en el header.
// BORRAR este archivo después de usar.

const SECRET = "fix-higiene-2026";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auth = searchParams.get("secret");
  if (auth !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Traer todos los usuarios de auth con email @higiene.gob.ar
  // (GoTrue lista por páginas de 1000)
  const { data: { users }, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const targets = users.filter((u) => u.email?.endsWith("@higiene.gob.ar"));

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const user of targets) {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: "higiene2026",
      email_confirm: true,
    });
    results.push({
      email: user.email ?? "",
      ok: !error,
      error: error?.message,
    });
  }

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok);

  return NextResponse.json({
    total: targets.length,
    actualizados: ok,
    errores: fail,
    detalle: results,
  });
}
