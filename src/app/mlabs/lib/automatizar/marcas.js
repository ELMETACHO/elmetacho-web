// marcas.js — ficha de cada marca cliente en Redis y regla de cuándo responde la automatización (spec 2026-10-26 §4).
// La cuenta «casa» (IG_CUENTA_PALABRAS) no tiene ficha: quien llama decide si la trata como casa antes de usar `responde`.
import { clave } from "../../../admin/lib/instagram/claves.js";

export const CLIENTES = "mlabs:clientes";
const leerJson = async (r, k) => { const v = await r.get(k); return v ? JSON.parse(v) : null; };

export const leerMarca = (r, cuenta) => leerJson(r, clave(cuenta, "marca"));
export const guardarMarca = (r, cuenta, m) => r.set(clave(cuenta, "marca"), JSON.stringify(m));
export const leerSuscripcion = (r, cuenta) => leerJson(r, clave(cuenta, "suscripcion"));
export const guardarSuscripcion = (r, cuenta, s) => r.set(clave(cuenta, "suscripcion"), JSON.stringify(s));
export const listarClientes = (r) => r.sMembers(CLIENTES);

export async function altaMarca(r, { cuenta, usuario, ahora }) {
  const previa = await leerMarca(r, cuenta);
  const marca = previa
    ? { ...previa, usuario, reconectar_desde: null }
    : { usuario, alta: ahora(), tipo: "cliente", origen: null, estado: "sin_pago", correo: null, reconectar_desde: null };
  await guardarMarca(r, cuenta, marca);
  await r.sAdd(CLIENTES, cuenta);
  return { marca, nueva: !previa };
}

export const responde = (m) => Boolean(m) && !m.reconectar_desde && (m.estado === "activa" || m.estado === "pago_fallido");

// node-redis 6.3.0: scanIterator entrega lotes (string[]).
export async function clavesDeCuenta(r, cuenta) {
  const todas = [];
  for await (const lote of r.scanIterator({ MATCH: `${clave(cuenta)}:*`, COUNT: 200 })) todas.push(...lote);
  return todas;
}
