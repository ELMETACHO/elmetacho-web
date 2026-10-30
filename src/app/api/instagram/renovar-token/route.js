// Cron diario de Vercel (vercel.json): renueva los tokens de la casa (metacholabs) y de todas las marcas, y hace el
// mantenimiento de MLABS: apaga lo vencido y borra a quien lleva 30 días sin reconectar (spec 2026-10-26 §6).
// Vercel manda Authorization: Bearer <CRON_SECRET> cuando la variable existe.
// Fuente (verificada 2026-10-25, actualizada 2026-08-11): https://vercel.com/docs/cron-jobs/manage-cron-jobs
// «The value of the variable will be automatically sent as an Authorization header when Vercel invokes your cron job»
// y «The authorization header will have the Bearer prefix for the value.»
import { avisar } from "../../../admin/lib/deps.js";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { renovarToken } from "../../../admin/lib/instagram/graph.js";
import { desconectarCuenta } from "../../../mlabs/lib/automatizar/desconexion.js";
import { ig, mp } from "../../../mlabs/lib/automatizar/deps.js";
import { mantenerCuentas } from "../../../mlabs/lib/automatizar/mantenimiento.js";

export const runtime = "nodejs";

export async function GET(req) {
  const s = process.env.CRON_SECRET;
  if (!s || req.headers.get("authorization") !== `Bearer ${s}`) return new Response("No autorizado", { status: 401 });
  const estado = await conRedis((r) => mantenerCuentas({
    r, env: process.env, ahora: Date.now, renovar: renovarToken, avisar, mp: mp(),
    desconectar: (cuenta) => desconectarCuenta({ r, env: process.env, ig: ig(), mp: mp(), avisar }, cuenta),
  }));
  return Response.json({ estado });
}
