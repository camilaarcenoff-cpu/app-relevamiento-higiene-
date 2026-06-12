import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user!.id)
    .single();

  if (perfil?.rol !== "admin") {
    redirect("/mi-semana");
  }

  return <div>{children}</div>;
}
