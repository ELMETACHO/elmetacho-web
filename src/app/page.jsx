"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "./components/Navbar";
import SocialIcons from "./components/SocialIcons";
import Reveal from "./components/Reveal";
import ChatFab from "./components/ChatFab";
import Footer from "./components/Footer";

const PROPUESTA_MAILTO =
  "mailto:contacto@elmetacho.com?subject=Propuesta%20para%20El%20Metacho";
const LABS_MAILTO =
  "mailto:contacto@elmetacho.com?subject=Consulta%20para%20METACHO%20LABS";

const stats = [
  { value: "+10", label: "Años creando contenido" },
  { value: "+6M", label: "Seguidores combinados" },
  { value: "4", label: "Formatos propios de contenido" },
];

const fortalezas = [
  {
    title: "Dirección creativa",
    description: "Cada pieza nace de un concepto claro, no de la improvisación.",
  },
  {
    title: "Equipo de alta calidad",
    description: "Producción, edición y postproducción con estándar profesional.",
  },
  {
    title: "Creatividad constante",
    description: "Formatos propios que se renuevan para no perder relevancia.",
  },
];

const formatos = [
  {
    title: "Musicales",
    description:
      "Piezas basadas en música y tendencias sonoras, pensadas para conectar rápido y viajar por el algoritmo.",
  },
  {
    title: "Comentarios Cantados",
    description:
      "Reacciones y opiniones convertidas en canciones improvisadas: humor, ritmo y actualidad en un mismo formato.",
  },
  {
    title: "Sketch Situacional",
    description:
      "Historias y personajes cortos que retratan situaciones cotidianas con un toque cómico y muy compartible.",
  },
];

const servicios = [
  {
    title: "Creación de contenido con Inteligencia Artificial",
    description:
      "Producción profesional de piezas usando IA para escalar contenido sin perder calidad ni identidad de marca.",
  },
  {
    title: "Automatización de atención y comunidad",
    description:
      "Respuesta a comentarios y mensajes, seguimiento de leads y embudos de venta automatizados, para que ninguna oportunidad se pierda.",
  },
  {
    title: "Gestión de CRM y pipelines",
    description:
      "Organización y seguimiento de clientes y oportunidades en un solo lugar, con procesos claros para marcas en crecimiento.",
  },
  {
    title: "Estrategia y producción audiovisual",
    description:
      "Dirección creativa, guion y producción de video pensados para redes, con una narrativa clara de principio a fin.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#faf3e9] text-stone-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(244,99,74,0.12),_transparent_35%)] blur-3xl" />

      <Navbar />
      <ChatFab />

      <div className="relative mx-auto max-w-6xl px-6 pt-24 sm:px-8 lg:px-12">
        {/* HERO — El Metacho, influencer */}
        <section
          id="inicio"
          className="grid items-center gap-16 py-24 sm:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:py-36"
        >
          <div className="space-y-8">
            <Reveal>
              <span className="inline-flex rounded-full border border-[#f4634a]/30 bg-[#f4634a]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">
                Creador de contenido · Influencer
              </span>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="text-6xl font-black leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
                El
                <br />
                <span className="text-[#f4634a]">Metacho</span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="max-w-xl text-lg leading-8 text-stone-600 sm:text-xl">
                Más de 10 años creando contenido para redes sociales. Dirección
                creativa, producción audiovisual propia y formatos originales para
                conectar marcas con una audiencia real.
              </p>
            </Reveal>

            <Reveal delay={0.28}>
              <div className="flex flex-wrap gap-8">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-3xl font-black text-[#f4634a]">{s.value}</p>
                    <p className="text-xs uppercase tracking-[0.15em] text-stone-500">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.35}>
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <motion.a
                  href="#trabajemos"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  className="rounded-full bg-[#f4634a] px-7 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(244,99,74,0.35)]"
                >
                  Quiero trabajar contigo
                </motion.a>
                <Link
                  href="/fidelizacion"
                  className="rounded-full border border-[#f4634a]/40 px-7 py-3 text-sm font-bold uppercase tracking-wide text-[#f4634a] transition hover:bg-[#f4634a] hover:text-white"
                >
                  Conoce el sistema de fidelización
                </Link>
                <SocialIcons />
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="mx-auto w-full max-w-sm">
            <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-[2.5rem] border border-stone-900/10 shadow-[0_30px_100px_rgba(28,25,23,0.15)]">
              <Image
                src="/images/foto1.png"
                alt="El Metacho"
                fill
                sizes="(max-width: 640px) 90vw, 400px"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                priority
              />
            </div>
          </Reveal>
        </section>

        {/* SOBRE MI */}
        <section id="sobre-mi" className="border-t border-stone-900/10 py-24 sm:py-28 lg:py-32">
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <Reveal className="mx-auto w-full max-w-xs lg:mx-0">
              <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-stone-900/10 shadow-[0_20px_80px_rgba(28,25,23,0.15)]">
                <Image
                  src="/images/foto2.png"
                  alt="El Metacho creando contenido"
                  fill
                  sizes="(max-width: 640px) 80vw, 320px"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
              </div>
            </Reveal>

            <div>
              <Reveal delay={0.1}>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">
                  Sobre mí
                </p>
                <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                  Quién soy
                </h2>
                <p className="mt-8 text-lg leading-9 text-stone-600">
                  Soy El Metacho. Llevo más de 10 años creando contenido para redes
                  sociales, con experiencia en producción audiovisual, marketing digital
                  y generación de contenido apoyada en Inteligencia Artificial. Trabajo
                  con autenticidad, energía y narrativa limpia para conectar marcas con
                  su audiencia en Latinoamérica.
                </p>
              </Reveal>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {fortalezas.map((f, i) => (
                  <Reveal key={f.title} delay={i * 0.1}>
                    <div className="h-full rounded-2xl border border-stone-900/10 bg-white p-5 shadow-[0_10px_30px_rgba(28,25,23,0.06)]">
                      <h3 className="text-sm font-bold tracking-tight text-stone-900">
                        {f.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {f.description}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FORMATOS */}
        <section id="formatos" className="border-t border-stone-900/10 py-24 sm:py-28 lg:py-32">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">
              Formatos
            </p>
            <h2 className="mt-5 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
              Cómo cuento historias
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {formatos.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.1}>
                <div className="h-full rounded-[1.75rem] border border-stone-900/10 bg-white p-8 shadow-[0_20px_60px_rgba(28,25,23,0.08)]">
                  <span className="text-3xl font-black text-[#f4634a]/25">
                    0{i + 1}
                  </span>
                  <h3 className="mt-4 text-xl font-bold tracking-tight">{f.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-600">
                    {f.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CONTACTO — INFLUENCER */}
        <section
          id="trabajemos"
          className="border-t border-stone-900/10 py-24 sm:py-28 lg:py-32"
        >
          <Reveal>
            <div className="flex flex-col items-start gap-8 rounded-[2rem] border border-stone-900/10 bg-white p-10 shadow-[0_20px_80px_rgba(28,25,23,0.1)] sm:p-14">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">
                  Trabajemos juntos
                </p>
                <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                  ¿Quieres trabajar conmigo?
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
                  Si tienes una marca y quieres llegar a mi audiencia con contenido
                  real, cuéntame tu idea y armamos una propuesta a la medida.
                </p>
              </div>
              <motion.a
                href={PROPUESTA_MAILTO}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                className="rounded-full bg-[#f4634a] px-7 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(244,99,74,0.35)]"
              >
                Enviar propuesta
              </motion.a>
              <SocialIcons />
            </div>
          </Reveal>
        </section>

        {/* TRANSICIÓN A LA AGENCIA */}
        <section className="border-t border-stone-900/10 py-16 sm:py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">
                Hey, una cosa más
              </p>
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                También puedo gestionar tu marca
              </h2>
              <p className="mt-5 text-lg leading-8 text-stone-600">
                Además de crear contenido como El Metacho, dirijo METACHO LABS: un
                equipo que ayuda a marcas a producir, automatizar y crecer con
                estrategia. Te cuento cómo funciona.
              </p>
            </div>
          </Reveal>
        </section>

        {/* METACHO LABS */}
        <section
          id="metacho-labs"
          className="border-t border-stone-900/10 py-24 sm:py-28 lg:py-32"
        >
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="relative lg:sticky lg:top-28">
              <Reveal>
                <div className="group relative aspect-[3/4] w-full max-w-xs overflow-hidden rounded-[2rem] border border-stone-900/10 shadow-[0_20px_80px_rgba(28,25,23,0.15)]">
                  <Image
                    src="/images/foto3.png"
                    alt="METACHO LABS"
                    fill
                    sizes="(max-width: 640px) 80vw, 320px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">
                  METACHO LABS
                </p>
                <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                  Agencia de marketing, IA y creación de contenido
                </h2>
                <p className="mt-6 text-lg leading-9 text-stone-600">
                  Soy el dueño de METACHO LABS. Creamos contenido de alto impacto,
                  gestionamos comunidades y producimos piezas digitales para marcas que
                  quieren crecer con estilo y claridad.
                </p>
              </Reveal>
            </div>

            <div className="space-y-5">
              {servicios.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.08}>
                  <div className="rounded-[1.75rem] border border-stone-900/10 bg-white p-7 shadow-[0_20px_60px_rgba(28,25,23,0.08)]">
                    <div className="flex gap-4">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f4634a]" />
                      <div>
                        <h3 className="text-lg font-bold tracking-tight">{s.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-stone-600">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACTO — METACHO LABS */}
        <section
          id="contacto-labs"
          className="border-t border-stone-900/10 py-24 sm:py-28 lg:py-32"
        >
          <Reveal>
            <div className="flex flex-col items-start gap-8 rounded-[2rem] border border-stone-900/10 bg-white p-10 shadow-[0_20px_80px_rgba(28,25,23,0.1)] sm:p-14">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">
                  Contacta a METACHO LABS
                </p>
                <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                  Hablemos de tu marca
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
                  Cuéntanos qué necesita tu marca y te contactamos para revisar cómo
                  METACHO LABS puede ayudarte.
                </p>
              </div>
              <motion.a
                href={LABS_MAILTO}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                className="rounded-full bg-[#f4634a] px-7 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(244,99,74,0.35)]"
              >
                Escribir a METACHO LABS
              </motion.a>
            </div>
          </Reveal>
        </section>

        <Footer />
      </div>
    </main>
  );
}
