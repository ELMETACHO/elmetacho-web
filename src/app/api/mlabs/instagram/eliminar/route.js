// src/app/api/mlabs/instagram/eliminar/route.js — «Solicitud de eliminación de datos» de Meta (spec 2026-10-26 §6).
// Borra igual que desautorizar y responde lo que Meta exige: { url, confirmation_code }. Firma inválida: 400 y no se borra nada.
import { avisar } from "../../../../admin/lib/deps.js";
import { conRedis } from "../../../../admin/lib/instagram/conexion.js";
import { atenderBorradoMeta } from "../../../../mlabs/lib/automatizar/desautorizacion.js";
import { ig, mp } from "../../../../mlabs/lib/automatizar/deps.js";

export const runtime = "nodejs";

export async function POST(req) {
  let signed = null;
  try { signed = (await req.formData()).get("signed_request"); } catch { /* sin formulario: se rechaza abajo */ }
  const res = await conRedis((r) => atenderBorradoMeta({ r, env: process.env, ig: ig(), mp: mp(), avisar }, signed));
  if (!res.ok) return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  return Response.json({ url: `https://mlabs.elmetacho.com/eliminar-datos?codigo=${res.codigo}`, confirmation_code: res.codigo });
}
