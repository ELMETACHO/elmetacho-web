// palabras.js — disparadores por palabra clave (spec 2026-10-25 §4.3). Coincide la palabra o frase completa,
// sin mayúsculas ni tildes ni signos; la primera activa de la lista gana.
import { clave } from "./claves.js";

const MAX = 50;
const normal = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const tokens = (s) => (normal(s).match(/[\p{L}\p{N}]+/gu) ?? []).join(" ");

export function buscarDisparador(texto, disparadores) {
  const t = ` ${tokens(texto)} `;
  return disparadores.find((d) => { const p = tokens(d.palabra); return d.activa && p && t.includes(` ${p} `); }) ?? null;
}

// La respuesta pública de la cuenta vuelve como comentario nuevo: si es idéntica a una configurada, no se responde.
export function esRespuestaPropia(texto, disparadores) {
  const t = normal(texto).trim();
  return disparadores.some((d) => normal(d.respuesta_publica).trim() === t);
}

const texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validarDisparadores(lista, nuevoId) {
  if (!Array.isArray(lista) || lista.length > MAX) return { disparadores: [], errores: ["La lista no es válida."] };
  const errores = [], vistas = new Set(), disparadores = [];
  lista.forEach((x, k) => {
    const n = `#${k + 1}`;
    const d = {
      id: texto(x?.id, 40) || nuevoId(),
      palabra: texto(x?.palabra, 40),
      respuesta_publica: texto(x?.respuesta_publica, 300),
      mensaje_dm: texto(x?.mensaje_dm, 900),
      link: texto(x?.link, 500),
      pedir_seguir: Boolean(x?.pedir_seguir),
      activa: x?.activa !== false,
    };
    if (!tokens(d.palabra)) errores.push(`${n}: falta la palabra clave.`);
    else if (vistas.has(tokens(d.palabra))) errores.push(`${n}: palabra repetida («${d.palabra}»).`);
    vistas.add(tokens(d.palabra));
    if (!d.respuesta_publica || !d.mensaje_dm) errores.push(`${n}: faltan la respuesta pública o el mensaje del DM.`);
    let url = null;
    try { url = new URL(d.link); } catch { /* se avisa abajo */ }
    if (url?.protocol !== "https:") errores.push(`${n}: el link debe empezar por https://`);
    if (Buffer.byteLength(`${d.mensaje_dm}\n${d.link}`, "utf8") > 1000) errores.push(`${n}: el mensaje con el link pasa de 1000 bytes (límite de Instagram).`);
    disparadores.push(d);
  });
  return { disparadores: errores.length ? [] : disparadores, errores };
}

export async function leerDisparadores(r, cuenta) {
  const v = await r.get(clave(cuenta, "disparadores"));
  return v ? JSON.parse(v) : [];
}

export async function guardarDisparadores(r, cuenta, disparadores) {
  await r.set(clave(cuenta, "disparadores"), JSON.stringify(disparadores));
}
