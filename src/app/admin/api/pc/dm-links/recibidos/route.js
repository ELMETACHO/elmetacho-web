// El PC confirma los links que ya guardó en PENDIENTES.txt.
import { tokenPcValido } from "../../../../lib/sesion.js";
import { conRedis } from "../../../../lib/instagram/conexion.js";
import { confirmarDm } from "../../../../lib/instagram/dm.js";

export const runtime = "nodejs";

export async function POST(req) {
  if (!tokenPcValido(req.headers.get("authorization"), process.env.ADMIN_PC_TOKEN)) return Response.json({ error: "No autorizado." }, { status: 401 });
  let c = {};
  try { c = await req.json(); } catch { /* cuerpo vacío o malo: no confirma nada */ }
  const confirmados = await conRedis((r) => confirmarDm(r, c?.links, new Date().toISOString()));
  return Response.json({ ok: true, confirmados });
}
