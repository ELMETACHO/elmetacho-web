// Candidatos de la Cabina: el sondeo del PC los crea y sube; Oscar los revisa en /admin. Spec 2026-10-23-admin-cabina-design §4.
import { destinoDe, esCabina, linkValido, nuevoPedido, prefijo } from "./pedido.js";
import { HOLGURA_FRANJA_H, listaFinal, publicarPropuesta, validarPropuesta, vencida } from "./revision.js";

export const HORAS_CABINA = 72;   // vence = publicada + 72 h; se da por vencido HOLGURA_FRANJA_H antes (70 h), como los pedidos por link
export const HORAS_SIN_PUBLICAR = 24;
export const DIAS_EN_REVISION = 7;
export const MAX_VISTA = 50 * 1024 ** 2;
export const MAX_MEDIO = 20 * 1024 ** 2;
export const EXT_MEDIO = ["jpg", "jpeg", "png", "webp", "gif", "mp4"];
const TIPOS_MEDIO = ["imagen", "gif"];
export const CONTENIDO_VISTA = ["video/mp4"];
export const CONTENIDO_MEDIO = ["image/*", "video/mp4"];

export const rutaVista = (id) => `${prefijo(id)}vista.mp4`;
// posicion: 1-based, la del comentario en la lista que manda el PC (tenga o no medio).
export const rutaMedio = (id, posicion, ext) => `${prefijo(id)}m${String(posicion).padStart(2, "0")}.${ext}`;

const conteo = (x) => (x === undefined || x === null ? null : Number.isInteger(x) && x >= 0 ? x : undefined);
const positivo = (x) => typeof x === "number" && Number.isFinite(x) && x > 0;
const entero = (x) => Number.isInteger(x) && x > 0;

export function validarCandidato(id, c) {
  const mal = (e) => ({ errores: [e] });
  if (!c || typeof c !== "object" || Array.isArray(c)) return mal("Datos inválidos.");
  if (!linkValido(c.link)) return mal("El link debe ser de TikTok: https://www.tiktok.com/…, https://vm.tiktok.com/… o https://vt.tiktok.com/…");
  const v = c.vista;
  if (!v || typeof v !== "object" || !positivo(v.duracion) || !entero(v.ancho) || !entero(v.alto))
    return mal("La vista previa necesita duracion (s), ancho y alto (px).");
  const { comentarios, errores } = validarPropuesta(c.comentarios);
  if (errores.length) return { errores };
  const salida = [];
  for (const [k, base] of comentarios.entries()) {
    const crudo = c.comentarios[k];
    const likes = conteo(crudo.likes), respuestas = conteo(crudo.respuestas);
    if (likes === undefined || respuestas === undefined) return mal(`El comentario ${base.id} trae likes o respuestas que no son números enteros.`);
    let medio = null;
    if (crudo.medio !== undefined && crudo.medio !== null) {
      const m = crudo.medio;
      if (typeof m !== "object" || !EXT_MEDIO.includes(m.ext) || !TIPOS_MEDIO.includes(m.tipo))
        return mal(`El medio del comentario ${base.id} no es válido (ext: ${EXT_MEDIO.join(", ")}; tipo: imagen o gif).`);
      medio = { pathname: rutaMedio(id, k + 1, m.ext), tipo: m.tipo, tamano: null };
    }
    salida.push({ ...base, likes, respuestas, medio });
  }
  return { link: c.link.trim(), vista: { duracion: v.duracion, ancho: v.ancho, alto: v.alto }, comentarios: salida, errores: [] };
}

export const nuevoCandidato = (id, creado, d) => ({
  ...nuevoPedido(id, creado, "cabina", "reel"),
  origen: "sondeo", link: d.link, propuesta: null,
  vista_previa: { pathname: rutaVista(id), tamano: null, ...d.vista },
  comentarios_cabina: d.comentarios,   // provisional: pasan a propuesta.comentarios al publicar
});

// ¿Qué puede subir el PC a esta ruta? Tope y tipos de contenido; null si la ruta no es de este candidato.
export function reglaDeSubida(p, pathname) {
  if (typeof pathname !== "string") return null;
  if (pathname === p.vista_previa?.pathname) return { max: MAX_VISTA, tipos: CONTENIDO_VISTA };
  if ((p.comentarios_cabina || []).some((c) => c.medio?.pathname === pathname)) return { max: MAX_MEDIO, tipos: CONTENIDO_MEDIO };
  return null;
}

// Tamaño que anunció el PC al pedir el token: «publicar» lo compara con el blob real.
export function anotarTamano(p, pathname, tamano) {
  if (p.vista_previa?.pathname === pathname) return { ...p, vista_previa: { ...p.vista_previa, tamano } };
  return { ...p, comentarios_cabina: (p.comentarios_cabina || []).map((c) => (c.medio?.pathname === pathname ? { ...c, medio: { ...c.medio, tamano } } : c)) };
}

export const archivosDelCandidato = (p) => [p.vista_previa, ...(p.comentarios_cabina || []).map((c) => c.medio)].filter(Boolean);

export function publicarCandidato(p, ahoraMs) {
  const { comentarios_cabina: comentarios, ...resto } = p;
  return publicarPropuesta(resto, comentarios, ahoraMs, HORAS_CABINA);
}
export const yaPublicado = (p) => esCabina(p) && p.estado !== "subiendo" && Boolean(p.propuesta);

// Lo que recibe el PC en GET /admin/api/pc/cabina (sin el gancho, que se firma en la API).
export function paraElPc(p) {
  const auto = p.estado === "automatico";
  const coms = p.propuesta.comentarios;
  return {
    id: p.id, estado: p.estado, link: p.link, destino: destinoDe(p), titulo: p.titulo ?? null, tramos: p.tramos ?? [],
    orden: auto ? coms.filter((c) => c.dentro).map(({ id, linea }) => ({ id, linea })) : listaFinal(p),
    fuera: auto ? coms.filter((c) => !c.dentro).map((c) => c.id) : [...p.revision.fuera],
  };
}

export const vencerCandidato = (p, ahoraMs) => (esCabina(p) && vencida(p, ahoraMs) ? { ...p, estado: "automatico" } : p);

export function aPurgar(p, ahoraMs) {
  if (!esCabina(p)) return false;
  if (p.estado === "subiendo") return ahoraMs - Date.parse(p.creado) > HORAS_SIN_PUBLICAR * 3600e3;
  if (p.estado === "en_revision") return ahoraMs - Date.parse(p.propuesta?.publicada) > DIAS_EN_REVISION * 864e5;
  return false;
}

// Días hasta que sale solo: cuenta hasta el límite real (vence − holgura de la franja), el mismo que usa `vencida`.
export const diasRestantes = (p, ahoraMs) =>
  Math.max(0, Math.ceil((Date.parse(p.propuesta?.vence) - HOLGURA_FRANJA_H * 3600e3 - ahoraMs) / 864e5)) || 0;
export const textoDias = (dias) => (dias <= 0 ? "sale solo en la próxima franja" : dias === 1 ? "sale solo en 1 día" : `sale solo en ${dias} días`);
export const nombreCabina = (p) => String(p.link || p.id).replace(/^https:\/\/(www\.)?/, "");

// Lista de /admin: el bloque «Cabina (N)» (solo en revisión, el que vence antes primero) y los pedidos normales.
export function separarCabina(lista, ahoraMs) {
  const cabina = lista
    .filter((p) => esCabina(p) && p.estado === "en_revision" && p.propuesta && p.revision)
    .sort((x, y) => Date.parse(x.propuesta.vence) - Date.parse(y.propuesta.vence))
    .map((p) => ({ id: p.id, nombre: nombreCabina(p), comentarios: p.revision.orden.length, dias: diasRestantes(p, ahoraMs) }));
  return { cabina, pedidos: lista.filter((p) => !esCabina(p)) };
}
