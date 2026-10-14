"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buscar } from "../lib/buscar.js";

const ETIQUETA = { guia: "Guía", prompt: "Prompt", "mini-curso": "Mini curso", producto: "Producto" };

// Buscador instantáneo. Escribir la palabra del video y pulsar Enter (o «Ir») abre directo su guía.
export default function Buscador({ indice, grande = false }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const { exacta, resultados } = buscar(indice, q);
  const destino = exacta ?? resultados[0];
  const id = grande ? "buscar-grande" : "buscar";

  const ir = (ev) => {
    ev.preventDefault();
    if (destino) router.push(destino.href);
  };

  return (
    <form role="search" onSubmit={ir} className="relative">
      <label className="sr-only" htmlFor={id}>Busca la palabra del video o un tema</label>
      <div className="flex gap-2">
        <input
          id={id}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Escribe la palabra del video: RESEÑA, EDITOR…"
          autoComplete="off"
          enterKeyHint="go"
          className={`w-full rounded-full border-2 border-black bg-white px-5 outline-none focus:border-rojo ${grande ? "py-4 text-lg" : "py-2.5 text-base"}`}
        />
        <button type="submit" className="shrink-0 rounded-full bg-rojo px-5 font-bold text-white">Ir</button>
      </div>
      {q.trim() && (
        <ul className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border-2 border-black bg-white shadow-xl">
          {resultados.length === 0 && <li className="p-4 text-sm text-gris">No encontramos «{q}». Prueba con otra palabra o mira todas las guías.</li>}
          {resultados.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className={`block p-4 hover:bg-stone-100 ${r === exacta ? "bg-rojo/10" : ""}`}>
                <span className="text-xs font-bold uppercase tracking-widest text-rojo">
                  {ETIQUETA[r.tipo] ?? r.tipo}
                  {r.palabra && ` · ${r.palabra}`}
                </span>
                <span className="block font-bold leading-6">{r.titulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
