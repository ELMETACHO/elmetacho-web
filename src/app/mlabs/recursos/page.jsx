import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../MlabsMarco";
import { guias } from "../contenido/index.js";

export const metadata = {
  title: { absolute: "Guías gratis · MLABS by El Metacho" },
  description: "Prompts y guías paso a paso de los videos de Metacho Labs para usar la IA en tu marca.",
  alternates: { canonical: "https://mlabs.elmetacho.com/recursos" },
};

export default function Recursos() {
  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-8 sm:pt-32">
        <h1 className="titular-ancho text-5xl sm:text-7xl">Guías gratis</h1>
        <p className="mt-4 text-lg leading-8 text-gris">Busca la palabra que comentaste en el video y abre tu guía.</p>
        <div className="mt-8 grid gap-3">
          {guias.map((g) => (
            <Link key={g.slug} href={`/recursos/${g.slug}`} className="flex items-center justify-between gap-4 rounded-[1.25rem] border-2 border-black p-5 transition hover:bg-black hover:text-white">
              <span>
                <span className="text-sm font-bold text-rojo">Comenta {g.palabra}</span>
                <span className="mt-1 block text-lg font-black leading-6">{g.titulo}</span>
              </span>
              
            </Link>
          ))}
        </div>
      </div>
      <MlabsFooter />
    </main>
  );
}
