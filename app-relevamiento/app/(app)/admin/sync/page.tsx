import SyncButton from "./SyncButton";

export default function SyncPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Sincronizar con Google Sheets</h1>
      <p className="text-gray-500 mb-6 max-w-2xl">
        Trae los relevamientos cargados en las planillas de Drive (una por
        comuna, una pestaña por persona/manzana) y los guarda acá. Podés
        correrlo las veces que quieras: lo ya cargado no se duplica.
      </p>

      <div className="bg-white rounded-xl shadow-sm p-5 max-w-2xl">
        <SyncButton />

        <p className="text-xs text-gray-400 mt-4">
          Si nunca configuraste la conexión con Google, primero seguí los
          pasos de <span className="font-mono">sync-sheets/README.md</span>{" "}
          (cuenta de servicio de Google Cloud + variables de entorno
          GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID).
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Para la primera migración (con muchos datos), te recomendamos
          correr <span className="font-mono">npm run sync</span> desde tu
          computadora en lugar de este botón, porque no tiene límite de
          tiempo.
        </p>
      </div>
    </div>
  );
}
