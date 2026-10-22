// Pedido de cantados armado en /admin. Spec admin §5.
import { validarTramos } from "./tramos.js";

export const ESTILOS = ["Salsa, merengue", "Salsa", "Merengue"];
export const HORAS_BORRADOR = 48;
const MAX_PANTALLAZOS = 40;

export const prefijo = (id) => `cantados/${id}/`;
export function nuevoId(fecha, azar) {
  const d = fecha.toISOString().slice(0, 10).replaceAll("-", "");
  return `c_${d}_${azar}`;
}
export const nuevoPedido = (id, creado) => ({
  id, creado, estado: "subiendo", titulo: null, estilo: ESTILOS[0], tramos: [],
  original: null, gancho: null, pantallazos: [], motivo: null,
});

function archivoValido(id, a) {
  if (!a || typeof a.pathname !== "string" || !a.pathname.startsWith(prefijo(id)) || a.pathname.includes("..")) return null;
  const n = (x) => (Number.isFinite(Number(x)) ? Number(x) : undefined);
  return { pathname: a.pathname, tamano: n(a.tamano) ?? 0, duracion: n(a.duracion), ancho: n(a.ancho), alto: n(a.alto),
           nombre: typeof a.nombre === "string" ? a.nombre.slice(0, 120) : undefined };
}

export function aplicarCambios(p, c) {
  if (p.estado !== "subiendo") return { pedido: p, errores: ["Este pedido ya se envió; cancélalo y súbelo de nuevo."] };
  const out = { ...p }, errores = [];
  if ("titulo" in c) out.titulo = typeof c.titulo === "string" && c.titulo.trim() ? c.titulo.trim().slice(0, 200) : null;
  if ("estilo" in c) ESTILOS.includes(c.estilo) ? (out.estilo = c.estilo) : errores.push("Estilo no válido.");
  for (const campo of ["original", "gancho"]) {
    if (campo in c) {
      const a = archivoValido(p.id, c[campo]);
      a ? (out[campo] = a) : errores.push(`El archivo de ${campo} no es de este pedido.`);
    }
  }
  if ("pantallazos" in c) {
    const lista = Array.isArray(c.pantallazos) ? c.pantallazos.slice(0, MAX_PANTALLAZOS).map((a) => archivoValido(p.id, a)) : [null];
    lista.every(Boolean) ? (out.pantallazos = lista) : errores.push("Hay un archivo de pantallazo que no es de este pedido.");
  }
  if ("tramos" in c) {
    const r = validarTramos(c.tramos, out.original?.duracion);
    r.errores.length ? errores.push(...r.errores) : (out.tramos = r.tramos);
  }
  return { pedido: errores.length ? p : out, errores };
}

export function erroresParaEnviar(p) {
  const e = [];
  if (!(p.original?.tamano > 0)) e.push("Falta el video original.");
  if (!p.tramos?.length) e.push("Falta marcar el bucle.");
  if (!(p.gancho?.tamano > 0)) e.push("Falta tu gancho.");
  if (!p.pantallazos?.length || !p.pantallazos.every((a) => a.tamano > 0)) e.push("Faltan los pantallazos.");
  return e;
}
export const archivos = (p) => [p.original, p.gancho, ...(p.pantallazos || [])].filter(Boolean).map((a) => a.pathname);
export const borradorVencido = (p, ahoraMs) =>
  p.estado === "subiendo" && ahoraMs - Date.parse(p.creado) > HORAS_BORRADOR * 3600e3;
export const nombreVisible = (p) => p.titulo || p.original?.nombre || p.id;
