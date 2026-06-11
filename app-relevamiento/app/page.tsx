import { redirect } from "next/navigation";

export default function Home() {
  // La página principal redirige a "Mi semana".
  // El middleware se encarga de mandar a /login si no hay sesión.
  redirect("/mi-semana");
}
