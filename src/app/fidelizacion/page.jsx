import Navbar from "../components/Navbar";
import Reveal from "../components/Reveal";
import Footer from "../components/Footer";

const CONTACTO_MAILTO =
  "mailto:contacto@elmetacho.com?subject=Sistema%20de%20Fidelizaci%C3%B3n%20por%20WhatsApp";

export const metadata = {
  title: "Sistema de Fidelización por WhatsApp",
  description:
    "Plataforma SaaS de fidelización de clientes para pequeños negocios en Colombia: puntos, canjes y avisos dentro de la conversación de WhatsApp del negocio. Desarrollado y operado por EL METACHO S.A.S.",
  alternates: {
    canonical: "https://elmetacho.com/fidelizacion",
  },
};

const funciones = [
  {
    title: "Consultar su saldo de puntos",
    description: "Tus clientes preguntan por WhatsApp y reciben en el mismo chat cuántos puntos llevan.",
  },
  {
    title: "Canjear premios",
    description: "Los puntos acumulados se convierten en premios sin salir de la conversación.",
  },
  {
    title: "Recibir confirmaciones y avisos",
    description: "Confirmaciones y avisos de su programa de fidelidad, directo en su WhatsApp.",
  },
];

const pasos = [
  {
    title: "El negocio se registra",
    description: "Cada negocio crea su cuenta en la plataforma y configura su programa de fidelidad.",
  },
  {
    title: "Conecta su WhatsApp Business",
    description:
      "El negocio conecta su propia cuenta de WhatsApp Business mediante la API oficial de Meta.",
  },
  {
    title: "Sus clientes participan por WhatsApp",
    description:
      "Todo ocurre dentro de la conversación de WhatsApp del negocio, sin apps adicionales que instalar.",
  },
];

const negocios = ["Barberías", "Spas", "Panaderías", "Restaurantes"];

export default function Fidelizacion() {
  return (
    <main className="relative min-h-screen bg-[#faf3e9] text-stone-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(244,99,74,0.12),_transparent_35%)] blur-3xl" />

      <Navbar />

      <div className="relative mx-auto max-w-6xl px-6 pt-24 sm:px-8 lg:px-12">
        {/* HERO */}
        <section className="py-24 sm:py-28 lg:py-32">
          <div className="max-w-3xl space-y-8">
            <Reveal>
              <span className="inline-flex rounded-full border border-[#f4634a]/30 bg-[#f4634a]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">
                SaaS · Fidelización
              </span>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                Sistema de Fidelización por{" "}
                <span className="text-[#f4634a]">WhatsApp</span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">
                Plataforma SaaS de fidelización de clientes para pequeños negocios en Colombia.
                Cada negocio conecta su propia cuenta de WhatsApp Business mediante la API oficial
                de Meta, y sus clientes acumulan y canjean puntos sin instalar nada.
              </p>
            </Reveal>

            <Reveal delay={0.28}>
              <div className="flex flex-wrap gap-3">
                {negocios.map((n) => (
                  <span
                    key={n}
                    className="rounded-full border border-stone-900/10 bg-white px-4 py-1.5 text-sm font-medium text-stone-600"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.35}>
              <a
                href={CONTACTO_MAILTO}
                className="inline-flex rounded-full bg-[#f4634a] px-7 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(244,99,74,0.35)] transition hover:scale-105"
              >
                Quiero la fidelización para mi negocio
              </a>
            </Reveal>
          </div>
        </section>

        {/* QUÉ PUEDEN HACER LOS CLIENTES */}
        <section className="border-t border-stone-900/10 py-24 sm:py-28 lg:py-32">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">
              Para tus clientes
            </p>
            <h2 className="mt-5 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
              Todo dentro del chat de tu negocio
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {funciones.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.1}>
                <div className="h-full rounded-[1.75rem] border border-stone-900/10 bg-white p-8 shadow-[0_20px_60px_rgba(28,25,23,0.08)]">
                  <span className="text-3xl font-black text-[#f4634a]/25">0{i + 1}</span>
                  <h3 className="mt-4 text-xl font-bold tracking-tight">{f.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{f.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="border-t border-stone-900/10 py-24 sm:py-28 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">
                Cómo funciona
              </p>
              <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Sin apps adicionales que instalar
              </h2>
              <p className="mt-6 text-lg leading-9 text-stone-600">
                El programa de fidelidad vive en el WhatsApp del negocio, el canal que sus
                clientes ya usan todos los días.
              </p>
            </Reveal>

            <div className="space-y-5">
              {pasos.map((p, i) => (
                <Reveal key={p.title} delay={i * 0.08}>
                  <div className="rounded-[1.75rem] border border-stone-900/10 bg-white p-7 shadow-[0_20px_60px_rgba(28,25,23,0.08)]">
                    <div className="flex gap-4">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f4634a]" />
                      <div>
                        <h3 className="text-lg font-bold tracking-tight">{p.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-stone-600">{p.description}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACTO */}
        <section className="border-t border-stone-900/10 py-24 sm:py-28 lg:py-32">
          <Reveal>
            <div className="flex flex-col items-start gap-8 rounded-[2rem] border border-stone-900/10 bg-white p-10 shadow-[0_20px_80px_rgba(28,25,23,0.1)] sm:p-14">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">
                  Desarrollado y operado por EL METACHO S.A.S.
                </p>
                <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                  ¿Tienes un negocio?
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
                  Escríbenos a{" "}
                  <a href="mailto:contacto@elmetacho.com" className="font-bold text-[#f4634a] hover:underline">
                    contacto@elmetacho.com
                  </a>{" "}
                  y te contamos cómo activar el programa de fidelización por WhatsApp.
                </p>
              </div>
              <a
                href={CONTACTO_MAILTO}
                className="rounded-full bg-[#f4634a] px-7 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(244,99,74,0.35)] transition hover:scale-105"
              >
                Escribir a contacto
              </a>
            </div>
          </Reveal>
        </section>

        <Footer />
      </div>
    </main>
  );
}
