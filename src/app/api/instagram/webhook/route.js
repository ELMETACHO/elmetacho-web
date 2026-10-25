// Webhook de Instagram (app de Meta «M LABS REPLY»): los reels y links de TikTok/Instagram que la comunidad le manda
// a Oscar por DM entran a la cola de la Cabina en Redis (lógica y fuentes en meta.js).
// Variables en Vercel: IG_WEBHOOK_VERIFY_TOKEN (la misma frase que se pone en Meta como «Identificador de
// verificación»), IG_APP_SECRET (clave secreta de la app de Instagram), META_APP_SECRET (clave secreta de la app),
// IG_CUENTA_CABINA (id de la cuenta de la Cabina) e IG_CUENTA_PALABRAS (id de la cuenta de palabras clave).
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { firmaValida, guardarLinks, respuestaVerificacion } from "./meta.js";
import { repartir } from "./reparto.js";

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
  const { acciones, desconocidas } = repartir(evento, { cabina: process.env.IG_CUENTA_CABINA, palabras: process.env.IG_CUENTA_PALABRAS });
  if (desconocidas.length) console.log(`webhook instagram: cuenta sin uso ${desconocidas.join(", ")}`);
  if (!acciones.length) return new Response("ok");
  try {
    await conRedis(async (r) => {
      for (const a of acciones) {
        if (a.tipo === "links") {
          const n = await guardarLinks(r, a.links);
          console.log(`webhook instagram: ${a.links.length} link(s), ${n} nuevo(s) en la cola`);
        }
      }
    });
    return new Response("ok");
  } catch (e) {
    console.error("webhook instagram redis", e);
    return new Response("Error", { status: 500 });   // Meta reintenta hasta 36 h
  }
}
