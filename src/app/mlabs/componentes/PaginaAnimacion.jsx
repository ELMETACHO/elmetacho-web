"use client";

// Páginas de los packs de animación (Multiverso, Caja de Motion y el combo). Muestran las animaciones reales del pack
// en bucle; los videos solo corren cuando se ven en pantalla para no gastar datos en el celular.
import { useEffect, useRef, useState } from "react";

const A = "/images/labs/animacion";

export const MULTIVERSO = [
  ["01-holograma", "Holograma", "#00e5ff"], ["02-neon-nocturno", "Neón nocturno", "#ff2bd6"], ["03-papel-recortado", "Papel recortado", "#e8c38a"],
  ["04-maqueta-isometrica", "Maqueta isométrica", "#b59cff"], ["05-plano-tecnico", "Plano técnico", "#3b7bff"], ["06-vision-termica", "Visión térmica", "#ff7a00"],
  ["07-pixel-8bit", "Pixel 8-bit", "#ffd400"], ["08-tiza-pizarron", "Tiza en pizarrón", "#3f8f5a"], ["09-acuarela", "Acuarela", "#ff8f8f"], ["10-plastilina", "Plastilina", "#ffb02e"],
];
export const CAJA = [
  "Ruta Trazada", "Portada", "Tablero Giratorio", "Ciudad de Barras", "Globo Conectado", "Curva que Dispara", "Pila que Crece", "Calendario Tachado",
  "Golpe de Texto", "Grilla Suiza", "Ticket que Imprime", "Garabato", "Antes y Después", "Iceberg", "Curvas de Nivel", "Paisaje de Tinta",
  "Pantalla que Abre", "Lluvia de Notificaciones", "Flujo Isométrico", "Red de Nodos", "Partículas que Forman", "Vitrina Giratoria", "Terminal que Escribe", "Reloj Neón",
];
const archivoCaja = (n, i) => `${String(i + 1).padStart(2, "0")}-${n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-")}`;

// Video que solo se reproduce cuando está a la vista.
function VideoVisible({ src, poster, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !quieto) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.15 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} className={className} src={src} poster={poster} muted loop playsInline preload="none" aria-hidden="true" />;
}

function Muestrario() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % 10), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="a-muestrario">
      <div className="a-tel a-tel-grande">
        <VideoVisible src={`${A}/multiverso-muestrario.mp4`} poster={`${A}/multiverso-muestrario.webp`} />
      </div>
      <ol className="a-lista">
        {MULTIVERSO.map(([, n, c], k) => (
          <li key={n} className={k === i ? "on" : ""} style={{ "--c": c }}><span>{String(k + 1).padStart(2, "0")}</span>{n}</li>
        ))}
      </ol>
      <div className="a-barra">{MULTIVERSO.map(([, n, c], k) => <i key={n} className={k === i ? "on" : ""} style={{ background: c }} />)}</div>
    </div>
  );
}

function RejillaMultiverso() {
  return (
    <div className="a-rejilla a-rejilla-10">
      {MULTIVERSO.map(([f, n, c]) => (
        <figure key={f} className="a-pieza" style={{ "--c": c }}>
          <div className="a-tel"><VideoVisible src={`${A}/estilos/${f}.mp4`} poster={`${A}/estilos/${f}.webp`} /></div>
          <figcaption>{n}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function RejillaCaja({ max = 24 }) {
  return (
    <div className="a-rejilla">
      {CAJA.slice(0, max).map((n, i) => {
        const f = archivoCaja(n, i);
        return (
          <figure key={f} className="a-pieza">
            <div className="a-tel"><VideoVisible src={`${A}/cortas/${f}.mp4`} poster={`${A}/cortas/${f}.webp`} /></div>
            <figcaption><b>{String(i + 1).padStart(2, "0")}</b> {n}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

// Muro de la portada de la Caja: filas que se deslizan con las 24 animaciones.
function Muro() {
  const filas = [CAJA.slice(0, 8), CAJA.slice(8, 16), CAJA.slice(16, 24)];
  return (
    <div className="a-muro" aria-hidden="true">
      {filas.map((fila, k) => (
        <div key={k} className={`a-muro-fila ${k % 2 ? "a-muro-inversa" : ""}`}>
          {[...fila, ...fila].map((n, j) => {
            const i = CAJA.indexOf(n);
            const f = archivoCaja(n, i);
            // eslint-disable-next-line @next/next/no-img-element
            return <img key={j} src={`${A}/cortas/${f}.webp`} alt="" loading="lazy" />;
          })}
        </div>
      ))}
    </div>
  );
}

export default function PaginaAnimacion({ p, caja, cajaMovil, migas }) {
  const esMulti = p.slug === "pack-multiverso";
  const esCaja = p.slug === "caja-de-motion";
  const esCombo = p.slug === "estudio-animacion";
  return (
    <div className="a-pagina">
      <section className={`a-heroe ${esCaja ? "a-heroe-caja" : ""}`}>
        {(esCaja || esCombo) && <Muro />}
        <div className="l-ancho a-heroe-ancho">
          <div className="a-heroe-texto">
            {migas}
            <span className="a-kicker">{esMulti ? "1 escena · 10 estilos" : esCaja ? "24 animaciones con tus datos" : "Los 2 packs"}</span>
            <h1>{esMulti ? <>Tu idea en <em>10 estilos</em> de animación.</> : esCaja ? <>24 animaciones que hacen ver tu video <em>caro.</em></> : <>Gráficos de agencia, <em>hechos por ti.</em></>}</h1>
            <p>{p.promesa}</p>
            <div className="a-pasos">
              <span><b>1</b>Pegas un texto en Claude</span>
              <span><b>2</b>Le dices tu tema</span>
              <span><b>3</b>Sale el video</span>
            </div>
          </div>
          {(esMulti || esCombo) && <Muestrario />}
        </div>
      </section>

      <div className="l-ancho l-pagina a-cuerpo">
        <div className="l-col">
          <div className="l-caja-compra l-solo-movil a-caja" style={{ position: "static" }}>{cajaMovil}</div>

          {(esMulti || esCombo) && (
            <section className="a-bloque">
              <h2>Los 10 estilos del Multiverso</h2>
              <p className="a-intro">La misma historia (presentación, cuenta regresiva, acción y remate) se adapta a tu tema. Tú eliges el mundo.</p>
              <RejillaMultiverso />
            </section>
          )}

          {(esCaja || esCombo) && (
            <section className="a-bloque">
              <h2>Las 24 de la Caja de Motion</h2>
              <p className="a-intro">Mapas, cifras, titulares, pantallas y partículas. Cuatro segundos verticales con tus textos, tus números y tus colores, para pegar en tu edición.</p>
              <RejillaCaja />
            </section>
          )}

          <section className="a-bloque a-oscuro">
            <h2>Qué recibes</h2>
            <ul className="a-trae">{p.queIncluye.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>

          <section className="a-bloque">
            <h2>Para quién es</h2>
            <ul className="a-para">{p.paraQuien.map((x) => <li key={x}>{x}</li>)}</ul>
            <details className="a-no"><summary>Lo que no hace (te lo decimos antes de que pagues)</summary><ul>{p.noEsPara.map((x) => <li key={x}>{x}</li>)}</ul></details>
          </section>

          <section className="l-bloque m-faq">
            <h2>Preguntas frecuentes</h2>
            {p.faq.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
          </section>
        </div>
        <aside className="l-caja-compra l-solo-ancho a-caja" style={{ flexDirection: "column" }}>{caja}</aside>
      </div>
    </div>
  );
}
