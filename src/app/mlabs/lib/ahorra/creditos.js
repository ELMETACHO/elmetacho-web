// creditos.js — saldo de AHORRA: 3 archivos gratis por correo, luego paquetes (pago único, «Muy pronto» hasta que
// Oscar apruebe el precio). Sesión firmada en cookie; límites por IP contra correos inventados.
import { createHmac, timingSafeEqual, createHash } from "node:crypto";

export const GRATIS = 3;
export const COOKIE = "mlabs_ahorra";
export const LIMITE_IP_DIA = 12;        // conversiones por IP en 24 h (cualquier correo)
export const REGISTROS_IP_DIA = 3;      // correos nuevos por IP en 24 h
const DIA_S = 86400;

export const claveSaldo = (correo) => `mlabs:creditos:${correo}`;
export const normalizarCorreo = (c) => String(c ?? "").trim().toLowerCase().slice(0, 160);
export const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizarCorreo(c));
// Carpeta de subida por persona (sin el correo en claro): ahorra/<h>/…
export const carpeta = (correo) => `ahorra/${createHash("sha256").update(normalizarCorreo(correo)).digest("hex").slice(0, 16)}/`;

const firma = (correo, secreto) => createHmac("sha256", `ahorra:${secreto}`).update(correo).digest("hex").slice(0, 32);
export const cookieSesion = (correo, secreto) => `${Buffer.from(correo).toString("base64url")}.${firma(correo, secreto)}`;
export function leerSesion(valor, secreto) {
  if (!secreto || typeof valor !== "string") return null;
  const [b, f] = valor.split(".");
  let correo = "";
  try { correo = Buffer.from(b ?? "", "base64url").toString("utf8"); } catch { return null; }
  if (!correoValido(correo)) return null;
  const esperada = Buffer.from(firma(correo, secreto)), dada = Buffer.from(String(f ?? ""));
  return esperada.length === dada.length && timingSafeEqual(esperada, dada) ? correo : null;
}

/**
 * r: cliente de Redis (get, set NX/EX, incr, decr, incrBy, expire). Devuelve { saldo, nuevo }.
 * Un correo nuevo recibe GRATIS una sola vez (SET NX); la IP solo puede registrar REGISTROS_IP_DIA correos al día.
 */
export async function registrar(r, correo, ip) {
  const actual = await r.get(claveSaldo(correo));
  if (actual !== null) return { saldo: Number(actual), nuevo: false };
  const k = `mlabs:ahorra:registros:${ip}`;
  const n = Number(await r.incr(k));
  if (n === 1) await r.expire(k, DIA_S);
  if (n > REGISTROS_IP_DIA) return { error: "Desde esta conexión ya se registraron varios correos hoy. Vuelve mañana o escríbenos." };
  const creado = await r.set(claveSaldo(correo), String(GRATIS), { NX: true });
  return { saldo: creado ? GRATIS : Number(await r.get(claveSaldo(correo))), nuevo: Boolean(creado) };
}

export const saldoDe = async (r, correo) => Number((await r.get(claveSaldo(correo))) ?? 0);

// Gasta 1 crédito si hay saldo y la IP no pasó su límite. Devuelve { ok, saldo } o { error }.
export async function gastar(r, correo, ip) {
  const k = `mlabs:ahorra:ip:${ip}`;
  const usos = Number(await r.incr(k));
  if (usos === 1) await r.expire(k, DIA_S);
  if (usos > LIMITE_IP_DIA) return { error: "Llegaste al límite de conversiones de hoy desde esta conexión." };
  const saldo = Number(await r.decr(claveSaldo(correo)));
  if (saldo < 0) {
    await r.incr(claveSaldo(correo));
    return { error: "Se acabaron tus archivos gratis.", sinSaldo: true };
  }
  return { ok: true, saldo };
}

// Si la conversión falla, el crédito se devuelve.
export const devolver = (r, correo) => r.incr(claveSaldo(correo));
export const sumar = (r, correo, n) => r.incrBy(claveSaldo(correo), n);
