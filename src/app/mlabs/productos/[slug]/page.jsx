import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import FormularioLead from "../../FormularioLead";
import Tapa from "../../componentes/Tapa";
import TarjetaCurso from "../../componentes/TarjetaCurso";
import Instructor from "../../componentes/Instructor";
import Comprar from "../../componentes/Comprar";
import { productos, productoPorSlug } from "../../contenido/index.js";
import { CURSOS, ORDEN_CURSOS } from "../../contenido/academia.js";
import { COOKIE_MONEDA, formatoMoneda, modoTienda, monedaPara, sePuedeComprar } from "../../lib/tienda/tienda.js";

export function generateStaticParams() {
  return productos.filter((p) => !p.soloPruebas).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  if (!p) return {};
  return { title: { absolute: `${p.nombre} · MetachoLABS` }, description: p.promesa, alternates: { canonical: `https://mlabs.elmetacho.com/productos/${slug}` } };
}

function Lista({ titulo, items }) {
  return (
    <section className="l-bloque">
      <h2>{titulo}</h2>
      <div className="m-cuerpo" style={{ marginTop: 0 }}>
        <ul style={{ margin: 0 }}>{items.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
    </section>
  );
}

// Página de curso (rediseño «academia»): portada, contenido, instructor y recuadro de compra fijo a la derecha.
// Sin precio aprobado o con la tienda apagada: «Muy pronto · Apártalo» (lead preventa-<slug>), sin cobrar.
export default async function Producto({ params }) {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  const modo = modoTienda(process.env);
  if (!p || (p.soloPruebas && modo !== "pruebas")) notFound();
  const v = CURSOS[slug] ?? { foto: "/images/labs/gafas.webp", tapa: p.palabraPortada ?? p.nombre, tono: "negro", categoria: p.etiqueta ?? "Curso", nivel: "Principiante" };
  const comprable = sePuedeComprar(p, modo);
  const moneda = comprable
    ? monedaPara({ cookie: (await cookies()).get(COOKIE_MONEDA)?.value, pais: (await headers()).get("x-vercel-ip-country") })
    : null;
  const otros = ORDEN_CURSOS.filter((s) => s !== slug && s !== "ahorra-50").map(productoPorSlug).filter(Boolean);

  const caja = (id) => comprable ? (
    <div id={id ? "comprar" : undefined}><Comprar slug={p.slug} nombre={p.nombre} precios={p.precios} monedaInicial={moneda} prueba={modo === "pruebas"} /></div>
  ) : (
    <div id={id ? "apartar" : undefined} style={{ display: "grid", gap: 10 }}>
      <div className="l-grande">Muy pronto</div>
      <small>Apártalo gratis y te avisamos primero cuando abra, con el precio de lanzamiento.</small>
      <FormularioLead origen={`preventa-${p.slug}`} boton="Apartarlo" pedirMensaje={false} mensajeOk="Listo, quedó apartado. Te avisamos primero cuando abra." />
      <ul>
        <li>Sin pagar nada hoy</li>
        <li>Apartarlo no te obliga a comprar</li>
      </ul>
    </div>
  );

  return (
    <main>
      <MlabsHeader />
      <div className="l-ancho l-pagina">
        <div className="l-col">
          <div>
            <p className="l-migas"><Link href="/">Inicio</Link> / <Link href="/#cursos">Cursos</Link> / {p.nombre}</p>
            <div style={{ marginTop: 12 }}><Tapa foto={v.foto} titulo={v.tapa} kicker={v.categoria} tono={v.tono} prioridad /></div>
            <div className="l-chips" style={{ marginTop: 16 }}>
              <span className="l-chip l-chip-rojo">{v.categoria}</span>
              <span className="l-chip">{v.nivel}</span>
              <span className="l-chip">{comprable ? "Entrega inmediata" : "Muy pronto"}</span>
            </div>
            <h1>{p.nombre}</h1>
            <p className="l-resumen">{p.promesa}</p>
          </div>

          <div className="l-caja-compra l-solo-movil" style={{ position: "static" }}>{caja(true)}</div>

          <section>
            <h2>Contenido del curso</h2>
            <p className="l-meta-curso">{p.queIncluye.length} partes</p>
            <div className="l-temario">
              {p.queIncluye.map((x, k) => (
                <details key={x}>
                  <summary><span className="l-n">{k + 1}</span><span>{x}</span></summary>
                </details>
              ))}
            </div>
          </section>

          <Lista titulo="Para quién es" items={p.paraQuien} />
          <Lista titulo="Qué necesitas" items={p.requisitos} />
          <Instructor />
          {p.faq.length > 0 && (
            <section className="l-bloque m-faq">
              <h2>Preguntas frecuentes</h2>
              {p.faq.map((f) => (
                <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
              ))}
            </section>
          )}

          {otros.length > 0 && (
            <section>
              <h2>También te puede interesar</h2>
              <div className="l-rejilla">
                {otros.map((o) => (
                  <TarjetaCurso
                    key={o.slug}
                    href={`/productos/${o.slug}`}
                    vista={CURSOS[o.slug]}
                    titulo={o.nombre}
                    resumen={o.promesa}
                    chips={[{ texto: CURSOS[o.slug].categoria, clase: "l-chip-rojo" }]}
                    precio="Muy pronto"
                    nota="Apártalo gratis"
                    boton="Ver curso"
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="l-caja-compra l-solo-ancho" style={{ flexDirection: "column" }}>{caja(false)}</aside>
      </div>
      <div className="l-barra-movil">
        <div className="l-ancho">
          <div><b>{comprable ? formatoMoneda(p.precios[moneda], moneda) : "Muy pronto"}</b><small>{p.nombre}</small></div>
          <a href={comprable ? "#comprar" : "#apartar"} className="l-btn l-btn-rojo">{comprable ? "Comprar" : "Apártalo"}</a>
        </div>
      </div>
      <MlabsFooter />
    </main>
  );
}
