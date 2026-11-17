"use client";

import { useState } from "react";
import TarjetaContenido from "./TarjetaContenido";
import { filtrar } from "../lib/filtrar.js";

const TIPOS = [["guia", "Guías"], ["prompt", "Prompts"], ["mini-curso", "Mini cursos"]];

function Chip({ activo, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}>
      {children}
    </button>
  );
}

// Catálogo de guías con filtros por tipo y por público (se filtra en el navegador). `max` recorta la lista.
export default function Catalogo({ guias, publicos, max }) {
  const [publico, setPublico] = useState(null);
  const [tipo, setTipo] = useState(null);
  const todas = filtrar(guias, { publico, tipo });
  const lista = max ? todas.slice(0, max) : todas;
  const tiposUsados = TIPOS.filter(([t]) => guias.some((g) => g.tipo === t));

  return (
    <>
      <div className="m-filtros" aria-label="Filtrar por tipo">
        <Chip activo={!tipo} onClick={() => setTipo(null)}>Todo</Chip>
        {tiposUsados.map(([t, n]) => (
          <Chip key={t} activo={tipo === t} onClick={() => setTipo(t)}>{n}</Chip>
        ))}
      </div>
      <div className="m-filtros" aria-label="Filtrar por público">
        <Chip activo={!publico} onClick={() => setPublico(null)}>Para todos</Chip>
        {publicos.map((p) => (
          <Chip key={p.slug} activo={publico === p.slug} onClick={() => setPublico(p.slug)}>{p.nombre}</Chip>
        ))}
      </div>
      <div className="m-rejilla">
        {lista.map((g) => (
          <TarjetaContenido key={g.slug} guia={g} />
        ))}
        {lista.length === 0 && <p className="m-meta">Todavía no hay guías con ese filtro.</p>}
      </div>
    </>
  );
}
