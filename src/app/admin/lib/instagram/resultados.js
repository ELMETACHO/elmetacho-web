// resultados.js — lo que el PC decide de cada link (filtro de calidad, spec cantados 2026-10-26 §5): se guarda 3 días
// para la página «Links» y se cuenta por día, nivel y motivo.
import { CONTEO, RESULTADOS, TRES_DIAS_S } from "./claves.js";

const ESTADOS = new Set(["no_paso", "ensayo_no_paso", "paso"]);
const ORIGENES = new Set(["dm", "telegram"]);
const MAX = 5000;
const TRES_DIAS_MS = TRES_DIAS_S * 1000;

// Fecha del día en Bogotá (la franja corre a las 5 p. m. de allá), AAAA-MM-DD.
export const fechaBogota = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

// Para agrupar el conteo: lo que va antes de «:», sin paréntesis, números, % ni signos.
// «10 vistas (pide 1.000)» → «vistas»; «juez: 5 — chistes planos» → «juez».
export function motivoCorto(motivo) {
  const m = String(motivo ?? "").split(":")[0].replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ").trim().toLowerCase().slice(0, 40).trim();
  return m || "sin motivo";
}

// El mismo criterio que «Rescatar»: todo resultado guardado se puede rescatar.
export const linkValido = (link) => typeof link === "string" && link.length <= 500 && /^https?:\/\/\S+$/.test(link);

function validar(x) {
  if (!x || typeof x !== "object") return null;
  const nivel = Number(x.nivel);
  if (!linkValido(x.link)) return null;
  if (!ESTADOS.has(x.estado) || !ORIGENES.has(x.origen) || ![1, 2, 3].includes(nivel)) return null;
  const out = { link: x.link, origen: x.origen, estado: x.estado, nivel, motivo: String(x.motivo ?? "").slice(0, 300) };
  if (x.nota !== undefined && x.nota !== null && Number.isFinite(Number(x.nota))) out.nota = Number(x.nota);
  return out;
}

const claveConteo = (x) =>
  `${x.nivel}:${x.estado === "paso" ? "paso" : (x.estado === "ensayo_no_paso" ? "ensayo " : "") + motivoCorto(x.motivo)}`;

// Devuelve cuántos se guardaron; los que no cumplen la forma se saltan.
export async function guardarResultados(r, lista, ahoraIso = new Date().toISOString()) {
  const fecha = fechaBogota(Date.parse(ahoraIso));
  let n = 0;
  for (const crudo of Array.isArray(lista) ? lista : []) {
    const x = validar(crudo);
    if (!x) continue;
    await r.lPush(RESULTADOS, JSON.stringify({ ...x, fecha: ahoraIso }));
    await r.hIncrBy(CONTEO(fecha), claveConteo(x), 1);
    n++;
  }
  if (n) {
    await r.lTrim(RESULTADOS, 0, MAX - 1);
    await r.expire(CONTEO(fecha), TRES_DIAS_S);
  }
  return n;
}

export async function listaResultados(r, ahoraMs = Date.now()) {
  const out = [];
  for (const s of await r.lRange(RESULTADOS, 0, -1)) {
    let x;
    try { x = JSON.parse(s); } catch { continue; }
    const t = Date.parse(x?.fecha);
    if (Number.isFinite(t) && ahoraMs - t < TRES_DIAS_MS) out.push(x);
  }
  return out.sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
}

export async function conteoDelDia(r, fecha) {
  return Object.fromEntries(Object.entries(await r.hGetAll(CONTEO(fecha))).map(([k, v]) => [k, Number(v)]));
}

// Página «Links»: los niveles 2 y 3 y los del ensayo van uno por uno; los «No pasó» del nivel 1 (muchos y con motivos
// casi iguales) van agrupados por motivo corto, el grupo más grande primero. Todos se pueden rescatar.
export function separarPorNivel(resultados) {
  const detalle = [], grupos = new Map();
  for (const x of resultados) {
    if (x.nivel >= 2 || x.estado === "ensayo_no_paso") { detalle.push(x); continue; }
    const k = motivoCorto(x.motivo);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(x);
  }
  return { detalle, nivel1: [...grupos.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])) };
}
