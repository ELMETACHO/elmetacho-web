import Link from "next/link";
import { MlabsHeader, MlabsFooter, MLABS_WHATSAPP } from "./MlabsMarco";
import TarjetaCurso from "./componentes/TarjetaCurso";
import Carrusel from "./componentes/Carrusel";
import TarjetasRotan from "./componentes/TarjetasRotan";
import { productoPorSlug } from "./contenido/index.js";
import { contenidoGuias } from "./contenido/recursos.js";
import { CIFRAS, CURSOS, FOTOS, ORDEN_CURSOS, TARJETAS_HEROE, vistaRecurso } from "./contenido/academia.js";
import { formatoMoneda, modoTienda, sePuedeComprar } from "./lib/tienda/tienda.js";

// Rediseño «academia» (rama pruebas): estructura tipo converzzo.com en rojo, blanco y negro.
export const revalidate = 300;

const URL = "https://mlabs.elmetacho.com";
export const metadata = {
  title: { absolute: "MetachoLABS: aprende a usar la IA como la uso yo" },
  description: "Cursos, herramientas y recursos gratis para crear contenido y vender más con Claude, ChatGPT, Gemini y más.",
  alternates: { canonical: URL },
  openGraph: { url: URL, siteName: "MetachoLABS", locale: "es_CO", type: "website", images: [{ url: "/images/labs/heroe.webp", width: 1400, height: 1400 }] },
};

// Tarjeta de cada curso de pago: precio si la tienda está encendida; si no, «Muy pronto».
function datosCurso(slug, modo) {
  const p = productoPorSlug(slug);
  const v = CURSOS[slug];
  if (!p || !v) return null;
  const esAhorra = slug === "ahorra-50";
  const comprable = sePuedeComprar(p, modo);
  const desde = !comprable && p.planes?.length ? Math.min(...p.planes.map((x) => x.lanzamiento ?? x.COP)) : null;
  return {
    slug,
    href: v.slugPagina ?? `/productos/${slug}`,
    vista: { foto: v.foto, tapa: v.tapa, tono: v.tono, categoria: v.categoria },
    titulo: v.titulo ?? p.nombre,
    resumen: p.promesa,
    chips: [{ texto: v.categoria, clase: "l-chip-rojo" }, { texto: v.nivel }],
    precio: esAhorra || comprable ? formatoMoneda(p.precios.COP, "COP") : desde ? `Desde ${formatoMoneda(desde, "COP")}` : "Muy pronto",
    nota: esAhorra ? "50 archivos · los 3 primeros gratis" : comprable ? `o ${formatoMoneda(p.precios.USD, "USD")}` : desde ? "Precio de lanzamiento · pago único" : "Apártalo gratis",
    boton: esAhorra ? "Probar gratis" : "Ver curso",
  };
}

export default async function Inicio() {
  const { guias } = await contenidoGuias();
  const modo = modoTienda(process.env);
  const cursos = ORDEN_CURSOS.map((s) => datosCurso(s, modo)).filter(Boolean);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "MetachoLABS",
    url: URL,
    founder: { "@type": "Person", name: "El Metacho", url: "https://www.elmetacho.com" },
  };

  return (
    <main>
      <MlabsHeader />

      {/* PORTADA */}
      <section className="l-heroe">
        <div className="l-ancho">
          <div>
            <h1 className="l-sube">Aprende a usar la IA <span>como la uso yo.</span></h1>
            <p className="l-sub l-sube l-sube-2">Cursos cortos y herramientas para crear contenido y vender más con Claude, ChatGPT, Gemini y más.</p>
            <div className="l-botones l-sube l-sube-3">
              <a href="#cursos" className="l-btn l-btn-blanco">Ver los cursos →</a>
              <a href="#gratis" className="l-btn l-btn-borde">Recursos gratis</a>
            </div>
            <small>Nuevos recursos cada semana</small>
          </div>
          <div className="l-escena" aria-hidden="true">
            <div className="l-foto" style={{ backgroundImage: `url(${FOTOS.heroe})` }} />
            <TarjetasRotan items={TARJETAS_HEROE} />
            <div className="l-cifras">
              {CIFRAS.map((c) => (
                <div key={c.valor}><b>{c.valor}</b><span>{c.texto}</span></div>
              ))}
              <div><b>{guias.length}</b><span>recursos gratis</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* GARANTÍAS */}
      <section className="l-garantias" aria-label="Cómo aprendes">
        <ul className="l-ancho">
          <li><i aria-hidden="true">◷</i><div><b>A tu ritmo</b><small>Desde el celular o el PC</small></div></li>
          <li><i aria-hidden="true">✓</i><div><b>Gratis para empezar</b><small>{guias.length} recursos sin pagar</small></div></li>
          <li><i aria-hidden="true">★</i><div><b>Probado en mis cuentas</b><small>Lo que uso todos los días</small></div></li>
          <li><i aria-hidden="true">✆</i><div><b>Soporte humano</b><small>Te respondemos por WhatsApp</small></div></li>
        </ul>
      </section>

      {/* CURSOS */}
      <section id="cursos" className="l-seccion" style={{ scrollMarginTop: 70 }}>
        <div className="l-ancho">
          <div className="l-cabeza">
            <div>
              <h2>Nuestros cursos</h2>
              <p>Herramientas y cursos para aplicar hoy mismo.</p>
            </div>
          </div>
          <div className="l-rejilla-2">
            {cursos.map((c) => <TarjetaCurso key={c.slug} {...c} />)}
          </div>
        </div>
      </section>

      {/* RECURSOS GRATIS */}
      <section id="gratis" className="l-seccion" style={{ scrollMarginTop: 70, paddingBottom: 40 }}>
        <div className="l-ancho">
          <Carrusel
            titulo="Recursos gratis"
            intro="Guías cortas para usar la IA hoy mismo."
            accion={<Link href="/recursos" className="l-btn l-btn-suave" style={{ minHeight: 44 }}>Ver todos</Link>}
          >
            {guias.map((g, i) => (
              <TarjetaCurso
                key={g.slug}
                href={`/recursos/${g.slug}`}
                vista={vistaRecurso(g, i)}
                titulo={g.titulo}
                resumen={g.resumen}
                chips={[{ texto: "Gratis", clase: "l-chip-verde" }, { texto: `${g.tiempo} min` }]}
                precio="Gratis"
                nota="Con tu correo"
                boton="Ver"
              />
            ))}
          </Carrusel>
        </div>
      </section>

      {/* ASÍ DE FÁCIL */}
      <section className="l-oscuro">
        <div className="l-ancho">
          <h2>Así de fácil es empezar</h2>
          <ol className="l-pasos">
            <li data-n="1"><i>1</i><b>Elige</b><span>Busca el curso o el recurso gratis que necesitas.</span></li>
            <li data-n="2"><i>2</i><b>Aprende</b><span>Lecciones cortas, desde el celular o el computador.</span></li>
            <li data-n="3"><i>3</i><b>Aplícalo</b><span>Úsalo en tu contenido o tu negocio ese mismo día.</span></li>
          </ol>
        </div>
      </section>

      {/* QUIÉN ESTÁ DETRÁS */}
      <section className="l-seccion">
        <div className="l-ancho">
          <div className="l-instructor">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FOTOS.espalda} alt="Oscar, El Metacho" loading="lazy" />
            <div>
              <h2>Lo que enseño, lo uso.</h2>
              <p>Soy Oscar, El Metacho. Hago contenido hace 10 años y uso la IA todos los días en mis cuentas y mis negocios.</p>
              <ul>
                <li>+4 M de seguidores entre Facebook e Instagram</li>
                <li>Metacho Explora y Metacho Tips, hechas con IA</li>
                <li>Sellame, mi app de fidelización para negocios</li>
              </ul>
              <a href={MLABS_WHATSAPP} className="l-btn l-btn-rojo">Escríbeme por WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      {/* CIERRE */}
      <section className="l-cierre">
        <div className="l-ancho">
          <h2>¿Listo para empezar?</h2>
          <p>Elige un recurso gratis y aplícalo hoy.</p>
          <div className="l-botones" style={{ justifyContent: "center" }}>
            <a href="#gratis" className="l-btn l-btn-rojo">Ver recursos gratis →</a>
            <a href={MLABS_WHATSAPP} className="l-btn l-btn-suave">Que lo monten por mí</a>
          </div>
        </div>
      </section>

      <MlabsFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
