// /admin/api/pc/palabras — reglas «comenta PALABRA → DM con link» de @metacholabs, con el token del PC.
//   GET → la lista de reglas · PUT { palabra, link, regla?: { mensaje_dm, respuesta_publica, pedir_seguir, activa } } → upsert
// Solo links de https://mlabs.elmetacho.com/… y solo la cuenta 17841480070378472 (lógica y pruebas en mlabs/lib/recursos/api.js).
import { randomUUID } from "node:crypto";
import { tokenPcValido } from "../../../lib/sesion.js";
import { conRedis } from "../../../lib/instagram/conexion.js";
import { guardarDisparadores, leerDisparadores } from "../../../lib/instagram/palabras.js";
import { CUENTA_LABS, guardarPalabra } from "../../../../mlabs/lib/recursos/api.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO = () => Response.json({ error: "No autorizado." }, { status: 401 });
const pc = (req) => tokenPcValido(req.headers.get("authorization"), process.env.ADMIN_PC_TOKEN);

export async function GET(req) {
  if (!pc(req)) return NO();
  return Response.json({ cuenta: CUENTA_LABS, disparadores: await conRedis((r) => leerDisparadores(r, CUENTA_LABS)) });
}

export async function PUT(req) {
  if (!pc(req)) return NO();
  let cuerpo = null;
  try { cuerpo = await req.json(); } catch { /* abajo */ }
  const { status, body } = await conRedis((r) => guardarPalabra(cuerpo, {
    almacen: { leerDisparadores: (c) => leerDisparadores(r, c), guardarDisparadores: (c, l) => guardarDisparadores(r, c, l) },
    nuevoId: () => randomUUID().slice(0, 8),
  }));
  return Response.json(body, { status });
}
