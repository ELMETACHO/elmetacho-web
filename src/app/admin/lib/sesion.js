// sesion.js — sesión de Oscar en /admin (cookie firmada) y token del PC. Spec admin §3.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "admin_sesion";
export const DIAS_SESION = 30;
const llave = (clave) => createHash("sha256").update(`admin-sesion:${clave}`).digest();
const resumen = (x) => createHash("sha256").update(String(x ?? "")).digest();

export function iguales(a, b) {
  const x = resumen(a), y = resumen(b);
  return timingSafeEqual(x, y);
}
export const claveCorrecta = (intento, clave) => Boolean(clave) && typeof intento === "string" && iguales(intento, clave);

export function firmarSesion(clave, ahoraMs) {
  const vence = String(ahoraMs + DIAS_SESION * 864e5);
  return `${vence}.${createHmac("sha256", llave(clave)).update(vence).digest("base64url")}`;
}
export function sesionValida(valor, clave, ahoraMs) {
  if (!clave || typeof valor !== "string") return false;
  const [vence, firma] = valor.split(".");
  if (!/^\d+$/.test(vence || "") || !firma || Number(vence) < ahoraMs) return false;
  return iguales(firma, createHmac("sha256", llave(clave)).update(vence).digest("base64url"));
}
export function leerCookie(cabecera, nombre) {
  for (const parte of String(cabecera || "").split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nombre) return v.join("=");
  }
  return null;
}
export const cookieSesion = (valor) =>
  `${COOKIE}=${valor}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${DIAS_SESION * 86400}`;
export const cookieBorrada = () => `${COOKIE}=; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export function tokenPcValido(cabecera, token) {
  if (!token || typeof cabecera !== "string" || !cabecera.startsWith("Bearer ")) return false;
  return iguales(cabecera.slice(7), token);
}
