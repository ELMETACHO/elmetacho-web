import Link from "next/link";
import { notFound } from "next/navigation";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import { productoPorSlug } from "../../contenido/index.js";
import { contenidoGuias } from "../../contenido/recursos.js";
import { CURSOS, vistaRecurso } from "../../contenido/academia.js";
import Tapa from "../../componentes/Tapa";
import TarjetaCurso from "../../componentes/TarjetaCurso";
import Instructor from "../../componentes/Instructor";
import Bloque from "../../componentes/Bloque";
import Desbloqueo from "../../componentes/Desbloqueo";

// Recurso gratis armado como un curso (rediseño «academia»): portada, lecciones desplegables y recuadro a la derecha.
// La primera lección es libre; las demás se abren con el correo (mismo desbloqueo de siempre).
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
    title: { absolute: `${g.titulo} · MetachoLABS` },
    description: g.resumen,
    alternates: { canonical: `https://mlabs.elmetacho.com/recursos/${slug}` },
    openGraph: { type: "article", locale: "es_CO", siteName: "MetachoLABS", title: g.titulo, description: g.resumen, images: [{ url: "/images/labs/heroe.webp" }] },
  };
}

// Minutos de lectura de una lección (≈ 200 palabras por minuto, mínimo 1).
const minutos = (s) => Math.max(1, Math.round(JSON.stringify(s.bloques).split(/\s+/).length / 200));

function Leccion({ s, n, abierta, libre }) {
  return (
    <details id={`paso-${n}`} open={abierta} style={{ scrollMarginTop: 90 }}>
      <summary>
        <span className="l-n">{n}</span>
        <span>{s.titulo}</span>
        <span className="l-dur">{libre && <span className="l-libre">Libre</span>}{minutos(s)} min</span>
      </summary>
      <div className="l-leccion m-cuerpo" style={{ marginTop: 0 }}>
        <div>{s.bloques.map((b, i) => <Bloque key={i} b={b} />)}</div>
      </div>
    </details>
  );
}

export default async function Recurso({ params }) {
  const { slug } = await params;
  const { guias, guiaPorSlug } = await contenidoGuias();
  const g = guiaPorSlug(slug);
  if (!g) notFound();
  const i = guias.findIndex((x) => x.slug === slug);
  const vista = vistaRecurso(g, i);
  const libres = g.seccionesLibres ?? 1;
  const bloqueadas = g.secciones.slice(libres);
  const producto = g.productoRelacionado && productoPorSlug(g.productoRelacionado);
  const otras = guias.filter((x) => x.slug !== slug).slice(0, 3);
  const total = g.secciones.reduce((a, s) => a + minutos(s), 0);

  return (
    <main>
      <MlabsHeader />
      <div className="l-ancho l-pagina">
        <div className="l-col">
          <div>
            <p className="l-migas"><Link href="/">Inicio</Link> / <Link href="/#gratis">Recursos gratis</Link> / {g.titulo}</p>
            <div style={{ marginTop: 12 }}><Tapa foto={vista.foto} titulo={vista.tapa} kicker={vista.categoria} tono={vista.tono} prioridad /></div>
            <div className="l-chips" style={{ marginTop: 16 }}>
              <span className="l-chip l-chip-verde">Gratis</span>
              <span className="l-chip l-chip-rojo">{vista.categoria}</span>
              <span className="l-chip">{vista.nivel}</span>
            </div>
            <h1>{g.titulo}</h1>
            <p className="l-resumen">{g.resumen}</p>
          </div>

          <section id="contenido" style={{ scrollMarginTop: 90 }}>
            <h2>Contenido</h2>
            <p className="l-meta-curso">{g.secciones.length} lecciones · {total} min · comentaste {g.palabra}</p>
            <div className="l-temario">
              {g.secciones.slice(0, libres).map((s, k) => <Leccion key={s.titulo} s={s} n={k + 1} abierta libre />)}
            </div>
            {bloqueadas.length > 0 && (
              <Desbloqueo
                slug={slug}
                titulo={`Abre las ${bloqueadas.length} lecciones que faltan`}
                texto="Deja tu correo y se abren aquí mismo, gratis."
                boton="Abrir todo el contenido"
              >
                <div className="l-temario">
                  {bloqueadas.map((s, k) => <Leccion key={s.titulo} s={s} n={k + libres + 1} abierta={k === 0} />)}
                </div>
              </Desbloqueo>
            )}
          </section>

          <Instructor />

          <section>
            <h2>También te puede interesar</h2>
            <div className="l-rejilla">
              {producto && CURSOS[producto.slug] && (
                <TarjetaCurso
                  href={`/productos/${producto.slug}`}
                  vista={{ ...CURSOS[producto.slug], categoria: CURSOS[producto.slug].categoria }}
                  titulo={producto.nombre}
                  resumen={producto.promesa}
                  chips={[{ texto: CURSOS[producto.slug].categoria, clase: "l-chip-rojo" }]}
                  precio="Muy pronto"
                  nota="Apártalo gratis"
                  boton="Ver curso"
                />
              )}
              {otras.slice(0, producto ? 2 : 3).map((o) => (
                <TarjetaCurso
                  key={o.slug}
                  href={`/recursos/${o.slug}`}
                  vista={vistaRecurso(o, guias.indexOf(o))}
                  titulo={o.titulo}
                  resumen={o.resumen}
                  chips={[{ texto: "Gratis", clase: "l-chip-verde" }, { texto: `${o.tiempo} min` }]}
                  precio="Gratis"
                  boton="Ver"
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="l-caja-compra l-solo-ancho" style={{ flexDirection: "column" }}>
          <div className="l-grande">Gratis</div>
          <small>La primera lección es libre. Las demás se abren con tu correo.</small>
          <a href="#contenido" className="l-btn l-btn-rojo l-btn-ancho">Empezar ahora</a>
          <ul>
            <li>{g.secciones.length} lecciones cortas</li>
            <li>{total} minutos en total</li>
            <li>Desde el celular o el PC</li>
          </ul>
        </aside>
      </div>
      <div className="l-barra-movil">
        <div className="l-ancho">
          <div><b>Gratis</b><small>{g.secciones.length} lecciones · {total} min</small></div>
          <a href="#contenido" className="l-btn l-btn-rojo">Empezar</a>
        </div>
      </div>
      <MlabsFooter />
    </main>
  );
}
