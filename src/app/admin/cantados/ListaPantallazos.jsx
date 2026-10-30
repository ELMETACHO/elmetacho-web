"use client";
import { marcaDe } from "../lib/arrastre.js";
import { useArrastre } from "./useArrastre.js";

// Pantallazos a lo ancho para poder leerlos y ordenarlos (spec cabina, decisión 10): número grande, nombre pequeño debajo.
export default function ListaPantallazos({ pants, onMover, onMoverA, onQuitar }) {
  const { registrar, asa, de, hueco } = useArrastre(pants.length, onMoverA);
  return (
    <ol className="flex flex-col gap-3">
      {pants.map((p, i) => (
        <li key={p.pathname} ref={registrar(i)}
          className={`adm-tarjeta adm-arrastrable flex flex-col gap-2 p-2 ${de === i ? "levantado" : ""} ${marcaDe(i, pants.length, de, hueco)}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.url ? <img src={p.url} alt={`Pantallazo ${i + 1}`} className="adm-pantallazo" />
            : <p className="adm-sub p-2 text-sm">Ya subido (sin vista previa)</p>}
          <div className="flex items-center gap-2">
            <button aria-label="Arrastrar para ordenar" className="adm-icono adm-asa" {...asa(i)}>⠿</button>
            <span className="adm-orden">{i + 1}</span>
            <span className="adm-sub min-w-0 flex-1 truncate text-xs">{p.nombre}</span>
            <button aria-label="Subir" className="adm-icono" onClick={() => onMover(i, -1)}>↑</button>
            <button aria-label="Bajar" className="adm-icono" onClick={() => onMover(i, 1)}>↓</button>
            <button aria-label="Quitar" className="adm-icono peligro" onClick={() => onQuitar(i)}>✕</button>
          </div>
        </li>
      ))}
    </ol>
  );
}
