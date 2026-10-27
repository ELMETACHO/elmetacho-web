// meta.js — lógica del webhook de Instagram (app de Meta «M LABS REPLY»), sin dependencias para poder probarla.
// Doc de Meta (2026-10-25): verificación GET con hub.mode/hub.verify_token/hub.challenge; cada aviso viene firmado en
// X-Hub-Signature-256 como "sha256=" + HMAC-SHA256(cuerpo crudo, clave secreta); los reels compartidos por DM llegan
// como adjunto type "ig_reel" con payload.url (changelog de Instagram Messaging, 11-jun-2024).
// Privacidad: de cada mensaje solo sale el link; el texto no se guarda y de quién lo mandó solo queda una huella
// anónima (HMAC con IG_HUELLA_SECRETA) durante 3 días, para el pase directo (spec cantados 2026-10-26 §5).
import { createHmac, timingSafeEqual } from "node:crypto";

import { COLA, REMITENTES, TRES_DIAS_S, VISTOS } from "../../../admin/lib/instagram/claves.js";
import { forzarLink } from "../../../admin/lib/instagram/dm.js";
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

// Huella anónima del remitente: HMAC-SHA256(sender.id, secreto) en hex, 16 caracteres. Sin secreto → null (pase directo apagado).
export function huellaDe(senderId, secreto) {
  if (!secreto || !senderId) return null;
  return createHmac("sha256", secreto).update(String(senderId)).digest("hex").slice(0, 16);
}

export const PERSONAS_PASE = 3;

// r: cliente de Redis. El primer envío de un link entra a la cola, como siempre. Con huella, además cuenta personas
// distintas en 3 días (el vencimiento se renueva con cada envío): la tercera lo vuelve a poner pendiente con forzar.
// Devuelve cuántos links nuevos entraron a la cola.
export async function guardarLinks(r, links, ahora = new Date().toISOString(), { huella } = {}) {
  let n = 0;
  for (const link of links) {
    if (await r.sAdd(VISTOS, link)) {
      await r.lPush(COLA, JSON.stringify({ link, recibido: ahora }));
      n++;
    }
    if (!huella) continue;
    const nueva = await r.sAdd(REMITENTES(link), huella);
    await r.expire(REMITENTES(link), TRES_DIAS_S);
    if (nueva && (await r.sCard(REMITENTES(link))) === PERSONAS_PASE) await forzarLink(r, link, ahora);
  }
  return n;
}
