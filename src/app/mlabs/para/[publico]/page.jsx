import { notFound } from "next/navigation";
import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import TarjetaContenido from "../../componentes/TarjetaContenido";
import { productos, publicos, publicoPorSlug } from "../../contenido/index.js";
import { contenidoGuias } from "../../contenido/recursos.js";

export const revalidate = 300;

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
  const { guias } = await contenidoGuias();
  const suyas = guias.filter((g) => g.publicos.includes(publico));
  const relacionados = productos.filter((x) => suyas.some((g) => g.productoRelacionado === x.slug));

  return (
    <main>
      <MlabsHeader />
      <div className="m-ancho m-post">
        <p className="m-migas"><Link href="/recursos">Guías gratis</Link> / Para {p.nombre.toLowerCase()}</p>
        <h1 style={{ marginTop: 0 }}>{p.titulo}</h1>
        <p className="m-resumen">{p.intro}</p>
        <div className="m-rejilla" style={{ marginTop: 16 }}>
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
