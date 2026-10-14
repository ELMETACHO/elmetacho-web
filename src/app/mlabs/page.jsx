import Link from "next/link";
import { MlabsHeader, MlabsFooter, MLABS_WHATSAPP } from "./MlabsMarco";
import FormularioLead from "./FormularioLead";
import CatalogoInicio from "./componentes/CatalogoInicio";

const URL = "https://mlabs.elmetacho.com";

export const metadata = {
  title: { absolute: "MLABS: videos con IA, mensajes automáticos y fidelización para tu marca" },
  description:
    "MLABS, la agencia de El Metacho. Montamos para tu marca videos animados con IA todos los días, edición de video a cámara, respuestas automáticas por DM y fidelización por WhatsApp. Colombia y Latinoamérica.",
  alternates: { canonical: URL },
  openGraph: { url: URL, siteName: "MLABS by El Metacho", locale: "es_CO", type: "website", images: [{ url: "/videos/gps.jpg", width: 540, height: 960 }] },
};

const servicios = [
  {
    titulo: "Videos animados con IA, todos los días",
    texto: "Escribimos el guion con datos verificados, generamos la voz, animamos y musicalizamos. Videos de 1:30 a 2:30 pensados para que la gente se quede hasta el final. Es el mismo sistema que hace Metacho Explora y Metacho Tips.",
    video: "everest",
  },
  {
    titulo: "Tú grabas, nosotros editamos",
    texto: "Grabas a cámara sin miedo a equivocarte. Cortamos silencios y repeticiones, ponemos subtítulos palabra por palabra y animaciones sobre tu voz.",
    video: "labs",
  },
  {
    titulo: "Comentario que se vuelve mensaje",
    texto: "Alguien comenta una palabra en tu video y le llega por DM tu guía, tu catálogo o tu link de pago. Con la API oficial de Instagram, sin bots ni contraseñas.",
  },
  {
    titulo: "Clientes que vuelven por WhatsApp",
    texto: "Puntos, canjes y avisos dentro del WhatsApp de tu negocio para que tus clientes regresen.",
    href: "https://www.elmetacho.com/fidelizacion",
  },
  {
    titulo: "IA en tu equipo desde la primera semana",
    texto: "Te dejamos los prompts, las reglas de tu marca y los flujos para que tu equipo use la IA en ventas, atención y contenido.",
  },
];

const muestras = [
  { video: "gato", cuenta: "Metacho Explora", tema: "Por qué un gato cae de pie" },
  { video: "gps", cuenta: "Metacho Tips", tema: "Cómo sabe tu celular dónde estás" },
  { video: "mentos", cuenta: "Metacho Tips", tema: "Mentos y Coca-Cola" },
  { video: "labs", cuenta: "Metacho Labs", tema: "Videos mientras duermo" },
];

const pasos = [
  { titulo: "Hablamos", texto: "Nos cuentas qué vendes, a quién y qué te quita más tiempo." },
  { titulo: "Lo armamos", texto: "Montamos el sistema con tu marca, tu tono y tus datos." },
  { titulo: "Lo operamos o te lo entregamos", texto: "Lo manejamos cada mes, o te lo dejamos funcionando con tu equipo." },
];

const preguntas = [
  { q: "¿Trabajan con negocios fuera de Colombia?", a: "Sí. Trabajamos por WhatsApp y videollamada con marcas de cualquier país de habla hispana." },
  { q: "¿Necesito saber de IA o de edición?", a: "No. Nosotros montamos el sistema. Si quieres que tu equipo lo maneje, te lo dejamos explicado paso a paso." },
  { q: "¿Los videos llevan mi marca y mi tono?", a: "Sí. Cada sistema se configura con tus colores, tu forma de hablar y las reglas de tu marca." },
  { q: "¿Cuánto cuesta?", a: "Depende de cuántos videos o sistemas necesites. Cuéntanos tu caso y te enviamos una propuesta con precio cerrado." },
  { q: "¿Las guías gratis tienen algún costo?", a: "No. Son el material de los videos de Metacho Labs y puedes usarlas en tu negocio." },
];

export default function Mlabs() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "ProfessionalService", "@id": `${URL}/#mlabs`, name: "MLABS", url: URL, telephone: "+57 320 264 6716", email: "contacto@elmetacho.com", areaServed: "Latinoamérica", parentOrganization: { "@id": "https://www.elmetacho.com/#org" }, makesOffer: servicios.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.titulo, description: s.texto } })) },
      { "@type": "FAQPage", mainEntity: preguntas.map((p) => ({ "@type": "Question", name: p.q, acceptedAnswer: { "@type": "Answer", text: p.a } })) },
    ],
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <MlabsHeader />
      <CatalogoInicio />

      {/* AGENCIA */}
      <section id="agencia" className="papel-cuad border-t border-black/10 px-4 pb-14 pt-14 sm:px-8 sm:pb-24 sm:pt-24">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.25fr_0.75fr] md:items-end">
          <div>
            <h2 className="titular-ancho text-[13vw] md:text-[6.4vw] xl:text-[6rem]">Tu marca publica todos los días.</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-gris">
              Sin que tú grabes todos los días. Montamos para tu negocio los sistemas de IA con los que producimos nuestras propias cuentas: videos, edición, mensajes automáticos y fidelización.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={MLABS_WHATSAPP} className="rounded-full bg-rojo px-7 py-4 text-center text-base font-bold text-white">
                Escríbenos por WhatsApp
              </a>
              <Link href="/recursos" className="rounded-full border-2 border-black px-7 py-4 text-center text-base font-bold">
                Ver guías gratis
              </Link>
            </div>
          </div>
          <video src="/videos/gps.mp4" poster="/videos/gps.jpg" autoPlay muted loop playsInline preload="none" aria-label="Ejemplo de video de Metacho Tips hecho con el sistema de MLABS" className="mx-auto w-60 rounded-[2rem] border-[6px] border-black shadow-[0_30px_70px_rgba(0,0,0,0.28)] sm:w-72" />
        </div>
      </section>

      {/* QUÉ MONTAMOS */}
      <section className="px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="titular-ancho text-5xl sm:text-7xl">Qué montamos</h2>
          <ul className="mt-10 border-t-2 border-black">
            {servicios.map((s) => (
              <li key={s.titulo} className="border-b border-black/15">
                <details className="group py-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-2xl font-black leading-tight sm:text-4xl">
                    {s.titulo}
                    <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-black text-2xl transition group-open:rotate-45 group-open:bg-rojo group-open:border-rojo group-open:text-white">+</span>
                  </summary>
                  <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
                    <p className="max-w-2xl text-lg leading-8 text-gris">
                      {s.texto}{" "}
                      {s.href && (
                        <a href={s.href} className="font-bold text-rojo underline underline-offset-4">
                          Ver el sistema de fidelización
                        </a>
                      )}
                    </p>
                    {s.video && <video src={`/videos/${s.video}.mp4`} poster={`/videos/${s.video}.jpg`} muted loop playsInline autoPlay preload="none" aria-hidden="true" className="w-40 rounded-2xl border-4 border-black" />}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* MUESTRAS */}
      <section className="bg-black py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <h2 className="titular-ancho text-5xl sm:text-7xl">Hechos con este sistema</h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-white/75">Nuestras propias cuentas. Desliza para verlos.</p>
        </div>
        <ul className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-8 [scrollbar-width:none]">
          {muestras.map((m) => (
            <li key={m.video} className="w-[62vw] max-w-[260px] shrink-0 snap-start">
              <video src={`/videos/${m.video}.mp4`} poster={`/videos/${m.video}.jpg`} muted loop playsInline autoPlay preload="none" aria-label={`${m.cuenta}: ${m.tema}`} className="aspect-[9/16] w-full rounded-[1.6rem] object-cover" />
              <p className="mt-3 font-bold">{m.cuenta}</p>
              <p className="text-sm text-white/70">{m.tema}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* CÓMO */}
      <section className="papel-cuad px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="titular-ancho text-5xl sm:text-7xl">Cómo trabajamos</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {pasos.map((p, i) => (
              <li key={p.titulo}>
                <span className="titular-ancho text-7xl text-rojo">{i + 1}</span>
                <h3 className="mt-2 text-2xl font-black">{p.titulo}</h3>
                <p className="mt-2 text-lg leading-7 text-gris">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="scroll-mt-20 px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2">
          <div>
            <h2 className="titular-ancho text-5xl sm:text-7xl">Cuéntanos tu caso</h2>
            <p className="mt-6 max-w-md text-lg leading-8 text-gris">Te respondemos por WhatsApp con una propuesta y un precio cerrado.</p>
            <a href={MLABS_WHATSAPP} className="mt-6 inline-block font-bold text-rojo underline underline-offset-4">
              Prefiero escribir ya por WhatsApp
            </a>
            <p className="mt-8 rounded-[1.25rem] border-2 border-black p-5 text-lg leading-7">
              ¿Ya tienes tu cotización?{" "}
              <Link href="/pagar" className="font-bold text-rojo underline underline-offset-4">
                Paga aquí con tarjeta o PSE
              </Link>
            </p>
          </div>
          <FormularioLead origen="mlabs-inicio" boton="Quiero mi propuesta" />
        </div>
      </section>

      {/* PREGUNTAS */}
      <section className="bg-black px-4 py-16 text-white sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="titular-ancho text-5xl sm:text-6xl">Preguntas</h2>
          <ul className="mt-8 border-t border-white/25">
            {preguntas.map((p) => (
              <li key={p.q} className="border-b border-white/25">
                <details className="group py-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-bold">
                    {p.q}
                    <span aria-hidden="true" className="text-2xl transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-lg leading-8 text-white/75">{p.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <MlabsFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
