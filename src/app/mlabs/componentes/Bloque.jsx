import Copiar from "../recursos/[slug]/Copiar";

// Un bloque de contenido de una guía: { p }, { lista }, { prompt }, { tabla } u { ojo }.
export default function Bloque({ b }) {
  if (b.p) return <p className="text-base leading-7 text-stone-700">{b.p}</p>;
  if (b.lista)
    return (
      <ul className="space-y-3">
        {b.lista.map((x) => (
          <li key={x} className="flex gap-3 text-base leading-7 text-stone-700">
            <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-rojo)]" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    );
  if (b.prompt)
    return (
      <div className="overflow-hidden rounded-2xl border border-stone-900/10 bg-stone-950">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone-400">Prompt</span>
          <Copiar texto={b.prompt} />
        </div>
        <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-6 text-stone-100 sm:text-sm">{b.prompt}</pre>
      </div>
    );
  if (b.tabla)
    return (
      <div className="space-y-3">
        {b.tabla.map(([mal, bien]) => (
          <div key={mal} className="rounded-2xl border border-stone-900/10 p-4 text-sm leading-6">
            <p className="text-stone-500 line-through decoration-[var(--color-rojo)]/60">✕ {mal}</p>
            <p className="mt-2 font-semibold text-stone-900">✓ {bien}</p>
          </div>
        ))}
      </div>
    );
  if (b.ojo)
    return (
      <p className="rounded-2xl border border-[var(--color-rojo)]/25 bg-[var(--color-rojo)]/5 p-4 text-sm leading-6 text-stone-800">
        <strong className="text-[var(--color-rojo)]">Ojo: </strong>
        {b.ojo}
      </p>
    );
  return null;
}
