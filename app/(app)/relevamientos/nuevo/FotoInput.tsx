"use client";

import { useRef, useState, useEffect } from "react";

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
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", CALIDAD)
    );
    if (!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], archivo.name.replace(/\.[^/.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return archivo;
  }
}

type FotoItem = { file: File; preview: string };

type Props = { name?: string; ayuda?: string };

export default function FotoInput({ name = "fotos", ayuda }: Props) {
  const selectorRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [procesando, setProcesando] = useState(false);

  // Sincroniza el input oculto (el que envía el form) con los archivos en estado
  useEffect(() => {
    if (!hiddenRef.current) return;
    const dt = new DataTransfer();
    fotos.forEach((f) => dt.items.add(f.file));
    hiddenRef.current.files = dt.files;
  }, [fotos]);

  async function agregarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    if (!archivos.length) return;
    setProcesando(true);
    const nuevas = await Promise.all(
      archivos.map(async (a) => {
        const comp = await comprimirImagen(a);
        return { file: comp, preview: URL.createObjectURL(comp) };
      })
    );
    setFotos((prev) => [...prev, ...nuevas]);
    setProcesando(false);
    if (selectorRef.current) selectorRef.current.value = "";
  }

  function quitar(idx: number) {
    setFotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  return (
    <div className="space-y-2">
      {/* Input oculto que el server action lee */}
      <input ref={hiddenRef} type="file" name={name} multiple className="hidden" />

      {/* Previsualizaciones */}
      {fotos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fotos.map((f, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.preview}
                alt={`Foto ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => quitar(i)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botón para abrir el selector */}
      <label className="inline-flex items-center gap-2 cursor-pointer bg-gray-50 border border-dashed border-gray-300 text-gray-600 text-sm font-medium rounded-lg px-3 py-2 hover:bg-gray-100 transition">
        <span>📷</span>
        {fotos.length === 0 ? "Agregar foto" : "Agregar otra foto"}
        <input
          ref={selectorRef}
          type="file"
          accept="image/*"
          multiple
          onChange={agregarFotos}
          className="hidden"
        />
      </label>

      {procesando && <p className="text-xs text-turquesa">Procesando foto...</p>}
      {ayuda && <p className="text-xs text-gray-400">{ayuda}</p>}
      {fotos.length > 0 && (
        <p className="text-xs text-gray-500">
          {fotos.length} foto{fotos.length > 1 ? "s" : ""} lista{fotos.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
