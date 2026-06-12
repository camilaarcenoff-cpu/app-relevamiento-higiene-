import { iniciarSesion } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="h-2 w-16 bg-amarillo rounded-full mb-3" />
          <h1 className="text-xl font-bold text-navy text-center">
            Campaña de Higiene Urbana
          </h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            Acceso para el equipo de relevamiento
          </p>
        </div>

        {searchParams?.error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">
            {searchParams.error}
          </div>
        )}

        <form action={iniciarSesion} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuario (email)
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-turquesa"
              placeholder="nombre@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-turquesa"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-navy text-white font-semibold rounded-lg py-2.5 hover:opacity-90 transition"
          >
            Ingresar
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          ¿No tenés usuario o contraseña? Pedíselo a la coordinación de la
          campaña.
        </p>
      </div>
    </div>
  );
}
