"use client";

// Vitrinas de producto (Oscar, 20-nov: «que las demás páginas tengan una visión dentro de la página construida con base
// al producto que se vende»). Cada producto muestra una escena animada de lo que hace: videos reales de las cuentas,
// el mapa del disco, el despertar nocturno, el juez, etc. Todo en bucle; con «reducir movimiento» queda quieto.
import { useEffect, useState } from "react";

const V = "/images/labs/vitrinas";
const C = "/images/labs/collage";

function useCiclo(n, ms) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => clearInterval(t);
  }, [n, ms]);
  return i;
}

function Contador({ desde, hasta, ms = 2600, formato = (x) => x, pausa = 1800 }) {
  const [v, setV] = useState(desde);
  useEffect(() => {
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf, inicio, esperando = null;
    if (quieto) { raf = requestAnimationFrame(() => setV(hasta)); return () => cancelAnimationFrame(raf); }
    const paso = (t) => {
      if (esperando) { if (t - esperando > pausa) { esperando = null; inicio = t; } raf = requestAnimationFrame(paso); return; }
      if (!inicio) inicio = t;
      const k = Math.min(1, (t - inicio) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setV(desde + (hasta - desde) * e);
      if (k >= 1) esperando = t;
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [desde, hasta, ms, pausa]);
  return <>{formato(v)}</>;
}

function Clip({ nombre, etiqueta, clase = "", giro = 0 }) {
  return (
    <figure className={`v-tel ${clase}`} style={{ "--giro": `${giro}deg` }}>
      <video src={`${V}/${nombre}.mp4`} poster={`${V}/${nombre}.webp`} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
      {etiqueta && <figcaption>{etiqueta}</figcaption>}
    </figure>
  );
}

/* ---------- Fábrica de Videos ---------- */
function Fabrica() {
  return (
    <div className="v-escena v-fabrica">
      <div className="v-fila-tel">
        <Clip nombre="fab-explora" etiqueta="Explora" giro={-5} />
        <Clip nombre="fab-tips" etiqueta="Tips" giro={2} />
        <Clip nombre="fab-sports" etiqueta="Sports" giro={-2} />
        <Clip nombre="fab-mapas" etiqueta="Mapas" giro={5} />
      </div>
      <div className="v-sello v-sello-juez">JUEZ · APROBADO 93</div>
      <div className="v-chip-abajo">«hazme un video de…» → listo en tu carpeta</div>
    </div>
  );
}

/* ---------- Kit Edita / Talking Head: línea de tiempo que se limpia ---------- */
const PALABRAS = ["Grabas", "una", "toma", "y", "Claude", "te", "la", "devuelve", "editada"];
function LineaTiempo() {
  return (
    <div className="v-linea" aria-hidden="true">
      {Array.from({ length: 22 }).map((_, i) => {
        const silencio = [3, 4, 9, 14, 15, 19].includes(i);
        return <i key={i} className={silencio ? "v-sil" : ""} style={{ "--h": `${20 + ((i * 37) % 70)}%`, animationDelay: `${i * 0.03}s` }} />;
      })}
    </div>
  );
}
function Subtitulo() {
  const i = useCiclo(PALABRAS.length + 3, 420);
  return (
    <p className="v-sub">
      {PALABRAS.map((p, k) => <span key={k} className={k === i ? "v-sub-activa" : k < i ? "v-sub-dicha" : ""}>{p} </span>)}
    </p>
  );
}
function Edita() {
  return (
    <div className="v-escena v-edita">
      <div className="v-editor">
        <Clip nombre="est-zoom" clase="v-tel-grande" />
        <div className="v-panel">
          <b>Tu video, editado</b>
          <LineaTiempo />
          <Subtitulo />
          <ul className="v-checks">
            <li style={{ animationDelay: ".3s" }}>Silencios fuera · <Contador desde={0} hasta={18} formato={(x) => `−${Math.round(x)} s`} /></li>
            <li style={{ animationDelay: ".7s" }}>Subtítulos palabra por palabra</li>
            <li style={{ animationDelay: "1.1s" }}>Look de color · zoom · vertical</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
function TalkingHead() {
  return (
    <div className="v-escena v-edita v-talking">
      <div className="v-editor">
        <Clip nombre="est-zoom" clase="v-tel-grande" />
        <div className="v-panel">
          <b>Tu toma, limpia</b>
          <ol className="v-tomas">
            <li className="v-tacha">Hoy te voy a… eh… hoy te voy a</li>
            <li className="v-tacha">Hoy te voy a mostrar cómo…</li>
            <li className="v-buena">Hoy te voy a mostrar cómo editar en un minuto.</li>
          </ol>
          <LineaTiempo />
          <Subtitulo />
          <div className="v-mini-chips"><span>Tropiezos fuera</span><span>Zoom a tu cara</span><span>Tu look</span></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Pack Subtítulos: la misma frase en 13 estilos ---------- */
const ESTILOS = ["caja", "rebote", "gigante", "maquina", "resaltador", "karaoke", "neon", "sticker", "serif", "detras", "arco", "documental", "revista"];
const NOMBRES = { caja: "Caja negra", rebote: "Rebote", gigante: "Clave gigante", maquina: "Máquina de escribir", resaltador: "Resaltador", karaoke: "Karaoke", neon: "Neón", sticker: "Sticker", serif: "Serif de revista", detras: "Detrás de ti", arco: "Arco", documental: "Documental", revista: "Recortes de revista" };
const LETRA = { "á": "a-tilde", "é": "e-tilde", "í": "i-tilde", "ó": "o-tilde", "ú": "u-tilde", "ñ": "enie", "¡": "exclamacion-abre", "!": "exclamacion-cierra" };
function Revista({ texto }) {
  let n = 0;
  return (
    <span className="v-revista">
      {texto.split(" ").map((w, i) => (
        <span key={i} className="v-revista-p">
          {[...w].map((c, j) => {
            const x = c.toLowerCase();
            const a = LETRA[x] ?? (/[a-z0-9]/.test(x) ? x : null);
            n += 1;
            // eslint-disable-next-line @next/next/no-img-element
            return a ? <img key={j} src={`${C}/letras/${a}-${(n % 4) + 1}.webp`} alt="" style={{ transform: `rotate(${((n * 37) % 13) - 6}deg)`, animationDelay: `${(n % 5) * 0.12}s` }} /> : null;
          })}
        </span>
      ))}
    </span>
  );
}
function Subtitulos() {
  const i = useCiclo(ESTILOS.length, 1700);
  const e = ESTILOS[i];
  return (
    <div className="v-escena v-subs">
      <div className="v-tel v-tel-subs" style={{ "--giro": "-2deg" }}>
        <div className="v-tel-fondo" style={{ backgroundImage: "url(/images/labs/heroe.webp)" }} />
        <div key={e} className={`v-frase v-e-${e}`}>
          {e === "revista" ? <Revista texto="¡esto es tuyo!" /> : <>esto es <em>tuyo</em></>}
        </div>
      </div>
      <div className="v-subs-lado">
        <span className="v-subs-n">{String(i + 1).padStart(2, "0")} / 13</span>
        <b key={e}>{NOMBRES[e]}</b>
        <div className="v-puntos">{ESTILOS.map((x, k) => <i key={x} className={k === i ? "on" : ""} />)}</div>
        <small>+ 25 tipografías libres para uso comercial</small>
      </div>
    </div>
  );
}

/* ---------- Studio · Estilos ---------- */
function Estilos() {
  return (
    <div className="v-escena v-estilos">
      <div className="v-fila-tel v-fila-5">
        <Clip nombre="est-popsky" etiqueta="Pop Sky" giro={-4} />
        <Clip nombre="est-trailer" etiqueta="Trailer Mode" giro={2} />
        <figure className="v-tel" style={{ "--giro": "-1deg" }}>
          <video src={`${C}/videos/ejemplo-2-crea.mp4`} poster={`${C}/videos/ejemplo-2-crea.webp`} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
          <figcaption>Street Collage</figcaption>
        </figure>
        <Clip nombre="est-zoom" etiqueta="Zoom Pack" giro={3} />
        <Clip nombre="est-cabezon" etiqueta="Cabezón" giro={-3} />
      </div>
      <div className="v-chip-abajo">La misma toma · 5 estilos · «edítalo en estilo Trailer»</div>
    </div>
  );
}

/* ---------- Radar Viral ---------- */
const IDEAS = [
  { t: "¿Por qué tu perro te sigue al baño?", x: "6,1×", j: 9 },
  { t: "El mito del pelo mojado", x: "5,4×", j: 9 },
  { t: "Lo que pasa si duermes con el celular", x: "4,8×", j: 8 },
];
function Radar() {
  return (
    <div className="v-escena v-radar">
      <div className="v-radar-disco" aria-hidden="true">
        <i className="v-barrido" />
        {[[30, 28], [64, 40], [44, 70], [72, 66], [24, 58]].map(([x, y], k) => <b key={k} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${k * 0.6}s` }} />)}
      </div>
      <div className="v-ideas">
        <small>Esta semana en tu nicho</small>
        {IDEAS.map((d, k) => (
          <div key={d.t} className="v-idea" style={{ animationDelay: `${0.3 + k * 0.5}s` }}>
            <span className="v-x">{d.x}</span>
            <p>{d.t}<small>más vistas de lo normal en su cuenta</small></p>
            <span className="v-juez">Juez {d.j}/10</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- PC en piloto automático ---------- */
const LOG = ["02:57  desperté (3 min antes de tu tarea)", "03:00  Claude trabajando: 4 videos", "03:41  Claude terminó", "03:42  suelto el PC · a dormir"];
function Piloto() {
  return (
    <div className="v-escena v-piloto">
      <div className="v-cielo" aria-hidden="true"><i className="v-luna" />{Array.from({ length: 14 }).map((_, k) => <s key={k} style={{ left: `${(k * 53) % 100}%`, top: `${(k * 29) % 55}%`, animationDelay: `${k * 0.3}s` }} />)}</div>
      <div className="v-pc">
        <div className="v-pantalla">
          <div className="v-reloj">02:57</div>
          <div className="v-log">{LOG.map((l, k) => <p key={l} style={{ animationDelay: `${0.8 + k * 0.7}s` }}>{l}</p>)}</div>
        </div>
        <div className="v-base" />
      </div>
      <div className="v-chip-abajo">Tu PC trabaja de noche y se vuelve a dormir solo</div>
    </div>
  );
}

/* ---------- PC Liviano ---------- */
const BLOQUES = [["Temporales", 15.7, "v"], ["Modelos de IA", 13.1, "a"], ["Juegos", 10.5, "a"], ["Caché navegador", 6.4, "v"], ["Cachés de programas", 5.8, "v"], ["Documentos", 4.2, "r"], ["Papelera", 0.6, "v"]];
function Liviano() {
  return (
    <div className="v-escena v-liviano">
      <div className="v-disco">
        <span>Disco C:</span>
        <div className="v-barra"><i /></div>
        <b>+<Contador desde={0} hasta={28} formato={(x) => Math.round(x)} /> GB libres</b>
      </div>
      <div className="v-mapa">
        {BLOQUES.map(([n, gb, t], k) => (
          <div key={n} className={`v-bloque v-b-${t}`} style={{ flexGrow: gb, animationDelay: `${0.4 + k * 0.25}s` }}>
            <b>{gb} GB</b><span>{n}</span>
          </div>
        ))}
      </div>
      <div className="v-chip-abajo">Verde se limpia · amarillo se revisa · rojo es tuyo</div>
    </div>
  );
}

/* ---------- Tu Equipo de Agentes ---------- */
const AGENTES = [
  { n: "Finanzas", e: "📊", r: ["Ventas de ayer: 12", "Alerta: 1 producto a pérdida"] },
  { n: "Marketing", e: "📣", r: ["Propuesta: 3 posts", "Mejor hora: 7 p. m."] },
  { n: "Director", e: "🧭", r: ["Prioridad 1: subir precio", "Prioridad 2: publicar a las 7"] },
];
function Agentes() {
  return (
    <div className="v-escena v-agentes">
      <div className="v-agentes-fila">
        {AGENTES.map((a, k) => (
          <div key={a.n} className="v-agente" style={{ animationDelay: `${k * 0.5}s` }}>
            <div className="v-agente-cab"><span aria-hidden="true">{a.e}</span><b>{a.n}</b></div>
            {a.r.map((r, j) => <p key={r} style={{ animationDelay: `${0.4 + k * 0.6 + j * 0.3}s` }}>{r}</p>)}
          </div>
        ))}
        <i className="v-sobre v-sobre-1" aria-hidden="true">✉</i>
        <i className="v-sobre v-sobre-2" aria-hidden="true">✉</i>
      </div>
      <div className="v-chip-abajo">Informe cada mañana · nada se gasta ni se publica sin ti</div>
    </div>
  );
}

/* ---------- SEO en Piloto Automático ---------- */
const SEO = [["Todas las páginas abren", 1], ["Títulos y descripciones", 1], ["Imágenes con texto", 0], ["Lo privado fuera de Google", 1], ["Buscadores avisados", 1]];
function Seo() {
  return (
    <div className="v-escena v-seo">
      <div className="v-navegador">
        <div className="v-nav-barra"><i /><i /><i /><span>informe de hoy · 2:00 p. m.</span></div>
        <ul>
          {SEO.map(([t, ok], k) => <li key={t} className={ok ? "ok" : "mal"} style={{ animationDelay: `${0.3 + k * 0.35}s` }}>{t}</li>)}
        </ul>
        <div className="v-arreglo">Arreglo listo: 3 imágenes sin texto <button type="button" tabIndex={-1}>Aprobar</button></div>
      </div>
    </div>
  );
}

/* ---------- Tienda Segura ---------- */
const SEGURA = ["Límite de intentos", "Sin cobros dobles", "Precio confirmado por el servidor", "Enlaces firmados", "Cabeceras de seguridad"];
function Segura() {
  return (
    <div className="v-escena v-segura">
      <div className="v-escudo" aria-hidden="true">🔒</div>
      <ul className="v-segura-lista">
        {SEGURA.map((t, k) => <li key={t} style={{ animationDelay: `${0.5 + k * 0.6}s` }}>{t}</li>)}
      </ul>
      <div className="v-bloqueo">Intentos bloqueados: <b><Contador desde={0} hasta={1000} formato={(x) => Math.round(x).toLocaleString("es-CO")} /></b></div>
    </div>
  );
}

/* ---------- Tienda Rápida ---------- */
function Rapida() {
  return (
    <div className="v-escena v-rapida">
      <div className="v-tel v-tel-tienda" style={{ "--giro": "-3deg" }}>
        <div className="v-carga"><i /></div>
        <div className="v-tienda">{Array.from({ length: 6 }).map((_, k) => <span key={k} style={{ animationDelay: `${0.3 + k * 0.15}s` }} />)}</div>
      </div>
      <div className="v-medida">
        <small>Peso al abrir</small>
        <b><Contador desde={41} hasta={2.2} ms={2200} formato={(x) => `${x.toFixed(1).replace(".", ",")} MB`} /></b>
        <span>Imágenes livianas, del tamaño justo y solo lo que se ve</span>
      </div>
    </div>
  );
}

/* ---------- Embajadores con Comisión ---------- */
const VENTAS = [["Ana", "$120.000"], ["Ana", "$89.000"], ["Ana", "$210.000"]];
function Embajadores() {
  return (
    <div className="v-escena v-emb">
      <div className="v-tel v-tel-panel" style={{ "--giro": "2deg" }}>
        <div className="v-emb-cab"><b>Hola, Ana 👋</b><small>tutienda.co/?ref=ana</small></div>
        <div className="v-emb-total"><small>Llevas ganado</small><b><Contador desde={0} hasta={41900} formato={(x) => `$${Math.round(x).toLocaleString("es-CO")}`} /></b></div>
        {VENTAS.map(([q, v], k) => <p key={k} style={{ animationDelay: `${0.6 + k * 0.7}s` }}>Venta por tu enlace <b>{v}</b></p>)}
      </div>
      <div className="v-emb-libro">
        <small>Libro de comisiones</small>
        <p>Ana · 3 ventas · <b>$41.900</b> <span>pendiente</span></p>
        <p>Luis · 1 venta · <b>$12.000</b> <span className="pagado">pagado</span></p>
      </div>
    </div>
  );
}

/* ---------- Corte Limpio: retomas, silencios y corte en J/L ---------- */
const TOMAS = [
  ["0:01", "Estás haciendo las cosas mal con tu… eh…", "x", "falso arranque"],
  ["0:05", "Estás haciendo las cosas mal con tu IA y ni siquiera lo sabías.", "ok", "último intento"],
  ["0:10", "Te explico porque seguram… no, otra vez.", "x", "retoma"],
  ["0:14", "Te explico, porque seguramente haces esto.", "ok", "último intento"],
];
function CorteLimpio() {
  const modo = useCiclo(2, 3200);
  return (
    <div className="v-escena v-corte">
      <div className="v-corte-izq">
        <small>Lo que dijiste</small>
        <ul className="v-corte-tomas">
          {TOMAS.map(([t, x, e, por], k) => (
            <li key={k} className={e === "x" ? "v-c-sale" : "v-c-queda"} style={{ animationDelay: `${0.3 + k * 0.45}s` }}>
              <span>{t}</span><p>{x}<em>{por}</em></p>
            </li>
          ))}
        </ul>
      </div>
      <div className="v-corte-der">
        <div className="v-corte-cifra"><b><Contador desde={164.8} hasta={55.7} ms={2600} formato={(v) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}`} /></b><span>de 2:45 a 0:56 · solo lo bueno</span></div>
        <LineaTiempo />
        <div className={`v-pistas ${modo ? "v-pistas-l" : ""}`} aria-hidden="true">
          <div className="v-pista"><i>V</i><span className="v-clip a" /><span className="v-clip b" /></div>
          <div className="v-pista v-pista-audio"><i>A</i><span className="v-clip a" /><span className="v-clip b" /></div>
        </div>
        <div className="v-corte-modo"><b>{modo ? "Corte en L" : "Corte en J"}</b><span>{modo ? "la imagen cambia primero, tu voz termina encima" : "tu voz entra un instante antes que la imagen"}</span></div>
      </div>
    </div>
  );
}

const ESCENAS = {
  "corte-limpio": CorteLimpio,
  "fabrica-de-videos": Fabrica,
  "edita-con-claude": Edita,
  "talking-head-pro": TalkingHead,
  "pack-subtitulos": Subtitulos,
  "studio-estilos": Estilos,
  "radar-viral": Radar,
  "pc-piloto-automatico": Piloto,
  "pc-liviano": Liviano,
  "equipo-de-agentes": Agentes,
  "seo-piloto-automatico": Seo,
  "tienda-segura": Segura,
  "tienda-rapida": Rapida,
  "embajadores-con-comision": Embajadores,
};
export default function Escena({ slug }) {
  const E = ESCENAS[slug];
  return E ? <E /> : null;
}
