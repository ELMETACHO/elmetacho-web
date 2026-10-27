// El PC informa lo que decidió de cada link (filtro de calidad, spec cantados 2026-10-26 §5). Se guarda 3 días.
import { tokenPcValido } from "../../../../lib/sesion.js";
import { conRedis } from "../../../../lib/instagram/conexion.js";
import { guardarResultados } from "../../../../lib/instagram/resultados.js";

export const runtime = "nodejs";

export async function POST(req) {
  if (!tokenPcValido(req.headers.get("authorization"), process.env.ADMIN_PC_TOKEN)) return Response.json({ error: "No autorizado." }, { status: 401 });
  let c = {};
  try { c = await req.json(); } catch { /* cuerpo vacío o malo: se responde 400 abajo */ }
  if (!Array.isArray(c?.resultados)) return Response.json({ error: "Falta la lista resultados." }, { status: 400 });
  const guardados = await conRedis((r) => guardarResultados(r, c.resultados, new Date().toISOString()));
  return Response.json({ ok: true, guardados });
}
