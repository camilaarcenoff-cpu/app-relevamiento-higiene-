import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Ruta temporal para reparar usuarios @higiene.gob.ar via Admin API.
// Protegida con ?secret=fix-higiene-2026
// BORRAR este archivo después de usar.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== "fix-higiene-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data, error: listError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const targets = (data?.users ?? []).filter((u: { email?: string }) =>
    u.email?.endsWith("@higiene.gob.ar")
  );

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const user of targets) {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: "higiene2026",
      email_confirm: true,
    } as Parameters<typeof admin.auth.admin.updateUserById>[1]);
    results.push({
      email: user.email ?? "",
      ok: !error,
      ...(error ? { error: error.message } : {}),
    });
  }

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok);

  return NextResponse.json({
    total: targets.length,
    actualizados: ok,
    errores: fail,
  });
}
