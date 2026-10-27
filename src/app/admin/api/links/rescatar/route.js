// «Rescatar» de la página Links: el link vuelve a la cola de DM con forzar, aunque el PC ya lo hubiera recibido.
// Con sesión del admin. La línea roja la sigue revisando el PC (el rescate no la salta).
import { COOKIE, leerCookie, sesionValida } from "../../../lib/sesion.js";
import { conRedis } from "../../../lib/instagram/conexion.js";
import { forzarLink } from "../../../lib/instagram/dm.js";
import { linkValido } from "../../../lib/instagram/resultados.js";

export const runtime = "nodejs";

export async function POST(req) {
  if (!sesionValida(leerCookie(req.headers.get("cookie"), COOKIE), process.env.ADMIN_CLAVE, Date.now())) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }
  let c = {};
  try { c = await req.json(); } catch { /* se valida abajo */ }
  const link = c?.link;
  if (!linkValido(link)) {
    return Response.json({ error: "Link inválido." }, { status: 400 });
  }
  await conRedis((r) => forzarLink(r, link, new Date().toISOString()));
  return Response.json({ ok: true });
}
