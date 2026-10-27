// resultados.js — lo que el PC decide de cada link (filtro de calidad, spec cantados 2026-10-26 §5): se guarda 3 días
// para la página «Links» y se cuenta por día, nivel y motivo.
import { CONTEO, RESULTADOS, TRES_DIAS_S } from "./claves.js";

const ESTADOS = new Set(["no_paso", "ensayo_no_paso", "paso"]);
const ORIGENES = new Set(["dm", "telegram"]);
const MAX = 5000;
const TRES_DIAS_MS = TRES_DIAS_S * 1000;

// Fecha del día en Bogotá (la franja corre a las 5 a. m. de allá), AAAA-MM-DD.
export const fechaBogota = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

// «vistas 1200 < 5000» → «vistas»; «juez: 5 — flojo» → «juez»: lo que va antes de «:» o del primer número.
function motivoCorto(motivo) {
  const m = String(motivo ?? "").split(":")[0].replace(/[\d<>=≥≤].*$/u, "").trim().toLowerCase().slice(0, 40);
  return m || "sin motivo";
}

function validar(x) {
  if (!x || typeof x !== "object") return null;
  const nivel = Number(x.nivel);
  if (typeof x.link !== "string" || !x.link || x.link.length > 500) return null;
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
