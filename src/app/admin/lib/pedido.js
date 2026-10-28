// Pedido de cantados armado en /admin. Spec admin §5.
import { validarTramos } from "./tramos.js";

export const ESTILOS = ["Salsa, merengue", "Salsa", "Merengue"];
export const HORAS_BORRADOR = 48;
export const MAX_PANTALLAZOS = 40;

// Resto del pathname (tras `cantados/<id>/`) permitido por cada ranura.
const PATRON = {
  original: /^original\.[a-z0-9]{2,5}$/,
  gancho: /^gancho\.[a-z0-9]{2,5}$/,
  pantallazo: /^p\d{2}\.[a-z0-9]{2,5}$/,
  publicado: /^publicado\.[a-z0-9]{2,5}$/,   // remix: el video ya publicado del que salen los comentarios
};

export const prefijo = (id) => `cantados/${id}/`;
export function nuevoId(fecha, azar) {
  const d = fecha.toISOString().slice(0, 10).replaceAll("-", "");
  return `c_${d}_${azar}`;
}
export const TIPOS = ["pantallazos", "link", "remix"];
export const TIPOS_DISPONIBLES = ["pantallazos", "link", "remix"];
export const EN_EL_PC = ["en_pc", "en_revision", "aprobado"];   // el PC ya tiene el proyecto: no se cancela desde la web
const LINK = /^https:\/\/(www\.|vm\.|vt\.)tiktok\.com\/\S+$/;
// Reels de Instagram (la misma regla que el PC en Python): /reel/, /reels/, /p/ o /tv/ + código, con /<usuario>/ delante
// opcional, barra final opcional y query opcional (?igsh=… es rastreo). Perfiles y stories no sirven.
const LINK_IG = /^https:\/\/(?:www\.|m\.)?instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]+)\/?(?:\?\S*)?$/;
const MAX_LINK = 300;
export const MSG_LINK = "El link debe ser de TikTok (https://www.tiktok.com/…, https://vm.tiktok.com/… o https://vt.tiktok.com/…) "
  + "o de un reel de Instagram (https://www.instagram.com/reel/…).";
export const tipoDe = (p) => p.tipo || "pantallazos";      // pedidos de la fase 1 no traen tipo
export const esCabina = (p) => Boolean(p) && tipoDe(p) === "cabina";   // candidatos del sondeo (spec cabina §4)
// Destino (spec stories 2026-10-22 §6): las stories de Facebook van en su propia sección. Sin campo = reel.
export const DESTINOS = ["reel", "story"];
// Oscar (2026-10-22): la story es una opción más de «Nuevo video» con la misma estructura de «con pantallazos».
export const TIPOS_STORY = ["pantallazos"];
export const destinoDe = (p) => (p.destino === "story" ? "story" : "reel");
export const pedidoDeOpcion = (opcion) =>
  opcion === "story" ? { tipo: "pantallazos", destino: "story" } : { tipo: opcion, destino: "reel" };
const linkIg = (t) => t.match(LINK_IG);
export const linkValido = (x) => {
  if (typeof x !== "string") return false;
  const t = x.trim();
  return t.length <= MAX_LINK && (LINK.test(t) || Boolean(linkIg(t)));
};
// Forma en que se guarda el link: TikTok tal cual (sin espacios); Instagram canónico y sin query. null si no es válido.
export function normalizarLink(x) {
  if (!linkValido(x)) return null;
  const t = x.trim(), ig = linkIg(t);
  if (!ig) return t;
  return `https://www.instagram.com/${ig[1] === "p" ? "p" : "reel"}/${ig[2]}/`;
}
export const nuevoPedido = (id, creado, tipo = "pantallazos", destino = "reel") => ({
  id, creado, tipo, destino, estado: "subiendo", titulo: null, estilo: ESTILOS[0], tramos: [],
  original: null, gancho: null, pantallazos: [], link: null, publicado: null, motivo: null,
});

// Número finito >= 0, o undefined si el campo no viene. Otro valor = inválido (null).
function medida(x, obligatorio) {
  if (x === undefined || x === null) return obligatorio ? null : undefined;
  const n = Number(x);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function archivoValido(id, a, patron) {
  if (!a || typeof a.pathname !== "string") return null;
  const pre = prefijo(id);
  if (!a.pathname.startsWith(pre)) return null;
  if (!patron.test(a.pathname.slice(pre.length))) return null;
  const tamano = medida(a.tamano, true);
  const duracion = medida(a.duracion, false), ancho = medida(a.ancho, false), alto = medida(a.alto, false);
  if (tamano === null || !Number.isInteger(tamano) || [duracion, ancho, alto].includes(null)) return null;
  return { pathname: a.pathname, tamano, duracion, ancho, alto,
           nombre: typeof a.nombre === "string" ? a.nombre.slice(0, 120) : undefined };
}

const CAMPOS_CABINA = ["tramos", "destino", "gancho"];

export function aplicarCambios(p, c) {
  if (!c || typeof c !== "object" || Array.isArray(c)) return { pedido: p, errores: ["Datos inválidos."] };
  if (esCabina(p)) {
    // Spec cabina §4: Oscar solo marca tramos, escoge destino y sube su gancho, y solo mientras está en revisión.
    if (p.estado !== "en_revision") return { pedido: p, errores: ["Este candidato ya no está en la Cabina."] };
    if (Object.keys(c).some((k) => !CAMPOS_CABINA.includes(k)))
      return { pedido: p, errores: ["En la Cabina solo se cambian los tramos, el destino y el gancho."] };
  } else if (p.estado === "necesita_pantallazos") {
    if (p.pantallazos_listos) return { pedido: p, errores: ["Ya enviaste los pantallazos."] };
    if (Object.keys(c).some((k) => k !== "pantallazos")) return { pedido: p, errores: ["En este pedido solo se pueden subir pantallazos."] };
  } else if (p.estado !== "subiendo") return { pedido: p, errores: ["Este pedido ya se envió; cancélalo y súbelo de nuevo."] };
  const out = { ...p }, errores = [];
  if ("destino" in c) {
    if (!esCabina(p)) errores.push("El destino se escoge al crear el pedido.");
    else if (DESTINOS.includes(c.destino)) out.destino = c.destino;
    else errores.push("Destino no válido.");
  }
  if ("titulo" in c) out.titulo = typeof c.titulo === "string" && c.titulo.trim() ? c.titulo.trim().slice(0, 200) : null;
  if ("estilo" in c) ESTILOS.includes(c.estilo) ? (out.estilo = c.estilo) : errores.push("Estilo no válido.");
  for (const campo of ["original", "gancho", "publicado"]) {
    if (campo in c) {
      if (campo === "publicado" && tipoDe(p) !== "remix") {
        errores.push("Este pedido no lleva video publicado.");
        continue;
      }
      const a = archivoValido(p.id, c[campo], PATRON[campo]);
      a ? (out[campo] = a) : errores.push(`El archivo de ${campo} no es de este pedido.`);
    }
  }
  if ("link" in c) {
    if (tipoDe(p) === "pantallazos") errores.push("Este pedido no lleva link.");
    else if (linkValido(c.link)) out.link = normalizarLink(c.link);
    else errores.push(MSG_LINK);
  }
  if ("pantallazos" in c) {
    if (tipoDe(p) !== "pantallazos" && p.estado !== "necesita_pantallazos") errores.push("Este pedido no lleva pantallazos.");
    else {
      const lista = Array.isArray(c.pantallazos)
        ? c.pantallazos.slice(0, MAX_PANTALLAZOS).map((a) => archivoValido(p.id, a, PATRON.pantallazo))
        : [null];
      lista.every(Boolean) ? (out.pantallazos = lista) : errores.push("Hay un archivo de pantallazo que no es de este pedido.");
    }
  }
  if ("tramos" in c) {
    const r = validarTramos(c.tramos, esCabina(p) ? p.vista_previa?.duracion : out.original?.duracion);
    r.errores.length ? errores.push(...r.errores) : (out.tramos = r.tramos);
  }
  return { pedido: errores.length ? p : out, errores };
}

export function erroresParaEnviar(p) {
  const tipo = tipoDe(p);
  if (!TIPOS_DISPONIBLES.includes(tipo)) return ["Ese tipo de pedido todavía no está disponible."];
  const e = [];
  if (!(p.original?.tamano > 0)) e.push("Falta el video original.");
  if (!p.tramos?.length) e.push("Falta marcar el bucle.");
  if (!(p.gancho?.tamano > 0)) e.push("Falta tu gancho.");
  if (tipo !== "pantallazos" && !linkValido(p.link)) e.push("Falta el link de TikTok o Instagram.");
  if (tipo === "remix" && !(p.publicado?.tamano > 0)) e.push("Falta tu video ya publicado.");
  if (tipo === "pantallazos" && (!p.pantallazos?.length || !p.pantallazos.every((a) => a.tamano > 0))) e.push("Faltan los pantallazos.");
  return e;
}
export const archivos = (p) => [p.original, p.gancho, p.publicado, ...(p.pantallazos || [])].filter(Boolean).map((a) => a.pathname);
export const borradorVencido = (p, ahoraMs) =>
  p.estado === "subiendo" && ahoraMs - Date.parse(p.creado) > HORAS_BORRADOR * 3600e3;
export const nombreVisible = (p) => p.titulo || p.original?.nombre || p.id;

const PRIORIDAD = { en_revision: 0, necesita_pantallazos: 1 };   // lo que espera a Oscar va arriba
export const ordenarLista = (lista) => [...lista].sort((a, b) => (PRIORIDAD[a.estado] ?? 2) - (PRIORIDAD[b.estado] ?? 2));

// ¿Puede el navegador subir este archivo? En subiendo, cualquiera de su carpeta; en necesita_pantallazos, solo pNN;
// en un candidato de la Cabina, solo su gancho y solo en revisión (la vista y los medios los sube el PC con su token).
export function subidaPermitida(p, pathname) {
  if (!p || typeof pathname !== "string" || pathname.includes("..") || !pathname.startsWith(prefijo(p.id))) return false;
  const resto = pathname.slice(prefijo(p.id).length);
  if (esCabina(p)) return p.estado === "en_revision" && PATRON.gancho.test(resto);
  if (p.estado === "subiendo") return true;
  return p.estado === "necesita_pantallazos" && !p.pantallazos_listos && PATRON.pantallazo.test(resto);
}

// Cancelar (o «Descartar» en la Cabina): no cuando el PC ya tiene el trabajo. Un candidato se descarta mientras espera a Oscar.
export const sePuedeCancelar = (p) => (esCabina(p) ? ["subiendo", "en_revision"].includes(p.estado) : !EN_EL_PC.includes(p.estado));

// Color de la etiqueta de estado en la lista: espera = te toca a ti; camino = el sistema lo está llevando.
export function tonoEstado(p) {
  if (p.estado === "fallido") return "error";
  if (p.estado === "subiendo") return "neutro";
  if (p.estado === "en_revision" || (p.estado === "necesita_pantallazos" && !p.listos)) return "espera";
  return "camino";
}
