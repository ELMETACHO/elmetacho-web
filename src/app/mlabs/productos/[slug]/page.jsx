import { notFound } from "next/navigation";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import FormularioLead from "../../FormularioLead";
import { productos, productoPorSlug } from "../../contenido/index.js";
import { formatoPrecio } from "../../lib/precio.js";

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
    <section className="mt-10">
      <h2 className="text-2xl font-black tracking-tight">{titulo}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((x) => (
          <li key={x} className="flex gap-3 leading-7 text-stone-700">
            <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-rojo" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function Producto({ params }) {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  if (!p) notFound();
  const lanzamiento = formatoPrecio(p.precioLanzamiento, p.moneda);
  const normal = formatoPrecio(p.precio, p.moneda);

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <article className="mx-auto max-w-2xl px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        {p.estado === "preventa" && <p className="text-sm font-bold uppercase tracking-[0.3em] text-rojo">Preventa</p>}
        <h1 className="titular-ancho mt-3 text-4xl sm:text-6xl">{p.nombre}</h1>
        <p className="mt-4 text-xl leading-8 text-stone-700">{p.promesa}</p>

        {p.video && (
          <video
            src={`/videos/${p.video}.mp4`}
            poster={`/videos/${p.video}.jpg`}
            controls
            muted
            playsInline
            preload="none"
            aria-label={`El sistema real: ${p.nombre}`}
            className="mx-auto mt-8 aspect-[9/16] w-60 rounded-[1.6rem] border-4 border-black object-cover sm:w-72"
          />
        )}

        <Lista titulo="Para quién es" items={p.paraQuien} />
        <Lista titulo="Para quién no es" items={p.noEsPara} />
        <Lista titulo="Qué necesitas" items={p.requisitos} />
        <Lista titulo="Qué incluye" items={p.queIncluye} />

        <section className="mt-10 rounded-[1.75rem] bg-black p-6 text-white sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/60">Precio de lanzamiento</p>
          {lanzamiento ? (
            <p className="mt-2 text-4xl font-black">
              {lanzamiento} {normal && <span className="ml-2 text-xl text-white/50 line-through">{normal}</span>}
            </p>
          ) : (
            <p className="mt-2 text-xl font-black leading-8">Lo anunciamos primero a quienes aparten su cupo.</p>
          )}
          {p.fechaEstimada && <p className="mt-2 text-white/70">Fecha estimada: {p.fechaEstimada}</p>}
          <div className="mt-6 rounded-[1.25rem] bg-white p-4 text-black sm:p-6">
            <p className="mb-4 text-xl font-black">Aparta tu cupo</p>
            <FormularioLead
              origen={`preventa-${p.slug}`}
              boton="Apartar mi cupo"
              pedirMensaje={false}
              mensajeOk="Tu cupo quedó apartado. Te avisamos primero por WhatsApp o correo cuando abra, con el precio de lanzamiento."
            />
          </div>
        </section>

        {p.faq.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-black tracking-tight">Preguntas frecuentes</h2>
            <dl className="mt-4 space-y-5">
              {p.faq.map((f) => (
                <div key={f.q}>
                  <dt className="font-bold">{f.q}</dt>
                  <dd className="mt-1 leading-7 text-stone-700">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </article>
      <MlabsFooter />
    </main>
  );
}
