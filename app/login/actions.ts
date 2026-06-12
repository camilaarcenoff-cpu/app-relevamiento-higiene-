"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function iniciarSesion(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent("Usuario o contraseña incorrectos")}`);
  }

  // Registramos el login en el historial de actividad (no es bloqueante).
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("registro_actividad").insert({
      usuario_id: user.id,
      accion: "login",
      detalle: "Inicio de sesión",
    });
  }

  redirect("/mi-semana");
}

export async function cerrarSesion() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
