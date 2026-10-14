import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../MlabsMarco";
import { novedadesRecientes, guiaPorSlug } from "../contenido/index.js";

export const metadata = {
  title: { absolute: "Novedades de IA de la semana · MLABS by El Metacho" },
  description: "Lo nuevo en IA que de verdad le sirve a tu negocio, explicado en dos frases y con la fuente oficial.",
  alternates: { canonical: "https://mlabs.elmetacho.com/novedades" },
};

const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

export default function Novedades() {
  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <h1 className="titular-ancho text-5xl sm:text-7xl">Novedades de IA</h1>
        <p className="mt-4 text-lg leading-8 text-gris">Lo nuevo de la semana que sí le sirve a tu negocio. Cada novedad con su fuente oficial.</p>
        <div className="mt-10 space-y-6">
          {novedadesRecientes.map((n) => {
            const guia = n.guiaRelacionada && guiaPorSlug(n.guiaRelacionada);
            return (
              <article key={n.slug} id={n.slug} className="scroll-mt-44 rounded-[1.5rem] border-2 border-black p-5 sm:p-7">
                <time dateTime={n.fecha} className="text-sm font-bold text-rojo">{fecha(n.fecha)}</time>
                <h2 className="mt-2 text-2xl font-black leading-tight">{n.titulo}</h2>
                <p className="mt-3 leading-7 text-stone-700">
                  <strong>Qué es: </strong>
                  {n.queEs}
                </p>
                <p className="mt-2 leading-7 text-stone-700">
                  <strong>Para qué te sirve: </strong>
                  {n.paraQueTeSirve}
                </p>
                <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
                  <a href={n.fuente.url} target="_blank" rel="noopener noreferrer" className="underline">
                    Fuente: {n.fuente.nombre} ↗
                  </a>
                  {guia && (
                    <Link href={`/recursos/${guia.slug}`} className="text-rojo underline">
                      Guía: {guia.titulo}
                    </Link>
                  )}
                </p>
              </article>
            );
          })}
        </div>
      </div>
      <MlabsFooter />
    </main>
  );
}
