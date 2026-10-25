// Links de DM aún no confirmados por el PC (spec 2026-10-25 §4.2). No marca nada: el PC confirma con …/recibidos.
import { tokenPcValido } from "../../../lib/sesion.js";
import { conRedis } from "../../../lib/instagram/conexion.js";
import { pendientesDm } from "../../../lib/instagram/dm.js";

export const runtime = "nodejs";

export async function GET(req) {
  if (!tokenPcValido(req.headers.get("authorization"), process.env.ADMIN_PC_TOKEN)) return Response.json({ error: "No autorizado." }, { status: 401 });
  return Response.json({ links: await conRedis(pendientesDm) });
}
