// Propuesta de comentarios de los pedidos por link y la revisión de Oscar en /admin. Spec fase 2 §4.
import { mover } from "./editor.js";
import { moverA } from "./arrastre.js";

export const HORAS_REVISION = 24;
export const HOLGURA_FRANJA_H = 2;   // vence 2 h antes: así la franja de las 2 p. m. del día siguiente la recoge
const MAX_COMENTARIOS = 80;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const iso = (ms) => new Date(ms).toISOString();
const corto = (x, max) => (typeof x === "string" ? x.trim().slice(0, max) : "");

export const ponerComa = (t) => {
  const s = String(t ?? "").trim();
  return s.endsWith(",") ? s : `${s},`;
};
export const lineaValida = (t) =>
  typeof t === "string" && !/[\r\n]/.test(t) && t.trim().length <= 300 && t.trim().endsWith(",") && t.trim().slice(0, -1).trim().length > 0;

export function validarPropuesta(lista) {
  const mal = (e) => ({ comentarios: [], errores: [e] });
  if (!Array.isArray(lista) || lista.length === 0 || lista.length > MAX_COMENTARIOS)
    return mal(`La propuesta debe traer entre 1 y ${MAX_COMENTARIOS} comentarios.`);
  const vistos = new Set(), comentarios = [];
  for (const c of lista) {
    const id = String(c?.id ?? "");
    if (!c || typeof c !== "object" || !ID.test(id) || vistos.has(id)) return mal("Hay un comentario sin id válido o repetido.");
    const linea = ponerComa(corto(c.linea, 299));
    if (!lineaValida(linea)) return mal(`El comentario ${id} no tiene línea para cantar.`);
    vistos.add(id);
    comentarios.push({ id, usuario: corto(c.usuario, 60), texto: corto(c.texto, 600), linea,
      likes: Number.isInteger(c.likes) && c.likes >= 0 ? c.likes : null, dentro: c.dentro === true });
  }
  if (!comentarios.some((c) => c.dentro)) return mal("La propuesta no deja ningún comentario dentro.");
  return { comentarios, errores: [] };
}

export function publicarPropuesta(p, comentarios, ahoraMs) {
  return {
    ...p, estado: "en_revision", automatico: false,
    propuesta: { publicada: iso(ahoraMs), vence: iso(ahoraMs + HORAS_REVISION * 3600e3), version: (p.propuesta?.version || 0) + 1, comentarios },
    revision: { orden: comentarios.filter((c) => c.dentro).map((c) => c.id), fuera: comentarios.filter((c) => !c.dentro).map((c) => c.id),
                lineas: {}, trae_mas: false, aprobada_en: null },
  };
}

// Ruling Q: la misma propuesta (mismos ids, orden, líneas y «dentro») ya publicada = repetición del PC tras una respuesta perdida.
export const mismaPropuesta = (guardados, nuevos) =>
  Array.isArray(guardados) && Array.isArray(nuevos) && guardados.length === nuevos.length &&
  guardados.every((g, k) => g.id === nuevos[k].id && g.linea === nuevos[k].linea && Boolean(g.dentro) === Boolean(nuevos[k].dentro));
export const yaPublicada = (p, comentarios) =>
  (p.estado === "en_revision" || p.estado === "aprobado") && mismaPropuesta(p.propuesta?.comentarios, comentarios);

// Ruling B: no pisar una revisión de Oscar en curso ni un pedido ya aprobado.
export const puedePublicarPropuesta = (p) =>
  p.estado === "en_pc" || p.estado === "necesita_pantallazos" || (p.estado === "en_revision" && p.revision?.trae_mas === true);

const limite = (p) => Date.parse(p.propuesta?.vence) - HOLGURA_FRANJA_H * 3600e3;
export const vencida = (p, ahoraMs) =>
  p.estado === "en_revision" && !p.revision?.trae_mas && Number.isFinite(limite(p)) && ahoraMs >= limite(p);
export const horasRestantes = (p, ahoraMs) => (Number.isFinite(limite(p)) ? Math.max(0, Math.ceil((limite(p) - ahoraMs) / 3600e3)) : 0);

const VIEJA = "La propuesta cambió: recarga la página.";
const versionVieja = (p, version) => version !== p.propuesta.version;

export function noEditable(p, ahoraMs) {
  if (p.estado !== "en_revision" || !p.propuesta || !p.revision) return "Este pedido no está en revisión.";
  if (p.revision.trae_mas) return "Ya pediste más comentarios: llegan en la franja de las 2 p. m.";
  if (vencida(p, ahoraMs)) return "Se venció el plazo: se aprueba solo con la lista como está.";
  return null;
}

export function aplicarRevision(p, c, ahoraMs) {
  const mal = (e) => ({ pedido: p, errores: [e] });
  const no = noEditable(p, ahoraMs);
  if (no) return mal(no);
  if (!c || typeof c !== "object" || Array.isArray(c) || !Array.isArray(c.orden) || !Array.isArray(c.fuera)) return mal("Datos inválidos.");
  if (versionVieja(p, c.version)) return { pedido: p, errores: [VIEJA], conflicto: true };
  const ids = p.propuesta.comentarios.map((x) => x.id);
  const orden = c.orden.map(String), fuera = c.fuera.map(String), juntos = [...orden, ...fuera];
  if (juntos.length !== ids.length || new Set(juntos).size !== ids.length || !juntos.every((i) => ids.includes(i)))
    return mal("La lista no coincide con la propuesta: recarga la página.");
  if (!orden.length) return mal("Deja al menos un comentario.");
  if (c.lineas != null && (typeof c.lineas !== "object" || Array.isArray(c.lineas))) return mal("Datos inválidos.");
  const crudo = c.lineas ?? {};
  const lineas = Object.create(null);
  for (const [id, t] of Object.entries(crudo)) {
    if (!ids.includes(id)) return mal("Hay una línea de un comentario que no está en la propuesta.");
    if (!lineaValida(t)) return mal("Cada línea corregida debe terminar en coma (y no puede quedar vacía).");
    lineas[id] = t.trim();
  }
  return { pedido: { ...p, revision: { ...p.revision, orden, fuera, lineas: { ...lineas } } }, errores: [] };
}

// version: la de la propuesta que vio el navegador (obligatoria; si no coincide, error).
export function aprobarRevision(p, ahoraMs, version) {
  const no = noEditable(p, ahoraMs);
  if (no) return { pedido: p, errores: [no] };
  if (versionVieja(p, version)) return { pedido: p, errores: [VIEJA], conflicto: true };
  return { pedido: { ...p, estado: "aprobado", automatico: false, revision: { ...p.revision, aprobada_en: iso(ahoraMs) } }, errores: [] };
}
export function pedirMas(p, ahoraMs, version) {
  const no = noEditable(p, ahoraMs);
  if (no) return { pedido: p, errores: [no] };
  if (versionVieja(p, version)) return { pedido: p, errores: [VIEJA], conflicto: true };
  return { pedido: { ...p, revision: { ...p.revision, trae_mas: true } }, errores: [] };
}
export const aprobarVencido = (p, ahoraMs) => !vencida(p, ahoraMs) ? p : ({ ...p, estado: "aprobado", automatico: true, revision: { ...p.revision, aprobada_en: iso(ahoraMs) } });
export function masAtendido(p, ahoraMs) {
  if (p.estado !== "en_revision" || !p.revision?.trae_mas) return { pedido: p, errores: ["Ese pedido no pidió más comentarios."] };
  return { pedido: { ...p, revision: { ...p.revision, trae_mas: false },
    propuesta: { ...p.propuesta, vence: iso(ahoraMs + HORAS_REVISION * 3600e3) } }, errores: [] };
}
export function listaFinal(p) {
  const por = new Map(p.propuesta.comentarios.map((c) => [c.id, c]));
  return p.revision.orden.filter((id) => por.has(id)).map((id) => ({ id, linea: (Object.hasOwn(p.revision.lineas, id) ? p.revision.lineas[id] : por.get(id).linea) }));
}

// Cambios de la pantalla de revisión sobre { orden, fuera, lineas }.
export const quitar = (rev, id) =>
  rev.orden.length <= 1 || !rev.orden.includes(id) ? rev : { ...rev, orden: rev.orden.filter((x) => x !== id), fuera: [...rev.fuera, id] };
export const meter = (rev, id) =>
  !rev.fuera.includes(id) ? rev : { ...rev, fuera: rev.fuera.filter((x) => x !== id), orden: [...rev.orden, id] };
export const moverEn = (rev, i, paso) => ({ ...rev, orden: mover(rev.orden, i, paso) });
export function moverAEn(rev, de, a) {
  const orden = moverA(rev.orden, de, a);
  return orden === rev.orden ? rev : { ...rev, orden };
}
export function editarLinea(rev, id, texto, original) {
  const lineas = { ...rev.lineas };
  if (id === "__proto__") return rev;
  if (texto === original) delete lineas[id];
  else lineas[id] = texto;
  return { ...rev, lineas };
}
