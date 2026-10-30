// src/app/api/mlabs/instagram/vuelta/route.js — Instagram devuelve aquí a la marca (spec 2026-10-26 §3 y §7).
// Atrapa cualquier error: la marca ve «No se conectó tu cuenta» (/automatizar?error=…), nunca un 500.
import { avisar } from "../../../../admin/lib/deps.js";
import { conRedis } from "../../../../admin/lib/instagram/conexion.js";
import { leerCookie } from "../../../../admin/lib/sesion.js";
import { atenderVuelta, avisarFalloInterno } from "../../../../mlabs/lib/automatizar/vuelta.js";
import { ig } from "../../../../mlabs/lib/automatizar/deps.js";
import { COOKIE_STATE, cookieMarca, cookieStateBorrada, firmarMarca } from "../../../../mlabs/lib/automatizar/sesion.js";

export const runtime = "nodejs";
const SITIO = "https://mlabs.elmetacho.com";

export async function GET(req) {
  const h = new Headers();
  h.append("Set-Cookie", cookieStateBorrada());
  let destino = `${SITIO}/automatizar?error=codigo`;
  try {
    const q = new URL(req.url).searchParams;
    const entrada = { code: q.get("code"), error: q.get("error"), stateCookie: leerCookie(req.headers.get("cookie"), COOKIE_STATE), stateRecibido: q.get("state") };
    const res = (entrada.error || !entrada.code)
      ? { ok: false, motivo: "cancelado" }   // no hace falta abrir Redis para esto
      : await conRedis((r) => atenderVuelta({ r, env: process.env, ig: ig(), ahora: Date.now, avisar, sesion: (cuenta) => cookieMarca(firmarMarca(cuenta, process.env.MLABS_SESION_SECRETO, Date.now())) }, entrada));
    if (res.ok) {
      h.append("Set-Cookie", res.cookie);   // firmada dentro de atenderVuelta (si faltara el secreto, allí falla y avisa)
      destino = `${SITIO}/panel`;
    } else {
      destino = `${SITIO}/automatizar?error=${res.motivo}`;
    }
  } catch (e) {
    console.error("mlabs vuelta (ruta):", e?.message);
    await avisarFalloInterno({ r: null, avisar }, e?.message);   // Redis caído u otro fallo inesperado
  }
  h.set("Location", destino);
  return new Response(null, { status: 302, headers: h });
}
