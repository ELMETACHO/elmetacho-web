import Link from "next/link";
import { notFound } from "next/navigation";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import FormularioLead from "../../FormularioLead";
import { guias, guiaPorSlug, productoPorSlug } from "../../contenido/index.js";
import TarjetaProducto from "../../componentes/TarjetaProducto";
import Bloque from "../../componentes/Bloque";
import Desbloqueo from "../../componentes/Desbloqueo";

export function generateStaticParams() {
  return guias.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const g = guiaPorSlug(slug);
  if (!g) return {};
  return {
    title: { absolute: `${g.titulo} · MLABS by El Metacho` },
    description: g.resumen,
    alternates: { canonical: `https://mlabs.elmetacho.com/recursos/${slug}` },
  };
}

const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

function Seccion({ s }) {
  return (
    <section>
      <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{s.titulo}</h2>
      <div className="mt-4 space-y-4">
        {s.bloques.map((b, i) => (
          <Bloque key={i} b={b} />
        ))}
      </div>
    </section>
  );
}

export default async function Guia({ params }) {
  const { slug } = await params;
  const g = guiaPorSlug(slug);
  if (!g) notFound();
  const libres = g.seccionesLibres ?? 1;

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <article className="mx-auto max-w-2xl px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <Link href="/recursos" className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500 hover:text-[var(--color-rojo)]">
          ← Guías gratis
        </Link>
        <p className="mt-6 text-sm font-bold text-rojo">Material del video · comentaste {g.palabra}</p>
        <h1 className="titular-ancho mt-3 text-4xl sm:text-6xl">{g.titulo}</h1>
        <p className="mt-4 text-lg leading-8 text-stone-600">{g.resumen}</p>

        <p className="mt-3 text-sm text-stone-500">
          {g.tiempo} min · Actualizada el <time dateTime={g.actualizado}>{fecha(g.actualizado)}</time>
        </p>

        <div className="mt-10 space-y-10">
          {g.secciones.slice(0, libres).map((s) => (
            <Seccion key={s.titulo} s={s} />
          ))}
        </div>

        {g.secciones.length > libres && (
          <Desbloqueo slug={slug}>
            {g.secciones.slice(libres).map((s) => (
              <Seccion key={s.titulo} s={s} />
            ))}
          </Desbloqueo>
        )}

        {g.productoRelacionado && <TarjetaProducto producto={productoPorSlug(g.productoRelacionado)} />}

        <div className="mt-14 rounded-[1.75rem] bg-black p-6 text-white sm:p-10">
          <p className="text-2xl font-black sm:text-3xl">¿Prefieres que lo montemos por ti?</p>
          <p className="mt-2 leading-7 text-white/75">Déjanos tu WhatsApp y te contamos cómo lo hacemos para tu negocio.</p>
          <div className="mt-6 rounded-[1.25rem] bg-white p-4 text-black sm:p-6">
            <FormularioLead origen={`instalar-${slug}`} boton="Quiero que me escriban" pedirMensaje={false} />
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: g.titulo,
              description: g.resumen,
              inLanguage: "es",
              mainEntityOfPage: `https://mlabs.elmetacho.com/recursos/${slug}`,
              author: { "@type": "Person", name: "El Metacho", url: "https://www.elmetacho.com" },
              publisher: { "@type": "Organization", name: "MLABS", url: "https://mlabs.elmetacho.com" },
            }),
          }}
        />
      </article>
      <MlabsFooter />
    </main>
  );
}
