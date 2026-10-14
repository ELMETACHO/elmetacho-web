import Link from "next/link";

const ETIQUETA = { guia: "Guía", prompt: "Prompt", "mini-curso": "Mini curso" };

// Tarjeta de una guía en los listados. Una sola acción: abrirla.
export default function TarjetaContenido({ guia: g }) {
  return (
    <Link href={`/recursos/${g.slug}`} className="flex h-full flex-col rounded-[1.25rem] border-2 border-black p-5 transition hover:bg-black hover:text-white">
      <span className="text-xs font-bold uppercase tracking-widest text-rojo">
        {ETIQUETA[g.tipo]} · {g.tiempo} min · Comenta {g.palabra}
      </span>
      <span className="mt-2 text-lg font-black leading-6">{g.titulo}</span>
      <span className="mt-2 text-sm leading-6 opacity-75">{g.resumen}</span>
    </Link>
  );
}
