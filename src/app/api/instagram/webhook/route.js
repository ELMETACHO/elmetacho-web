// Webhook de Instagram (app de Meta «M LABS REPLY»): los reels y links de TikTok/Instagram que la comunidad le manda
// a Oscar por DM entran a la cola de la Cabina en Redis (lógica y fuentes en meta.js).
// Atiende a IG_CUENTA_PALABRAS (cuenta casa), a IG_CUENTA_CABINA (DM) y a las marcas con ficha activa en Redis.
// Variables en Vercel: IG_WEBHOOK_VERIFY_TOKEN (la misma frase que se pone en Meta como «Identificador de
// verificación»), IG_APP_SECRET (clave secreta de la app de Instagram), META_APP_SECRET (clave secreta de la app),
// IG_CUENTA_CABINA (id de la cuenta de la Cabina), IG_CUENTA_PALABRAS (id de la cuenta de palabras clave) e
// IG_HUELLA_SECRETA (para la huella anónima del pase directo; sin ella el pase directo queda apagado).
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { atenderEvento } from "./atender.js";
import { firmaValida, respuestaVerificacion } from "./meta.js";

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
  try {
    await conRedis((r) => atenderEvento(r, evento));   // abre Redis siempre: lee las fichas de las marcas (atender.js)
    return new Response("ok");
  } catch (e) {
    console.error("webhook instagram redis", e);
    return new Response("Error", { status: 500 });   // Meta reintenta hasta 36 h
  }
}
