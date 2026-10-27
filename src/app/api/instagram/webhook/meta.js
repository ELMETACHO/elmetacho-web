// meta.js — lógica del webhook de Instagram (app de Meta «M LABS REPLY»), sin dependencias para poder probarla.
// Doc de Meta (2026-10-25): verificación GET con hub.mode/hub.verify_token/hub.challenge; cada aviso viene firmado en
// X-Hub-Signature-256 como "sha256=" + HMAC-SHA256(cuerpo crudo, clave secreta); los reels compartidos por DM llegan
// como adjunto type "ig_reel" con payload.url (changelog de Instagram Messaging, 11-jun-2024).
// Privacidad: de cada mensaje solo sale el link; ni el texto ni quién lo mandó se guardan.
import { createHmac, timingSafeEqual } from "node:crypto";

import { COLA, VISTOS } from "../../../admin/lib/instagram/claves.js";
export { COLA, VISTOS };

export function respuestaVerificacion(params, tokenEsperado) {
  if (!tokenEsperado || params.get("hub.mode") !== "subscribe") return null;
  if (params.get("hub.verify_token") !== tokenEsperado) return null;
  return params.get("hub.challenge");
}

// Instagram Login muestra dos claves (la de la app y la de la app de Instagram) y la doc no dice con cuál firma
// en este caso: se acepta la firma hecha con cualquiera de las configuradas.
export function firmaValida(cuerpoCrudo, cabecera, secretos) {
  if (!cabecera || !cabecera.startsWith("sha256=")) return false;
  const recibida = Buffer.from(cabecera.slice(7), "hex");
  return secretos.filter(Boolean).some((s) => {
    const esperada = createHmac("sha256", s).update(cuerpoCrudo).digest();
    return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
  });
}

const LINK = /https?:\/\/(?:www\.|vm\.|vt\.|m\.)?(?:tiktok\.com|instagram\.com)\/[^\s<>"']+/gi;

// Sin ?igsh=, ?lang= ni #: el mismo video compartido por dos personas queda igual.
function limpio(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)(tiktok|instagram)\.com$/i.test(u.hostname)) return null;
    return `${u.protocol}//${u.hostname}${u.pathname}`;
  } catch {
    return null;
  }
}

export function linksDe(evento) {
  const out = [];
  for (const e of evento?.entry ?? []) {
    for (const m of e?.messaging ?? []) {
      const msg = m?.message;
      if (!msg || msg.is_echo) continue;   // lo que manda la propia cuenta no es un pedido
      for (const a of msg.attachments ?? []) {
        if (a?.type === "ig_reel" && a.payload?.url) out.push(a.payload.url);
      }
      out.push(...(String(msg.text ?? "").match(LINK) ?? []));
    }
  }
  return [...new Set(out.map(limpio).filter(Boolean))];
}

// r: cliente de Redis (sAdd, lPush). Devuelve cuántos links nuevos entraron a la cola.
export async function guardarLinks(r, links, ahora = new Date().toISOString()) {
  let n = 0;
  for (const link of links) {
    if (!(await r.sAdd(VISTOS, link))) continue;
    await r.lPush(COLA, JSON.stringify({ link, recibido: ahora }));
    n++;
  }
  return n;
}
