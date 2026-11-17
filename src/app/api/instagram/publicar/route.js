// Cron de Vercel (vercel.json, cada 5 min): publica los Reels de la cola de @metacholabs cuando les llega la hora.
// APAGADO salvo MLABS_PUBLICADOR = "activo" | "simulacro" y IG_CUENTA_PUBLICAR = 17841480070378472 (ver docs/mlabs-publicador.md).
import { avisar } from "../../../admin/lib/deps.js";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { modoPublicador, pasoPublicador, CUENTA_PUBLICAR } from "../../../mlabs/lib/publicador/publicador.js";
import { almacenPublicador, blobPublicador, igPublicador, tokenPublicador } from "../../../mlabs/lib/publicador/servidor.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req) {
  const s = process.env.CRON_SECRET;
  if (!s || req.headers.get("authorization") !== `Bearer ${s}`) return new Response("No autorizado", { status: 401 });
  if (!modoPublicador(process.env)) return Response.json({ estado: "apagado" });
  try {
    const r = await conRedis(async (r) => {
      const ahora = Date.now();
      const ig = modoPublicador(process.env) === "activo" ? igPublicador(await tokenPublicador(r, process.env, CUENTA_PUBLICAR, ahora)) : null;
      return pasoPublicador({ env: process.env, ahora, almacen: almacenPublicador(r), ig, blob: blobPublicador, avisar });
    });
    return Response.json(r);
  } catch (e) {
    await avisar(`❌ Publicador de Reels: ${e.message}`).catch(() => {});
    return Response.json({ error: e.message }, { status: 500 });
  }
}
