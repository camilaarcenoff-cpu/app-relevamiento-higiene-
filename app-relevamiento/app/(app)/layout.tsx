import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "../login/actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol")
    .eq("id", user.id)
    .single();

  const esAdmin = perfil?.rol === "admin";

  const navItems = [
    { href: "/mi-semana", label: "Mi semana" },
    { href: "/historial", label: "Historial" },
    { href: "/relevamientos", label: "Relevamientos" },
    { href: "/direcciones", label: "Direcciones" },
  ];

  const adminItems = [
    { href: "/admin/usuarios", label: "Usuarios" },
    { href: "/admin/asignaciones", label: "Asignaciones" },
    { href: "/admin/items", label: "Ítems de formulario" },
    { href: "/admin/actividad", label: "Actividad" },
    { href: "/admin/sync", label: "Sincronizar" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Navegación lateral (computadora) / superior (celular) */}
      <aside className="bg-navy text-white md:w-60 md:min-h-screen flex md:flex-col">
        <div className="px-4 py-4 border-b border-white/10 flex items-center gap-2">
          <div className="h-2 w-8 bg-amarillo rounded-full" />
          <span className="font-bold text-sm">Higiene Urbana</span>
        </div>

        <nav className="flex-1 flex md:flex-col overflow-x-auto md:overflow-visible">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-3 text-sm hover:bg-white/10 transition whitespace-nowrap border-b md:border-b-0 md:border-l-4 border-transparent hover:border-turquesa"
            >
              {item.label}
            </Link>
          ))}

          {esAdmin && (
            <>
              <div className="px-4 pt-4 pb-1 text-xs uppercase tracking-wide text-turquesa hidden md:block">
                Administración
              </div>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-3 text-sm hover:bg-white/10 transition whitespace-nowrap border-b md:border-b-0 md:border-l-4 border-transparent hover:border-amarillo"
                >
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="px-4 py-3 border-t border-white/10 text-xs flex items-center justify-between">
          <span className="truncate">{perfil?.nombre ?? user.email}</span>
          <form action={cerrarSesion}>
            <button className="text-turquesa hover:underline ml-2 shrink-0">
              Salir
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
