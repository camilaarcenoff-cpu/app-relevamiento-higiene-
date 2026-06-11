import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para usar en componentes del navegador ("use client").
// Usa la clave pública (anon): respeta siempre las reglas de RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
