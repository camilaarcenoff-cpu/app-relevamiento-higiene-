"use client";

import { useState, useRef } from "react";

type Manzana = { id: string; codigo: string; barrio: string | null };

export function ManzanaSearch({ manzanas }: { manzanas: Manzana[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered =
    query.length >= 2
      ? manzanas.filter((m) =>
          m.codigo.toLowerCase().includes(query.toLowerCase()) ||
          (m.barrio ?? "").toLowerCase().includes(query.toLowerCase())
        )
      : [];

  function seleccionar(m: Manzana) {
    setQuery(`${m.codigo}${m.barrio ? ` · ${m.barrio}` : ""}`);
    setSelectedId(m.id);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder="Escribí el código de manzana..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        autoComplete="off"
      />
      {/* Hidden input que el form envía */}
      <input type="hidden" name="manzana_id" value={selectedId} required />

      {/* Dropdown de resultados */}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto text-sm">
          {filtered.slice(0, 30).map((m) => (
            <li
              key={m.id}
              onMouseDown={() => seleccionar(m)}
              className="px-3 py-2 cursor-pointer hover:bg-turquesa/10 font-mono"
            >
              {m.codigo}
              {m.barrio && <span className="font-sans text-gray-500 ml-2">· {m.barrio}</span>}
            </li>
          ))}
          {filtered.length > 30 && (
            <li className="px-3 py-2 text-gray-400 text-xs">
              Mostrando 30 de {filtered.length} resultados. Escribí más para filtrar.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
