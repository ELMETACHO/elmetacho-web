// Webhook de Instagram (app de Meta «M LABS REPLY»): los reels y links de TikTok/Instagram que la comunidad le manda
// a Oscar por DM entran a la cola de la Cabina en Redis (lógica y fuentes en meta.js).
// Variables en Vercel: IG_WEBHOOK_VERIFY_TOKEN (la misma frase que se pone en Meta como «Identificador de
// verificación»), IG_APP_SECRET (clave secreta de la app de Instagram) y META_APP_SECRET (clave secreta de la app).
import { createClient } from "redis";
import { urlRedisDirecta } from "../../lead/config.js";
import { firmaValida, guardarLinks, linksDe, respuestaVerificacion } from "./meta.js";

export const runtime = "nodejs";

export async function GET(req) {
  const challenge = respuestaVerificacion(new URL(req.url).searchParams, process.env.IG_WEBHOOK_VERIFY_TOKEN);
  return challenge === null ? new Response("Token inválido", { status: 403 }) : new Response(challenge);
}

export async function POST(req) {
  const cuerpo = await req.text();   // la firma va sobre el cuerpo crudo, antes de parsearlo
  const secretos = [process.env.IG_APP_SECRET, process.env.META_APP_SECRET];
  if (!firmaValida(cuerpo, req.headers.get("x-hub-signature-256"), secretos)) {
    return new Response("Firma inválida", { status: 401 });
  }
  let evento;
  try {
    evento = JSON.parse(cuerpo);
  } catch {
    return new Response("ok");   // firmado pero ilegible: no sirve reintentarlo
  }
  const links = linksDe(evento);
  if (!links.length) return new Response("ok");
  const url = urlRedisDirecta(process.env);
  if (!url) return new Response("Sin Redis", { status: 500 });
  const r = createClient({ url });
  try {
    await r.connect();
    const n = await guardarLinks(r, links);
    console.log(`webhook instagram: ${links.length} link(s), ${n} nuevo(s) en la cola`);
    return new Response("ok");
  } catch (e) {
    console.error("webhook instagram redis", e);
    return new Response("Error", { status: 500 });   // Meta reintenta hasta 36 h
  } finally {
    r.quit().catch(() => {});
  }
}
