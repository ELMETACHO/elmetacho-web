// Cron diario de Vercel (vercel.json): renueva el token de metacholabs si le faltan menos de 15 días.
// Vercel manda Authorization: Bearer <CRON_SECRET> cuando la variable existe.
// Fuente (verificada 2026-10-25, actualizada 2026-08-11): https://vercel.com/docs/cron-jobs/manage-cron-jobs
// «The value of the variable will be automatically sent as an Authorization header when Vercel invokes your cron job»
// y «The authorization header will have the Bearer prefix for the value.»
import { avisar } from "../../../admin/lib/deps.js";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { renovarToken } from "../../../admin/lib/instagram/graph.js";
import { renovarSiHaceFalta } from "../../../admin/lib/instagram/token.js";

export const runtime = "nodejs";

export async function GET(req) {
  const s = process.env.CRON_SECRET;
  if (!s || req.headers.get("authorization") !== `Bearer ${s}`) return new Response("No autorizado", { status: 401 });
  const cuenta = process.env.IG_CUENTA_PALABRAS;
  if (!cuenta) return Response.json({ estado: "sin cuenta" });
  const estado = await conRedis((r) => renovarSiHaceFalta({ r, env: process.env, cuenta, ahora: Date.now, renovar: renovarToken, avisar }));
  return Response.json({ estado });
}
