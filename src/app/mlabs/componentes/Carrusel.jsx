"use client";

import { useEffect, useRef, useState } from "react";

// Carrusel horizontal con imán (scroll-snap) y flechas. Sin librerías: el deslizar del celular es nativo.
export default function Carrusel({ titulo, intro, children, accion }) {
  const pista = useRef(null);
  const [borde, setBorde] = useState({ ini: true, fin: false });

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    const medir = () => setBorde({ ini: el.scrollLeft < 8, fin: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => { el.removeEventListener("scroll", medir); window.removeEventListener("resize", medir); };
  }, []);

  const mover = (dir) => {
    const el = pista.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div>
      <div className="l-cabeza">
        <div>
          <h2>{titulo}</h2>
          {intro && <p>{intro}</p>}
        </div>
        <div className="l-flechas">
          {accion}
          <button type="button" onClick={() => mover(-1)} disabled={borde.ini} aria-label="Anteriores">←</button>
          <button type="button" onClick={() => mover(1)} disabled={borde.fin} aria-label="Siguientes">→</button>
        </div>
      </div>
      <div className="l-pista" ref={pista}>{children}</div>
    </div>
  );
}
