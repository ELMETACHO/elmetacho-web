// cifrado.js — tokens de Instagram de las marcas cifrados con AES-256-GCM (spec 2026-10-26 §4).
// Formato: base64url(iv 12 B | tag 16 B | texto cifrado). La clave es MLABS_CLAVE_TOKENS (32 bytes en base64).
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function llave(claveB64) {
  const k = Buffer.from(String(claveB64 ?? ""), "base64");
  if (k.length !== 32) throw new Error("MLABS_CLAVE_TOKENS no es válida (deben ser 32 bytes en base64)");
  return k;
}

export function cifrar(texto, claveB64) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", llave(claveB64), iv);
  const datos = Buffer.concat([c.update(String(texto), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), datos]).toString("base64url");
}

export function descifrar(cifrado, claveB64) {
  const b = Buffer.from(String(cifrado), "base64url");
  const d = createDecipheriv("aes-256-gcm", llave(claveB64), b.subarray(0, 12), { authTagLength: 16 });
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}
