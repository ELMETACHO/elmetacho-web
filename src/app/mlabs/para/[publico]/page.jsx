import { notFound } from "next/navigation";
import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import TarjetaContenido from "../../componentes/TarjetaContenido";
import { guias, productos, publicos, publicoPorSlug } from "../../contenido/index.js";

export function generateStaticParams() {
  return publicos.map((p) => ({ publico: p.slug }));
}

export async function generateMetadata({ params }) {
  const { publico } = await params;
  const p = publicoPorSlug(publico);
  if (!p) return {};
  return {
    title: { absolute: `${p.titulo} · MLABS` },
    description: p.intro,
    alternates: { canonical: `https://mlabs.elmetacho.com/para/${publico}` },
  };
}

// Página pilar por público (SEO): enlaza a sus guías, y cada guía enlaza de vuelta aquí.
export default async function Pilar({ params }) {
  const { publico } = await params;
  const p = publicoPorSlug(publico);
  if (!p) notFound();
  const suyas = guias.filter((g) => g.publicos.includes(publico));
  const relacionados = productos.filter((x) => suyas.some((g) => g.productoRelacionado === x.slug));

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-rojo">Para {p.nombre.toLowerCase()}</p>
        <h1 className="titular-ancho mt-3 text-4xl sm:text-6xl">{p.titulo}</h1>
        <p className="mt-4 text-lg leading-8 text-gris">{p.intro}</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {suyas.map((g) => (
            <TarjetaContenido key={g.slug} guia={g} />
          ))}
        </div>
        {relacionados.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-black">Productos</h2>
            <ul className="mt-4 space-y-2">
              {relacionados.map((x) => (
                <li key={x.slug}>
                  <Link href={`/productos/${x.slug}`} className="font-bold underline">
                    {x.nombre}
                  </Link>{" "}
                  · {x.promesa}
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-12 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
          {publicos
            .filter((x) => x.slug !== publico)
            .map((x) => (
              <Link key={x.slug} href={`/para/${x.slug}`} className="underline">
                Para {x.nombre.toLowerCase()}
              </Link>
            ))}
        </p>
      </div>
      <MlabsFooter />
    </main>
  );
}
