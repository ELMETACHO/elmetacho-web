// src/app/api/mlabs/estado/route.js — estado de la marca de la sesión para su panel (spec 2026-10-26 §2 paso 4).
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { cuentaDeReq } from "../../../mlabs/lib/automatizar/sesion.js";
import { leerMarca, leerSuscripcion } from "../../../mlabs/lib/automatizar/marcas.js";

export const runtime = "nodejs";

export async function GET(req) {
  const cuenta = cuentaDeReq(req, process.env, Date.now());
  if (!cuenta) return Response.json({ error: "Inicia sesión otra vez." }, { status: 401 });
  if (cuenta === process.env.IG_CUENTA_PALABRAS) return Response.json({ usuario: "metacholabs", estado: "activa", casa: true, reconectar: false, suscripcion: null });
  const d = await conRedis(async (r) => ({ m: await leerMarca(r, cuenta), s: await leerSuscripcion(r, cuenta) }));
  if (!d.m) return Response.json({ error: "Inicia sesión otra vez." }, { status: 401 });
  return Response.json({ usuario: d.m.usuario, estado: d.m.estado, casa: false, reconectar: Boolean(d.m.reconectar_desde), suscripcion: d.s });
}
