"use client";
export default function ListaPantallazos({ pants, onMover, onQuitar }) {
  return (
    <ul className="flex flex-col gap-2">
      {pants.map((p, i) => (
        <li key={p.pathname} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt="" className="h-16 w-16 rounded object-cover" />
          <span className="min-w-0 flex-1 truncate text-sm">
            {i + 1}. {p.nombre}
          </span>
          <button aria-label="Subir" className="px-2 py-2 text-xl" onClick={() => onMover(i, -1)}>↑</button>
          <button aria-label="Bajar" className="px-2 py-2 text-xl" onClick={() => onMover(i, 1)}>↓</button>
          <button aria-label="Quitar" className="px-2 py-2 text-xl" onClick={() => onQuitar(i)}>✕</button>
        </li>
      ))}
    </ul>
  );
}
