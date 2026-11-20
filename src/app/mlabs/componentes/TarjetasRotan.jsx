"use client";

import { useEffect, useState } from "react";
import Tapa from "./Tapa";

// Las 3 tarjetas que flotan sobre la foto de la portada. Cada una cambia de tema cada ~2,6 s con un fundido,
// desfasadas para que no cambien al mismo tiempo. Conservan la flotación y el tamaño de .l-flota.
// Con «reducir movimiento» activado no rotan.
const INTERVALO = 2600;

function Slot({ items, inicio, desfase, clase }) {
  const [i, setI] = useState(inicio % items.length);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let intervalo;
    const t = setTimeout(() => {
      setI((x) => (x + 3) % items.length);
      intervalo = setInterval(() => setI((x) => (x + 3) % items.length), INTERVALO);
    }, INTERVALO + desfase);
    return () => { clearTimeout(t); clearInterval(intervalo); };
  }, [items.length, desfase]);
  return (
    <div className={`l-flota ${clase}`}>
      <div className="l-rota">
        {items.map((it, k) => (
          <div key={k} className={k === i ? "l-rota-activa" : undefined} aria-hidden={k !== i}>
            <Tapa foto={it.foto} titulo={it.tapa} tono={it.tono} prioridad={k < 3} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TarjetasRotan({ items }) {
  return (
    <>
      <Slot items={items} inicio={0} desfase={0} clase="l-flota-1" />
      <Slot items={items} inicio={1} desfase={850} clase="l-flota-2" />
      <Slot items={items} inicio={2} desfase={1700} clase="l-flota-3" />
    </>
  );
}
