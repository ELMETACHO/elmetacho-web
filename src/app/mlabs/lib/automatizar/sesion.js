// sesion.js — sesión de la marca en mlabs.elmetacho.com (cookie firmada con la cuenta de Instagram), state del inicio
// de sesión con Instagram y comprobación de origen para las rutas que cambian datos (spec 2026-10-26 §4).
import { createHmac, randomBytes } from "node:crypto";
import { iguales, leerCookie } from "../../../admin/lib/sesion.js";

export const COOKIE_MARCA = "mlabs_sesion";
export const COOKIE_STATE = "mlabs_state";
const DIAS = 30;
const firma = (texto, secreto) => createHmac("sha256", `mlabs-sesion:${secreto}`).update(texto).digest("base64url");

export function firmarMarca(cuenta, secreto, ahoraMs) {
  if (!secreto) throw new Error("Falta MLABS_SESION_SECRETO: sin ese secreto no se puede firmar la sesión de la marca");
  const cuerpo = `${cuenta}.${ahoraMs + DIAS * 864e5}`;
  return `${cuerpo}.${firma(cuerpo, secreto)}`;
}

export function marcaDeSesion(valor, secreto, ahoraMs) {
  if (!secreto || typeof valor !== "string") return null;
  const [cuenta, vence, f] = valor.split(".");
  if (!/^\d+$/.test(cuenta || "") || !/^\d+$/.test(vence || "") || !f || !(Number(vence) >= ahoraMs)) return null;
  return iguales(f, firma(`${cuenta}.${vence}`, secreto)) ? cuenta : null;
}

export const cookieMarca = (v) => `${COOKIE_MARCA}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DIAS * 86400}`;
export const cookieMarcaBorrada = () => `${COOKIE_MARCA}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export const nuevoState = () => randomBytes(32).toString("base64url");
export const cookieState = (v) => `${COOKIE_STATE}=${v}; Path=/api/mlabs/instagram; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
export const cookieStateBorrada = () => `${COOKIE_STATE}=; Path=/api/mlabs/instagram; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export const stateValido = (deCookie, recibido) => typeof deCookie === "string" && typeof recibido === "string" && deCookie.length > 0 && iguales(deCookie, recibido);

export function mismoOrigen(req) {
  const o = req.headers.get("origin");
  if (!o) return false;
  try { return new URL(o).host === req.headers.get("host"); } catch { return false; }
}

export const cuentaDeReq = (req, env, ahoraMs) => marcaDeSesion(leerCookie(req.headers.get("cookie"), COOKIE_MARCA), env.MLABS_SESION_SECRETO, ahoraMs);
