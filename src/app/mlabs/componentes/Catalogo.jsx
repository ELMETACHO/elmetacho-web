"use client";

import { useState } from "react";
import TarjetaContenido from "./TarjetaContenido";
import { filtrar } from "../lib/filtrar.js";

const TIPOS = [["guia", "Guías"], ["prompt", "Prompts"], ["mini-curso", "Mini cursos"]];

function Chip({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-full border-2 border-black px-4 py-2 text-sm font-bold ${activo ? "bg-black text-white" : "bg-white"}`}
    >
      {children}
    </button>
  );
}

// Catálogo de guías con filtros por público y por tipo (se filtra en el navegador).
export default function Catalogo({ guias, publicos }) {
  const [publico, setPublico] = useState(null);
  const [tipo, setTipo] = useState(null);
  const lista = filtrar(guias, { publico, tipo });
  const tiposUsados = TIPOS.filter(([t]) => guias.some((g) => g.tipo === t));

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        <Chip activo={!publico} onClick={() => setPublico(null)}>Todos</Chip>
        {publicos.map((p) => (
          <Chip key={p.slug} activo={publico === p.slug} onClick={() => setPublico(p.slug)}>
            {p.nombre}
          </Chip>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip activo={!tipo} onClick={() => setTipo(null)}>Todo</Chip>
        {tiposUsados.map(([t, n]) => (
          <Chip key={t} activo={tipo === t} onClick={() => setTipo(t)}>
            {n}
          </Chip>
        ))}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {lista.map((g) => (
          <TarjetaContenido key={g.slug} guia={g} />
        ))}
        {lista.length === 0 && <p className="text-gris">Todavía no hay guías con ese filtro.</p>}
      </div>
    </>
  );
}
