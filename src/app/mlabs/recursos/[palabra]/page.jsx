import Link from "next/link";
import { notFound } from "next/navigation";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import FormularioLead from "../../FormularioLead";
import { guias, listaGuias } from "../guias";
import Copiar from "./Copiar";

export function generateStaticParams() {
  return listaGuias.map((g) => ({ palabra: g.slug }));
}

export async function generateMetadata({ params }) {
  const { palabra } = await params;
  const g = guias[palabra];
  if (!g) return {};
  return {
    title: { absolute: `${g.titulo} · MLABS by El Metacho` },
    description: g.resumen,
    alternates: { canonical: `https://mlabs.elmetacho.com/recursos/${palabra}` },
  };
}

function Bloque({ b }) {
  if (b.p) return <p className="text-base leading-7 text-stone-700">{b.p}</p>;
  if (b.lista)
    return (
      <ul className="space-y-3">
        {b.lista.map((x) => (
          <li key={x} className="flex gap-3 text-base leading-7 text-stone-700">
            <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-rojo)]" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    );
  if (b.prompt)
    return (
      <div className="overflow-hidden rounded-2xl border border-stone-900/10 bg-stone-950">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone-400">Prompt</span>
          <Copiar texto={b.prompt} />
        </div>
        <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-6 text-stone-100 sm:text-sm">{b.prompt}</pre>
      </div>
    );
  if (b.tabla)
    return (
      <div className="space-y-3">
        {b.tabla.map(([mal, bien]) => (
          <div key={mal} className="rounded-2xl border border-stone-900/10 p-4 text-sm leading-6">
            <p className="text-stone-500 line-through decoration-[var(--color-rojo)]/60">✕ {mal}</p>
            <p className="mt-2 font-semibold text-stone-900">✓ {bien}</p>
          </div>
        ))}
      </div>
    );
  if (b.ojo)
    return (
      <p className="rounded-2xl border border-[var(--color-rojo)]/25 bg-[var(--color-rojo)]/5 p-4 text-sm leading-6 text-stone-800">
        <strong className="text-[var(--color-rojo)]">Ojo: </strong>
        {b.ojo}
      </p>
    );
  return null;
}

export default async function Guia({ params }) {
  const { palabra } = await params;
  const g = guias[palabra];
  if (!g) notFound();

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <article className="mx-auto max-w-2xl px-4 pb-16 pt-24 sm:px-8 sm:pt-32">
        <Link href="/recursos" className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500 hover:text-[var(--color-rojo)]">
          ← Guías gratis
        </Link>
        <p className="mt-6 text-sm font-bold text-rojo">Material del video · comentaste {g.palabra}</p>
        <h1 className="titular-ancho mt-3 text-4xl sm:text-6xl">{g.titulo}</h1>
        <p className="mt-4 text-lg leading-8 text-stone-600">{g.resumen}</p>

        <div className="mt-10 space-y-10">
          {g.secciones.map((s) => (
            <section key={s.titulo}>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{s.titulo}</h2>
              <div className="mt-4 space-y-4">
                {s.bloques.map((b, i) => (
                  <Bloque key={i} b={b} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-[1.75rem] bg-black p-6 text-white sm:p-10">
          <p className="text-2xl font-black sm:text-3xl">¿Prefieres que lo montemos por ti?</p>
          <p className="mt-2 leading-7 text-white/75">Déjanos tu WhatsApp y te contamos cómo lo hacemos para tu negocio.</p>
          <div className="mt-6 rounded-[1.25rem] bg-white p-4 text-black sm:p-6">
            <FormularioLead origen={`guia-${palabra}`} boton="Quiero que me escriban" pedirMensaje={false} />
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
              mainEntityOfPage: `https://mlabs.elmetacho.com/recursos/${palabra}`,
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
