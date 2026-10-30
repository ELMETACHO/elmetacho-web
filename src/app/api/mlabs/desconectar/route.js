// src/app/api/mlabs/desconectar/route.js — «Desconectar Instagram» desde el panel (spec 2026-10-26 §6).
import { avisar } from "../../../admin/lib/deps.js";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { desconectarCuenta } from "../../../mlabs/lib/automatizar/desconexion.js";
import { ig, mp } from "../../../mlabs/lib/automatizar/deps.js";
import { cookieMarcaBorrada, cuentaDeReq, mismoOrigen } from "../../../mlabs/lib/automatizar/sesion.js";

export const runtime = "nodejs";

export async function POST(req) {
  const cuenta = cuentaDeReq(req, process.env, Date.now());
  if (!cuenta) return Response.json({ error: "Inicia sesión otra vez." }, { status: 401 });
  if (!mismoOrigen(req)) return Response.json({ error: "Origen no permitido." }, { status: 403 });
  if (cuenta === process.env.IG_CUENTA_PALABRAS || cuenta === process.env.IG_CUENTA_CABINA) return Response.json({ error: "Esta cuenta no se desconecta aquí." }, { status: 400 });
  await conRedis((r) => desconectarCuenta({ r, env: process.env, ig: ig(), mp: mp(), avisar }, cuenta));
  return Response.json({ ok: true, ir: "/eliminar-datos?listo=1" }, { headers: { "Set-Cookie": cookieMarcaBorrada() } });
}
