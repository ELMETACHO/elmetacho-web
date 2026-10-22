"use client";
export default function ListaPantallazos({ pants, onMover, onQuitar }) {
  return (
    <ul className="flex flex-col gap-2">
      {pants.map((p, i) => (
        <li key={p.pathname} className="adm-tarjeta flex items-center gap-2 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt="" className="adm-miniatura h-16 w-16" />
          <span className="min-w-0 flex-1 truncate text-sm">
            {i + 1}. {p.nombre}
          </span>
          <button aria-label="Subir" className="adm-icono" onClick={() => onMover(i, -1)}>↑</button>
          <button aria-label="Bajar" className="adm-icono" onClick={() => onMover(i, 1)}>↓</button>
          <button aria-label="Quitar" className="adm-icono peligro" onClick={() => onQuitar(i)}>✕</button>
        </li>
      ))}
    </ul>
  );
}
