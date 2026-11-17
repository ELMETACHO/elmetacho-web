import Link from "next/link";
import { notFound } from "next/navigation";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import FormularioLead from "../../FormularioLead";
import { productoPorSlug, publicoPorSlug } from "../../contenido/index.js";
import { contenidoGuias } from "../../contenido/recursos.js";
import { SiguientePaso } from "../../componentes/TarjetaProducto";
import Portada, { COLOR_TIPO, ETIQUETA_TIPO } from "../../componentes/Portada";
import Bloque from "../../componentes/Bloque";
import Desbloqueo from "../../componentes/Desbloqueo";

// Guías desde Redis con ISR: las nuevas se generan en la primera visita, sin deploy.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { guias } = await contenidoGuias();
  return guias.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const g = (await contenidoGuias()).guiaPorSlug(slug);
  if (!g) return {};
  return {
    title: { absolute: `${g.titulo} · MLABS by El Metacho` },
    description: g.resumen,
    alternates: { canonical: `https://mlabs.elmetacho.com/recursos/${slug}` },
    openGraph: {
      type: "article", locale: "es_CO", siteName: "MLABS by El Metacho", url: `https://mlabs.elmetacho.com/recursos/${slug}`,
      title: `${g.titulo} · MLABS by El Metacho`, description: g.resumen,
      images: [{ url: "https://mlabs.elmetacho.com/videos/gps.jpg", width: 540, height: 960 }],
    },
  };
}

const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
// JSON-LD dentro de <script>: «<» escapado para que un texto no pueda cerrar la etiqueta.
const ld = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

function Seccion({ s, n }) {
  return (
    <section id={`paso-${n}`} style={{ scrollMarginTop: 80 }}>
      <h2>{s.titulo}</h2>
      {s.bloques.map((b, i) => (
        <Bloque key={i} b={b} />
      ))}
    </section>
  );
}

export default async function Guia({ params }) {
  const { slug } = await params;
  const g = (await contenidoGuias()).guiaPorSlug(slug);
  if (!g) notFound();
  const libres = g.seccionesLibres ?? 1;
  const bloqueadas = g.secciones.slice(libres);
  const producto = g.productoRelacionado && productoPorSlug(g.productoRelacionado);
  const url = `https://mlabs.elmetacho.com/recursos/${slug}`;
  const articulo = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.titulo,
    description: g.resumen,
    inLanguage: "es",
    datePublished: g.actualizado,
    dateModified: g.actualizado,
    mainEntityOfPage: url,
    author: { "@type": "Person", name: "El Metacho", url: "https://www.elmetacho.com" },
    publisher: { "@type": "Organization", name: "MLABS", url: "https://mlabs.elmetacho.com" },
  };
  const howto = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: g.titulo,
    description: g.resumen,
    totalTime: `PT${g.tiempo}M`,
    step: g.secciones.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.titulo, url: `${url}#paso-${i + 1}` })),
  };
  // «Te faltan 2 partes: el prompt y los ejemplos»: el candado dice exactamente qué se abre.
  const faltan = bloqueadas.map((s) => s.titulo.toLowerCase());
  const tituloCandado =
    bloqueadas.length === 1 ? `Te falta 1 parte: ${faltan[0]}` : `Te faltan ${bloqueadas.length} partes: ${faltan.slice(0, -1).join(", ")} y ${faltan.at(-1)}`;

  return (
    <main>
      <MlabsHeader />
      <article className="m-post m-lectura">
        <p className="m-migas"><Link href="/recursos">Guías gratis</Link> / {ETIQUETA_TIPO[g.tipo]}</p>
        <div className="m-autor">
          <span className="m-avatar">LABS</span>
          <div>
            <b>Metacho LABS</b>
            <span>{ETIQUETA_TIPO[g.tipo]} · {g.tiempo} min · <time dateTime={g.actualizado}>{fecha(g.actualizado)}</time></span>
          </div>
        </div>
        <Portada palabra={g.palabra} chip="Comentaste" color={g.portada ?? COLOR_TIPO[g.tipo]} />
        <h1>{g.titulo}</h1>
        <p className="m-resumen">{g.resumen}</p>
        <div className="m-etiquetas" style={{ marginTop: 14 }}>
          {g.publicos.map((s) => (
            <Link key={s} href={`/para/${s}`}>{publicoPorSlug(s)?.nombre ?? s}</Link>
          ))}
        </div>

        <div className="m-cuerpo">
          {g.secciones.slice(0, libres).map((s, i) => (
            <Seccion key={s.titulo} s={s} n={i + 1} />
          ))}
        </div>

        {bloqueadas.length > 0 && (
          <Desbloqueo slug={slug} titulo={tituloCandado} texto="Deja tu correo y se abren aquí mismo, gratis." boton="Abrir la guía completa">
            {bloqueadas.map((s, i) => (
              <Seccion key={s.titulo} s={s} n={i + libres + 1} />
            ))}
          </Desbloqueo>
        )}

        {producto && <SiguientePaso producto={producto} />}

        <div className="m-oscuro" style={{ marginTop: 28 }}>
          <p style={{ fontSize: 22, fontWeight: 750, lineHeight: 1.25, margin: 0 }}>¿Prefieres que lo montemos por ti?</p>
          <p style={{ margin: "6px 0 14px" }}>Déjanos tu WhatsApp y te contamos cómo lo hacemos para tu negocio.</p>
          <div style={{ background: "#fff", color: "var(--m-tinta)", borderRadius: 16, padding: 16 }}>
            <FormularioLead origen={`instalar-${slug}`} boton="Quiero que me escriban" pedirMensaje={false} />
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(g.howto ? [articulo, howto] : articulo) }} />
      </article>
      <MlabsFooter />
    </main>
  );
}
