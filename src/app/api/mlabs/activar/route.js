// src/app/api/mlabs/activar/route.js — activar la cuenta: Mercado Pago o código de acceso (spec 2026-10-26 §2 paso 3).
import { avisar } from "../../../admin/lib/deps.js";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { activar } from "../../../mlabs/lib/automatizar/cobro.js";
import { mp } from "../../../mlabs/lib/automatizar/deps.js";
import { cuentaDeReq, mismoOrigen } from "../../../mlabs/lib/automatizar/sesion.js";

export const runtime = "nodejs";

export async function POST(req) {
  const cuenta = cuentaDeReq(req, process.env, Date.now());
  if (!cuenta) return Response.json({ error: "Inicia sesión otra vez." }, { status: 401 });
  if (!mismoOrigen(req)) return Response.json({ error: "Origen no permitido." }, { status: 403 });
  let c = {};
  try { c = await req.json(); } catch { /* se valida en activar */ }
  try {
    const res = await conRedis((r) => activar({ r, env: process.env, mp: mp(), ahora: Date.now, avisar }, cuenta, c));
    return Response.json(res, { status: res.ok ? 200 : 400 });
  } catch (e) {
    console.error("mlabs activar:", e?.message);
    return Response.json({ error: "Mercado Pago no respondió. Intenta otra vez en un rato." }, { status: 502 });
  }
}
