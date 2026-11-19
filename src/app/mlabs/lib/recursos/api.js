// api.js — lógica de PUT/GET /admin/api/pc/recursos con dependencias inyectadas (la ruta pasa Redis real).
// Un solo paso: guarda el recurso validado y, si se pide, crea o actualiza la regla palabra → link en Instagram.
import { erroresRecurso, palabraOcupada } from "./esquema.js";
import { validarDisparadores } from "../../../admin/lib/instagram/palabras.js";
import { normalizar } from "../texto.js";

// Candado: las reglas de recursos solo van a @metacholabs.
export const CUENTA_LABS = "17841480070378472";
export const BASE = "https://mlabs.elmetacho.com";
export const enlaceRecurso = (slug) => `${BASE}/recursos/${slug}`;

const tok = (s) => normalizar(s).replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Crea o actualiza (por palabra) la regla del recurso; conserva id y estado de una regla existente.
export const reglaConRecurso = (disparadores, g, regla = {}, nuevoId) =>
  reglaConLink(disparadores, { palabra: g.palabra, titulo: g.titulo, link: enlaceRecurso(g.slug) }, regla, nuevoId);

// Regla palabra → link (cualquier página de mlabs, p. ej. /ahorra). Mismo upsert por palabra.
export function reglaConLink(disparadores, g, regla = {}, nuevoId) {
  const link = g.link;
  const i = disparadores.findIndex((d) => tok(d.palabra) === tok(g.palabra));
  const previa = i >= 0 ? disparadores[i] : null;
  const d = {
    id: previa?.id || nuevoId(),
    palabra: g.palabra,
    respuesta_publica: regla.respuesta_publica || previa?.respuesta_publica || "¡Listo! Te lo mandé por DM 📩",
    mensaje_dm: regla.mensaje_dm || previa?.mensaje_dm || `Aquí tienes «${g.titulo}». Ábrela aquí:`,
    link,
    pedir_seguir: regla.pedir_seguir ?? previa?.pedir_seguir ?? false,
    activa: regla.activa ?? previa?.activa ?? true,
  };
  const lista = [...disparadores];
  if (i >= 0) lista[i] = d;
  else lista.push(d);
  return lista;
}

/**
 * almacen: { leerRecursos(), guardarRecurso(g), leerDisparadores(cuenta), guardarDisparadores(cuenta, lista) }
 * contexto: { heredadas, slugsPublicos, slugsProductos, reservadas }
 */
export async function guardarRecurso(cuerpo, { almacen, contexto, nuevoId, revalidar = () => {} }) {
  const g = cuerpo?.recurso;
  const cuenta = cuerpo?.cuenta ?? CUENTA_LABS;
  if (cuenta !== CUENTA_LABS) return { status: 403, body: { error: `Solo se crean reglas para @metacholabs (${CUENTA_LABS}).` } };
  if (!g || typeof g !== "object" || Array.isArray(g)) return { status: 400, body: { error: "Falta el recurso." } };
  const errores = erroresRecurso(g, { ...contexto, estricto: true });
  const guardados = await almacen.leerRecursos();
  const otros = [...contexto.heredadas, ...guardados];
  if (palabraOcupada(g, otros, contexto.reservadas)) errores.push(`La palabra «${g.palabra}» ya es de otro recurso.`);
  if (errores.length) return { status: 400, body: { error: errores.join(" "), errores } };

  let disparadores = null;
  if (cuerpo.regla !== false) {
    const actuales = await almacen.leerDisparadores(cuenta);
    const v = validarDisparadores(reglaConRecurso(actuales, g, cuerpo.regla ?? {}, nuevoId), nuevoId);
    if (v.errores.length) return { status: 400, body: { error: v.errores.join(" "), errores: v.errores } };
    disparadores = v.disparadores;
  }
  await almacen.guardarRecurso(g);
  if (disparadores) await almacen.guardarDisparadores(cuenta, disparadores);
  await revalidar(g.slug);
  return { status: 200, body: { ok: true, slug: g.slug, link: enlaceRecurso(g.slug), regla: disparadores ? g.palabra : null } };
}

export async function listarRecursos({ almacen, contexto }) {
  const guardados = await almacen.leerRecursos();
  const enRedis = new Set(guardados.map((g) => g.slug));
  const todos = [...guardados, ...contexto.heredadas.filter((g) => !enRedis.has(g.slug))];
  return {
    status: 200,
    body: { recursos: todos.map((g) => ({ slug: g.slug, palabra: g.palabra, titulo: g.titulo, origen: enRedis.has(g.slug) ? "redis" : "codigo" })) },
  };
}

// PUT /admin/api/pc/palabras: una regla suelta (sin recurso), solo hacia páginas de mlabs y solo en @metacholabs.
export async function guardarPalabra(cuerpo, { almacen, nuevoId }) {
  const cuenta = cuerpo?.cuenta ?? CUENTA_LABS;
  if (cuenta !== CUENTA_LABS) return { status: 403, body: { error: `Solo se crean reglas para @metacholabs (${CUENTA_LABS}).` } };
  const palabra = String(cuerpo?.palabra ?? "").trim();
  const link = String(cuerpo?.link ?? "");
  if (!palabra) return { status: 400, body: { error: "Falta la palabra." } };
  if (!link.startsWith(`${BASE}/`)) return { status: 400, body: { error: `El link debe ser una página de ${BASE}.` } };
  const actuales = await almacen.leerDisparadores(cuenta);
  const v = validarDisparadores(reglaConLink(actuales, { palabra, link, titulo: palabra }, cuerpo.regla ?? {}, nuevoId), nuevoId);
  if (v.errores.length) return { status: 400, body: { error: v.errores.join(" ") } };
  await almacen.guardarDisparadores(cuenta, v.disparadores);
  return { status: 200, body: { ok: true, regla: v.disparadores.find((d) => tok(d.palabra) === tok(palabra)) } };
}
