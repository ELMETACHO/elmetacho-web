import Link from "next/link";
import { notFound } from "next/navigation";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import FormularioLead from "../../FormularioLead";
import Portada from "../../componentes/Portada";
import { productos, productoPorSlug } from "../../contenido/index.js";

export function generateStaticParams() {
  return productos.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  if (!p) return {};
  return {
    title: { absolute: `${p.nombre} · MLABS by El Metacho` },
    description: p.promesa,
    alternates: { canonical: `https://mlabs.elmetacho.com/productos/${slug}` },
  };
}

function Lista({ titulo, items }) {
  return (
    <section>
      <h2>{titulo}</h2>
      <ul>
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </section>
  );
}

// Producto sin precio aprobado: «Muy pronto · Apártalo» deja un lead preventa-<slug>. No hay botón de pago.
export default async function Producto({ params }) {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  if (!p) notFound();

  return (
    <main>
      <MlabsHeader />
      <article className="m-post m-lectura m-con-barra">
        <p className="m-migas"><Link href="/#productos">Productos</Link> / {p.etiqueta ?? "Producto"}</p>
        <Portada palabra={p.palabraPortada ?? p.nombre} chip={p.etiqueta} color={p.portada ?? "tinta"} />
        {p.video && (
          <video src={`/videos/${p.video}.mp4`} poster={`/videos/${p.video}.jpg`} controls muted playsInline preload="none" aria-label={`El sistema real: ${p.nombre}`}
            style={{ display: "block", margin: "16px auto 0", width: 240, aspectRatio: "9 / 16", objectFit: "cover", borderRadius: 20 }} />
        )}
        <div className="m-etiquetas" style={{ marginTop: 16 }}>
          <span>Muy pronto</span>
          <span className="m-verde">Para tu computador</span>
        </div>
        <h1 style={{ marginTop: 6 }}>{p.nombre}</h1>
        <p className="m-resumen">{p.promesa}</p>

        <div id="apartar" className="m-caja">
          <div className="m-grande">Muy pronto</div>
          <small>Apártalo gratis: te avisamos primero cuando abra, con el precio de lanzamiento.</small>
          <FormularioLead
            origen={`preventa-${p.slug}`}
            boton="Apartarlo"
            pedirMensaje={false}
            mensajeOk="Listo, quedó apartado. Te avisamos primero por WhatsApp o correo cuando abra, con el precio de lanzamiento."
          />
          <ul className="m-chequeos">
            <li>Sin pagar nada hoy</li>
            <li>Apartarlo no te obliga a comprar</li>
          </ul>
        </div>

        <div className="m-cuerpo">
          <Lista titulo="Qué incluye" items={p.queIncluye} />
          <Lista titulo="Para quién es" items={p.paraQuien} />
          <Lista titulo="Para quién no es" items={p.noEsPara} />
          <Lista titulo="Qué necesitas" items={p.requisitos} />
          {p.faq.length > 0 && (
            <section className="m-faq">
              <h2>Preguntas frecuentes</h2>
              {p.faq.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </section>
          )}
        </div>
      </article>
      <div className="m-barra-compra">
        <div className="m-lectura">
          <div><b>Muy pronto</b><small>{p.nombre}</small></div>
          <a href="#apartar" className="m-boton m-boton-primario">Apártalo</a>
        </div>
      </div>
      <MlabsFooter />
    </main>
  );
}
