// Página de venta del Pack Collage (Oscar, 20-nov): mucho recurso gráfico del mismo pack dentro de la pantalla de compra,
// títulos armados con las letras de revista, videos en bucle alrededor y los usos del pack. Los recursos son muestras
// livianas en /images/labs/collage (el pack completo se entrega después de pagar).
import Link from "next/link";
import Instructor from "./Instructor";

const R = "/images/labs/collage";

const LETRA = { "á": "a-tilde", "é": "e-tilde", "í": "i-tilde", "ó": "o-tilde", "ú": "u-tilde", "ñ": "enie", "¡": "exclamacion-abre", "!": "exclamacion-cierra", "¿": "pregunta-abre", "?": "pregunta-cierra", "#": "numeral", "@": "arroba" };
const archivoLetra = (c) => {
  const x = c.toLowerCase();
  if (LETRA[x]) return LETRA[x];
  return /[a-z0-9]/.test(x) ? x : null;
};

// Título con letras recortadas de revista. Cada letra usa una de sus 4 versiones y un giro leve distinto.
export function Letras({ texto, alto = 64, como: Etiqueta = "h2", className = "" }) {
  let n = 0;
  return (
    <Etiqueta className={`c-letras ${className}`} aria-label={texto} style={{ "--alto": `${alto}px` }}>
      {texto.split(" ").map((palabra, i) => (
        <span key={i} className="c-palabra" aria-hidden="true">
          {[...palabra].map((c, j) => {
            const a = archivoLetra(c);
            n += 1;
            if (!a) return <span key={j} className="c-letra-texto">{c}</span>;
            const v = ((n * 7) % 4) + 1;
            const giro = ((n * 37) % 13) - 6;
            // eslint-disable-next-line @next/next/no-img-element
            return <img key={j} src={`${R}/letras/${a}-${v}.webp`} alt="" style={{ transform: `rotate(${giro}deg)` }} loading="eager" />;
          })}
        </span>
      ))}
    </Etiqueta>
  );
}

function Pieza({ src, clase, ancho, giro = 0, demora = 0 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden="true" className={`c-pieza ${clase}`} style={{ width: ancho, "--giro": `${giro}deg`, animationDelay: `${demora}s` }} loading="lazy" />
  );
}

function Video({ nombre, clase = "" }) {
  return (
    <div className={`c-video ${clase}`}>
      <video src={`${R}/videos/${nombre}.mp4`} poster={`${R}/videos/${nombre}.webp`} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
    </div>
  );
}

const USOS = [
  { t: "Collages", s: "para redes, portadas y carruseles" },
  { t: "Impresión", s: "afiches, tarjetas, invitaciones y stickers" },
  { t: "Camisetas", s: "estampados y productos para vender" },
  { t: "Videos", s: "Reels, TikTok, YouTube y animaciones" },
  { t: "Obras de arte", s: "ilustración, cuadros y técnica mixta" },
  { t: "Material audiovisual", s: "acompaña clases, presentaciones y podcasts" },
];

const RECORTES = ["manos-001", "animales-006", "cielo-y-espacio-001", "comida-013", "objetos-012", "plantas-001", "tecnologia-015", "vehiculos-010", "edificios-006", "rostros-clasicos-018", "deportes-001", "cuerpo-016", "animales-001", "cielo-y-espacio-007", "objetos-001", "rostros-clasicos-001"];

export default function PaginaCollage({ p, caja, cajaMovil }) {
  return (
    <div className="c-pagina">
      {/* PORTADA */}
      <section className="c-heroe" style={{ backgroundImage: `url(${R}/fondos/fondo-06-papel-kraft.webp)` }}>
        <Pieza src={`${R}/recortes/cielo-y-espacio-001.webp`} clase="c-p1" ancho="clamp(90px,13vw,170px)" giro={-8} />
        <Pieza src={`${R}/recortes/rostros-clasicos-018.webp`} clase="c-p2" ancho="clamp(90px,12vw,160px)" giro={6} demora={0.6} />
        <Pieza src={`${R}/stickers/explosion-amarillo.webp`} clase="c-p3" ancho="clamp(70px,9vw,120px)" giro={12} demora={1.1} />
        <Pieza src={`${R}/recortes/manos-016.webp`} clase="c-p4" ancho="clamp(80px,11vw,150px)" giro={-14} demora={0.3} />
        <Pieza src={`${R}/stickers/globo-wow.webp`} clase="c-p5" ancho="clamp(70px,8vw,110px)" giro={-6} demora={1.4} />
        <Pieza src={`${R}/recortes/vehiculos-010.webp`} clase="c-p6" ancho="clamp(90px,12vw,160px)" giro={9} demora={0.9} />
        <div className="l-ancho c-heroe-ancho">
          <Video nombre="ejemplo-1-imagina" clase="c-video-izq" />
          <div className="c-heroe-texto">
            <p className="l-migas c-migas"><Link href="/">Inicio</Link> / <Link href="/#cursos">Cursos</Link> / {p.nombre}</p>
            <Letras texto="Pack Collage" como="h1" alto={78} />
            <p className="c-bajada">{p.promesa}</p>
            <div className="c-etiquetas">
              <span>311 recortes</span><span>192 letras</span><span>19 fondos</span><span>37 stickers</span>
            </div>
          </div>
          <Video nombre="ejemplo-2-crea" clase="c-video-der" />
        </div>
      </section>

      <div className="l-ancho l-pagina c-cuerpo">
        <div className="l-col">
          <div className="l-caja-compra l-solo-movil c-caja" style={{ position: "relative", backgroundImage: `url(${R}/fondos/fondo-04-papel-crema.webp)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${R}/stickers/globo-nuevo.webp`} alt="" aria-hidden="true" className="c-caja-sticker" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${R}/stickers/estrella-amarillo.webp`} alt="" aria-hidden="true" className="c-caja-sticker c-caja-sticker-2" />
            {cajaMovil}
          </div>

          {/* USOS */}
          <section className="c-bloque">
            <Letras texto="¡Sirve para todo!" alto={52} />
            <p className="c-intro">Úsalo en tus proyectos personales y en los que te dejan plata.</p>
            <ul className="c-usos">
              {USOS.map((u, i) => (
                <li key={u.t} style={{ "--giro": `${((i * 5) % 7) - 3}deg` }}><b>{u.t}</b><span>{u.s}</span></li>
              ))}
            </ul>
          </section>

          {/* MUESTRA DE RECORTES */}
          <section className="c-bloque c-muestra" style={{ backgroundImage: `url(${R}/fondos/fondo-11-periodico.webp)` }}>
            <Letras texto="Una probadita" alto={46} />
            <div className="c-rejilla">
              {RECORTES.map((r, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={r} src={`${R}/recortes/${r}.webp`} alt="" loading="lazy" style={{ transform: `rotate(${((i * 11) % 15) - 7}deg)` }} />
              ))}
            </div>
            <p className="c-nota">Son 16 de los 311. Vienen con borde blanco y sin borde, en 14 carpetas por tema.</p>
          </section>

          {/* LETRAS */}
          <section className="c-bloque c-letras-bloque" style={{ backgroundImage: `url(${R}/fondos/fondo-16-semitono-amarillo.webp)` }}>
            <div className="c-dos">
              <div>
                <Letras texto="Letras de revista" alto={44} />
                <p>Todo el abecedario, la ñ, las tildes, los números y los signos ¡¿?! en 4 versiones cada uno. Arma títulos, nombres y frases como si los recortaras tú.</p>
                <Letras texto="abcdeñ ¡hola! 2026" alto={40} como="div" className="c-alfabeto" />
              </div>
              <Video nombre="subtitulo-revista" clase="c-video-centro" />
            </div>
          </section>

          {/* FONDOS Y STICKERS */}
          <section className="c-bloque">
            <Letras texto="Fondos y stickers" alto={44} />
            <div className="c-fondos">
              {["fondo-04-papel-crema", "fondo-11-periodico", "fondo-02-papel-rojo", "fondo-16-semitono-amarillo", "fondo-06-papel-kraft"].map((f, i) => (
                <div key={f} style={{ backgroundImage: `url(${R}/fondos/${f}.webp)`, transform: `rotate(${((i * 3) % 5) - 2}deg)` }} />
              ))}
            </div>
            <div className="c-stickers">
              {["estrella-rojo", "globo-nuevo", "corazon-rojo", "rayo-azul", "globo-ojo", "carita-amarillo", "explosion-rojo", "globo-zas", "flecha-negro", "estrella-amarillo"].map((s, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={s} src={`${R}/stickers/${s}.webp`} alt="" loading="lazy" style={{ "--giro": `${((i * 9) % 17) - 8}deg`, animationDelay: `${(i % 5) * 0.4}s` }} />
              ))}
            </div>
          </section>

          {/* QUÉ TRAE */}
          <section className="c-bloque">
            <h2 className="c-h2">Qué trae el pack</h2>
            <ul className="c-trae">{p.queIncluye.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>

          <Instructor />

          <section className="l-bloque m-faq">
            <h2>Preguntas frecuentes</h2>
            <details>
              <summary>¿Puedo usarlo para vender cosas?</summary>
              <p>Sí. Puedes usarlo en proyectos personales y comerciales: collages, impresión, camisetas, videos, obras de arte y material audiovisual. Lo único que no se puede es revender o regalar el pack tal cual, como archivos sueltos.</p>
            </details>
            <details>
              <summary>Licencia y origen de los recortes</summary>
              <p>Todos los recortes vienen de fuentes de dominio público o con licencia CC0, y los fondos, letras y stickers son propios. El pack trae una lista con la licencia, la fuente y el autor de cada archivo. Algunos objetos antiguos pueden mostrar marcas: en publicidad, evita mostrar marcas ajenas.</p>
            </details>
            {p.faq.map((f) => (
              <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </section>
        </div>

        <aside className="l-caja-compra l-solo-ancho c-caja" style={{ flexDirection: "column", backgroundImage: `url(${R}/fondos/fondo-04-papel-crema.webp)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${R}/stickers/globo-nuevo.webp`} alt="" aria-hidden="true" className="c-caja-sticker" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${R}/stickers/estrella-amarillo.webp`} alt="" aria-hidden="true" className="c-caja-sticker c-caja-sticker-2" />
          {caja}
        </aside>
      </div>
    </div>
  );
}
