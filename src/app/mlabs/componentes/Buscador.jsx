"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buscar } from "../lib/buscar.js";

const ETIQUETA = { guia: "Guía", prompt: "Prompt", "mini-curso": "Mini curso", producto: "Producto" };

// Buscador instantáneo. Escribir la palabra del video y pulsar Enter (o «Abrir») abre directo su guía.
export default function Buscador({ indice, id = "buscar", placeholder = "¿Qué palabra comentaste? EDITOR, RESEÑA…" }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const { exacta, resultados } = buscar(indice, q);
  const destino = exacta ?? resultados[0];

  const ir = (ev) => {
    ev.preventDefault();
    if (destino) router.push(destino.href);
  };

  return (
    <form role="search" onSubmit={ir} className="m-buscador">
      <label className="sr-only" htmlFor={id}>Busca la palabra del video o un tema</label>
      <div className="m-buscador-campo">
        <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoComplete="off" enterKeyHint="go" />
        <button type="submit" className="m-boton m-boton-primario">Abrir</button>
      </div>
      {q.trim() && (
        <ul>
          {resultados.length === 0 && <li><p>No encontramos «{q}». Revisa cómo la escribiste o mira todas las guías abajo.</p></li>}
          {resultados.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className={r === exacta ? "m-exacta" : undefined}>
                <small>{ETIQUETA[r.tipo] ?? r.tipo}{r.palabra && ` · ${r.palabra}`}</small>
                <b>{r.titulo}</b>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
