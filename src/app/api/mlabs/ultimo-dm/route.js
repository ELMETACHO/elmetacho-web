// src/app/api/mlabs/ultimo-dm/route.js — último DM que MLABS envió por la cuenta de la sesión (el panel lo consulta cada
// pocos segundos). Sin ficha (desconectada) no devuelve nada; la casa no tiene ficha.
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { leerUltimoDm } from "../../../admin/lib/instagram/automatizacion.js";
import { leerMarca } from "../../../mlabs/lib/automatizar/marcas.js";
import { cuentaDeReq } from "../../../mlabs/lib/automatizar/sesion.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const cuenta = cuentaDeReq(req, process.env, Date.now());
  if (!cuenta) return Response.json({ error: "Inicia sesión otra vez." }, { status: 401 });
  const ultimo = await conRedis(async (r) => {
    if (cuenta !== process.env.IG_CUENTA_PALABRAS && !(await leerMarca(r, cuenta))) return undefined;
    return leerUltimoDm(r, cuenta);
  });
  if (ultimo === undefined) return Response.json({ error: "Inicia sesión otra vez." }, { status: 401 });
  return Response.json({ ultimo }, { headers: { "Cache-Control": "no-store" } });
}
