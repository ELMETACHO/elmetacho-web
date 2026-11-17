import Link from "next/link";
import { MlabsHeader, MlabsFooter, MLABS_WHATSAPP } from "./MlabsMarco";
import FormularioLead from "./FormularioLead";
import Buscador from "./componentes/Buscador";
import Catalogo from "./componentes/Catalogo";
import TarjetaProducto from "./componentes/TarjetaProducto";
import { productosVisibles, publicos, novedadesRecientes, enlaceNovedad } from "./contenido/index.js";
import { modoTienda } from "./lib/tienda/tienda.js";
import { contenidoGuias } from "./contenido/recursos.js";

// Las guías salen de Redis (sin deploy) con ISR: la página se regenera cada 5 minutos o al guardar un recurso.
export const revalidate = 300;

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

export default async function Mlabs() {
  const { tarjetasGuias, indiceBusqueda } = await contenidoGuias();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "ProfessionalService", "@id": `${URL}/#mlabs`, name: "MLABS", url: URL, telephone: "+57 320 264 6716", email: "contacto@elmetacho.com", areaServed: "Latinoamérica", parentOrganization: { "@id": "https://www.elmetacho.com/#org" }, makesOffer: servicios.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.titulo, description: s.texto } })) },
      { "@type": "FAQPage", mainEntity: preguntas.map((p) => ({ "@type": "Question", name: p.q, acceptedAnswer: { "@type": "Answer", text: p.a } })) },
    ],
  };

  return (
    <main>
      <MlabsHeader />

      {/* PORTADA */}
      <section className="m-heroe">
        <div className="m-ancho">
          <div className="m-autor" style={{ marginBottom: 18 }}>
            <span className="m-avatar">LABS</span>
            <div><b>Metacho LABS</b><span>de El Metacho</span></div>
          </div>
          <h1>La IA que uso para mis videos y mi negocio, <span>lista para que la uses tú.</span></h1>
          <p>Guías gratis de cada reel de Metacho LABS y herramientas que se instalan en tu computador.</p>
          <div className="m-heroe-botones">
            <a href="#guias" className="m-boton m-boton-primario">Ver las guías gratis</a>
            <a href="#buscar" className="m-boton m-boton-borde">Comenté una palabra</a>
          </div>
          <div className="m-cifras">
            <div><b>+4 M</b><span>seguidores entre Facebook e Instagram</span></div>
            <div><b>10 años</b><span>creando contenido</span></div>
            <div><b>{tarjetasGuias.length}</b><span>guías gratis</span></div>
          </div>
        </div>
      </section>

      {/* CONFIANZA */}
      <section className="m-confianza" aria-label="Cómo funciona">
        <ul className="m-ancho">
          <li><i aria-hidden="true">✓</i><div><b>Gratis</b>solo con tu correo</div></li>
          <li><i aria-hidden="true">⚡</i><div><b>Al instante</b>se abre aquí mismo</div></li>
          <li><i aria-hidden="true">▶</i><div><b>De los reels</b>el material de cada video</div></li>
          <li><i aria-hidden="true">?</i><div><b>¿Dudas?</b><a href={MLABS_WHATSAPP} style={{ color: "inherit" }}>escríbenos por WhatsApp</a></div></li>
        </ul>
      </section>

      {/* GUÍAS */}
      <section id="guias" className="m-seccion" style={{ scrollMarginTop: 64 }}>
        <div className="m-ancho">
          <div className="m-titulo-seccion"><h2>Guías gratis</h2><Link href="/recursos">Ver todas</Link></div>
          <p className="m-intro">¿Viste un reel? Escribe la palabra que comentaste y se abre su guía.</p>
          <div id="buscar" style={{ scrollMarginTop: 80 }}>
            <Buscador indice={indiceBusqueda} id="buscar-inicio" />
          </div>
          <Catalogo guias={tarjetasGuias} publicos={publicos} max={6} />
        </div>
      </section>

      {/* PRODUCTOS */}
      <section id="productos" className="m-seccion" style={{ scrollMarginTop: 64 }}>
        <div className="m-ancho">
          <div className="m-titulo-seccion"><h2>Productos</h2></div>
          <p className="m-intro">Lo que usamos en Metacho LABS, listo para tu computador. Apártalo y te avisamos primero cuando abra.</p>
          <div className="m-rejilla">
            {productosVisibles(modoTienda(process.env)).map((p) => (
              <TarjetaProducto key={p.slug} producto={p} />
            ))}
          </div>
        </div>
      </section>

      {/* NOVEDADES */}
      {novedadesRecientes.length > 0 && (
        <section className="m-seccion">
          <div className="m-ancho">
            <div className="m-titulo-seccion"><h2>Novedades de IA</h2><Link href="/novedades">Ver todas</Link></div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {novedadesRecientes.slice(0, 3).map((n) => (
                <li key={n.slug}>
                  <Link href={enlaceNovedad(n)} className="m-boton m-boton-suave m-boton-ancho" style={{ justifyContent: "flex-start", textAlign: "left", borderRadius: 16, padding: "12px 16px" }}>
                    {n.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* AGENCIA */}
      <section id="agencia" className="m-seccion" style={{ paddingTop: 44 }}>
        <div className="m-ancho">
          <div className="m-oscuro" style={{ display: "grid", gap: 18 }}>
            <div>
              <h2 style={{ fontSize: 28, lineHeight: 1.15, letterSpacing: "-0.025em", margin: 0 }}>¿Prefieres que lo montemos para tu marca?</h2>
              <p style={{ margin: "10px 0 0" }}>
                Montamos para tu negocio los sistemas de IA con los que producimos nuestras propias cuentas: videos, edición, mensajes automáticos y fidelización.
              </p>
            </div>
            <div className="m-faq">
              {servicios.map((s) => (
                <details key={s.titulo} style={{ borderColor: "rgba(255,255,255,.18)" }}>
                  <summary>{s.titulo}</summary>
                  <p>
                    {s.texto}{" "}
                    {s.href && <a href={s.href} style={{ color: "#fff" }}>Ver el sistema de fidelización</a>}
                  </p>
                </details>
              ))}
            </div>
            <div style={{ display: "grid", gap: 10, maxWidth: 460 }}>
              <a href={MLABS_WHATSAPP} className="m-boton m-boton-primario">Escríbenos por WhatsApp</a>
              <a href="#contacto" className="m-boton m-boton-borde" style={{ color: "#fff" }}>Pedir una propuesta</a>
            </div>
          </div>
        </div>
      </section>

      {/* HECHOS CON ESTE SISTEMA */}
      <section className="m-seccion">
        <div className="m-ancho">
          <div className="m-titulo-seccion"><h2>Hechos con este sistema</h2></div>
          <p className="m-intro">Nuestras propias cuentas. Desliza para verlos.</p>
        </div>
        <ul className="m-ancho" style={{ display: "flex", gap: 12, overflowX: "auto", listStyle: "none", scrollSnapType: "x mandatory", scrollbarWidth: "none", paddingBottom: 8 }}>
          {muestras.map((m) => (
            <li key={m.video} style={{ width: "58vw", maxWidth: 240, flex: "none", scrollSnapAlign: "start" }}>
              <video src={`/videos/${m.video}.mp4`} poster={`/videos/${m.video}.jpg`} muted loop playsInline autoPlay preload="none" aria-label={`${m.cuenta}: ${m.tema}`} style={{ width: "100%", aspectRatio: "9 / 16", objectFit: "cover", borderRadius: 20, background: "#000" }} />
              <p style={{ margin: "8px 0 0", fontWeight: 650 }}>{m.cuenta}</p>
              <p className="m-meta" style={{ margin: 0 }}>{m.tema}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* CÓMO TRABAJAMOS */}
      <section className="m-seccion">
        <div className="m-ancho">
          <div className="m-titulo-seccion"><h2>Cómo trabajamos</h2></div>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {pasos.map((p, i) => (
              <li key={p.titulo} style={{ display: "flex", gap: 12, background: "var(--m-superficie)", borderRadius: 16, padding: 14 }}>
                <span className="m-avatar" style={{ width: 32, height: 32, background: "var(--m-rojo)", fontSize: 15 }}>{i + 1}</span>
                <div><b style={{ display: "block" }}>{p.titulo}</b><span className="m-meta" style={{ fontSize: 16 }}>{p.texto}</span></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="m-seccion" style={{ scrollMarginTop: 64 }}>
        <div className="m-ancho" style={{ display: "grid", gap: 18 }}>
          <div>
            <div className="m-titulo-seccion"><h2>Cuéntanos tu caso</h2></div>
            <p className="m-intro" style={{ margin: 0 }}>Te respondemos por WhatsApp con una propuesta y un precio cerrado.</p>
            <p style={{ marginTop: 12, fontSize: 16 }}>
              ¿Ya tienes tu cotización? <Link href="/pagar" style={{ color: "var(--m-rojo)", fontWeight: 650 }}>Págala aquí</Link>
            </p>
          </div>
          <div className="m-caja" style={{ marginTop: 0 }}>
            <FormularioLead origen="mlabs-inicio" boton="Quiero mi propuesta" />
          </div>
        </div>
      </section>

      {/* PREGUNTAS */}
      <section className="m-seccion">
        <div className="m-ancho m-faq">
          <div className="m-titulo-seccion"><h2>Preguntas</h2></div>
          {preguntas.map((p) => (
            <details key={p.q}>
              <summary>{p.q}</summary>
              <p>{p.a}</p>
            </details>
          ))}
        </div>
      </section>

      <MlabsFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
