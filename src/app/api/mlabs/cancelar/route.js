// src/app/api/mlabs/cancelar/route.js — cancelar la mensualidad; sigue hasta el fin del periodo pagado (spec 2026-10-26 §5).
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { cancelar } from "../../../mlabs/lib/automatizar/cobro.js";
import { mp } from "../../../mlabs/lib/automatizar/deps.js";
import { cuentaDeReq, mismoOrigen } from "../../../mlabs/lib/automatizar/sesion.js";

export const runtime = "nodejs";

export async function POST(req) {
  const cuenta = cuentaDeReq(req, process.env, Date.now());
  if (!cuenta) return Response.json({ error: "Inicia sesión otra vez." }, { status: 401 });
  if (!mismoOrigen(req)) return Response.json({ error: "Origen no permitido." }, { status: 403 });
  try {
    const res = await conRedis((r) => cancelar({ r, mp: mp() }, cuenta));
    return Response.json(res, { status: res.ok ? 200 : 400 });
  } catch (e) {
    console.error("mlabs cancelar:", e?.message);
    return Response.json({ error: "Mercado Pago no respondió. Intenta otra vez en un rato." }, { status: 502 });
  }
}
