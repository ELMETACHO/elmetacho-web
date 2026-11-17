// esquema.js — forma de un recurso (guía) de MLABS. La usan el build (contenido/validar.js) y la API que guarda
// recursos en Redis (/admin/api/pc/recursos): la misma regla en los dos lados.
import { normalizar } from "../texto.js";

export const TIPOS = ["guia", "prompt", "mini-curso"];
export const BLOQUES = ["p", "lista", "prompt", "tabla", "ojo"];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// «Lo gratis no revela el método» (BRIEF, 2026-10-15): ni programas ni marcas internas del guion.
export const PROHIBIDAS = /ffmpeg|whisper|python|node\.?js|hyperframes|nvidia|claude code|tarjeta de video|\[TEXTO\]|\[ANIM\]/i;

const textoLleno = (v) => typeof v === "string" && v.trim().length > 0;

function erroresBloque(b) {
  if (!b || typeof b !== "object" || Array.isArray(b)) return "bloque vacío";
  const k = BLOQUES.find((x) => x in b);
  if (!k) return "bloque desconocido";
  const v = b[k];
  if (k === "lista") return Array.isArray(v) && v.length && v.every(textoLleno) ? null : "lista vacía o con elementos que no son texto";
  if (k === "tabla") return Array.isArray(v) && v.length && v.every((f) => Array.isArray(f) && f.every(textoLleno)) ? null : "tabla inválida";
  return textoLleno(v) ? null : `bloque «${k}» vacío`;
}

/**
 * Errores de una guía. `slugsPublicos` y `slugsProductos` son Set; con `estricto` también revisa el texto de cada
 * bloque y las palabras prohibidas (lo usa la API; el build revisa lo mismo en sus pruebas).
 */
export function erroresRecurso(g, { slugsPublicos, slugsProductos, estricto = false }) {
  const e = [];
  const id = `guía ${g?.slug ?? "(sin slug)"}`;
  if (!g || typeof g !== "object") return ["El recurso no es un objeto."];
  if (!SLUG.test(g.slug ?? "")) e.push(`${id}: slug inválido (minúsculas, números y guiones)`);
  for (const c of ["palabra", "titulo", "resumen"]) if (!g[c]) e.push(`${id}: falta ${c}`);
  if (!TIPOS.includes(g.tipo)) e.push(`${id}: tipo inválido (${g.tipo})`);
  if (!Array.isArray(g.publicos) || g.publicos.length === 0) e.push(`${id}: falta publicos`);
  for (const p of g.publicos ?? []) if (!slugsPublicos.has(p)) e.push(`${id}: público desconocido ${p}`);
  if (!(g.tiempo > 0)) e.push(`${id}: falta tiempo`);
  if (!FECHA.test(g.actualizado ?? "")) e.push(`${id}: actualizado debe ser AAAA-MM-DD`);
  if (g.productoRelacionado && !slugsProductos.has(g.productoRelacionado))
    e.push(`${id}: producto relacionado inexistente ${g.productoRelacionado}`);
  if (!Array.isArray(g.secciones) || g.secciones.length === 0) e.push(`${id}: falta secciones`);
  for (const s of Array.isArray(g.secciones) ? g.secciones : []) {
    if (!s?.titulo) e.push(`${id}: sección sin título`);
    for (const b of Array.isArray(s?.bloques) ? s.bloques : []) {
      const m = erroresBloque(b);
      if (m && (estricto || m === "bloque desconocido")) e.push(`${id}: ${m} en «${s?.titulo}»`);
    }
    if (estricto && (!Array.isArray(s?.bloques) || s.bloques.length === 0)) e.push(`${id}: la sección «${s?.titulo}» no tiene bloques`);
  }
  const libres = g.seccionesLibres ?? 1;
  if (!Number.isInteger(libres) || libres < 0 || libres > (g.secciones?.length ?? 0))
    e.push(`${id}: seccionesLibres fuera de rango (${libres})`);
  if (estricto) {
    const m = JSON.stringify(g).match(PROHIBIDAS);
    if (m) e.push(`${id}: menciona «${m[0]}» (lo gratis no revela el método)`);
    if (g.portada && !["rojo", "tinta", "amarillo", "azul", "claro"].includes(g.portada)) e.push(`${id}: portada inválida (${g.portada})`);
  }
  return e;
}

// La palabra de un recurso no la puede usar otro (ni la de novedades).
export function palabraOcupada(g, otros, reservadas = []) {
  const n = normalizar(g.palabra);
  if (reservadas.some((r) => normalizar(r) === n)) return true;
  return otros.some((o) => o.slug !== g.slug && normalizar(o.palabra) === n);
}

// Une las guías heredadas (código) con las de Redis: si un slug está en las dos, gana Redis.
export function combinarRecursos(heredadas, deRedis) {
  const porSlug = new Map(heredadas.map((g) => [g.slug, g]));
  for (const g of deRedis) porSlug.set(g.slug, g);
  return [...porSlug.values()];
}
