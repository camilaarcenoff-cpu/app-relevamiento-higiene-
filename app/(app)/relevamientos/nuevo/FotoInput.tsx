"use client";

import { useRef, useState } from "react";

// Tamaño máximo (en píxeles, lado más largo) y calidad JPEG al comprimir.
// Una foto de celular típica (3-5 MB) queda en ~150-300 KB sin perder
// calidad visible en pantalla, para que el espacio gratis de Supabase
// Storage (1 GB) alcance para miles de fotos.
const LADO_MAXIMO = 1600;
const CALIDAD = 0.7;

async function comprimirImagen(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/")) return archivo;

  try {
    const bitmap = await createImageBitmap(archivo);
    let { width, height } = bitmap;

    if (width > LADO_MAXIMO || height > LADO_MAXIMO) {
      const escala = Math.min(LADO_MAXIMO / width, LADO_MAXIMO / height);
      width = Math.round(width * escala);
      height = Math.round(height * escala);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CALIDAD)
    );
    if (!blob) return archivo;

    // Si la versión comprimida termina pesando más que la original
    // (puede pasar con imágenes ya muy chicas), nos quedamos con la original.
    if (blob.size >= archivo.size) return archivo;

    const nombre = archivo.name.replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg" });
  } catch {
    // Si el navegador no puede procesar el archivo (formato no soportado, etc.),
    // se sube tal cual.
    return archivo;
  }
}

type Props = {
  /** Nombre del campo del formulario (debe coincidir con lo que lee el server action). */
  name?: string;
  /** Texto de ayuda que se muestra debajo del input. */
  ayuda?: string;
};

export default function FotoInput({
  name = "fotos",
  ayuda = "Opcional. Podés sacar fotos desde el celular — la app las comprime automáticamente antes de subirlas.",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<string>("");

  async function manejarCambio(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = e.target.files;
    if (!archivos || archivos.length === 0) {
      setEstado("");
      return;
    }

    setEstado("Comprimiendo fotos...");

    const dt = new DataTransfer();
    let pesoTotal = 0;
    for (const archivo of Array.from(archivos)) {
      const comprimido = await comprimirImagen(archivo);
      pesoTotal += comprimido.size;
      dt.items.add(comprimido);
    }

    if (inputRef.current) inputRef.current.files = dt.files;

    const pesoMb = (pesoTotal / (1024 * 1024)).toFixed(1);
    setEstado(
      `${dt.files.length} foto${dt.files.length === 1 ? "" : "s"} lista${
        dt.files.length === 1 ? "" : "s"
      } para subir (${pesoMb} MB en total).`
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        multiple
        onChange={manejarCambio}
        className="w-full text-sm"
      />
      <p className="text-xs text-gray-400 mt-1">{ayuda}</p>
      {estado && <p className="text-xs text-turquesa mt-1">{estado}</p>}
    </div>
  );
}
