// Palabras clave de la cuenta de la agencia (IG_CUENTA_PALABRAS). Con sesión del admin. PUT reemplaza la lista completa.
import { randomUUID } from "node:crypto";
import { COOKIE, leerCookie, sesionValida } from "../../lib/sesion.js";
import { conRedis } from "../../lib/instagram/conexion.js";
import { enPausa } from "../../lib/instagram/estado.js";
import { guardarDisparadores, leerDisparadores, validarDisparadores } from "../../lib/instagram/palabras.js";

export const runtime = "nodejs";
const conSesion = (req) => sesionValida(leerCookie(req.headers.get("cookie"), COOKIE), process.env.ADMIN_CLAVE, Date.now());
const NO = () => Response.json({ error: "No autorizado." }, { status: 401 });

export async function GET(req) {
  if (!conSesion(req)) return NO();
  const cuenta = process.env.IG_CUENTA_PALABRAS;
  if (!cuenta) return Response.json({ error: "Falta IG_CUENTA_PALABRAS en Vercel." }, { status: 500 });
  return Response.json(await conRedis(async (r) => ({ cuenta, disparadores: await leerDisparadores(r, cuenta), pausa: await enPausa(r, cuenta) })));
}

export async function PUT(req) {
  if (!conSesion(req)) return NO();
  const cuenta = process.env.IG_CUENTA_PALABRAS;
  if (!cuenta) return Response.json({ error: "Falta IG_CUENTA_PALABRAS en Vercel." }, { status: 500 });
  let c = {};
  try { c = await req.json(); } catch { /* se valida abajo */ }
  const { disparadores, errores } = validarDisparadores(c?.disparadores, () => randomUUID().slice(0, 8));
  if (errores.length) return Response.json({ error: errores.join(" ") }, { status: 400 });
  await conRedis((r) => guardarDisparadores(r, cuenta, disparadores));
  return Response.json({ disparadores });
}
