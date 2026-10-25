// token.js — token de la cuenta de palabras clave (spec §4.6): el renovado en Redis gana sobre IG_TOKEN_LABS.
import { clave } from "./claves.js";
import { avisarSeguro, pausar } from "./estado.js";
import { tokenInvalido } from "./graph.js";

const DIA = 86400e3;

export async function tokenDe(r, env, cuenta) {
  const g = await r.get(clave(cuenta, "token"));
  if (g) return JSON.parse(g).token;
  return cuenta === env.IG_CUENTA_PALABRAS ? env.IG_TOKEN_LABS || null : null;
}

export async function renovarSiHaceFalta({ r, env, cuenta, ahora, renovar, avisar }) {
  const g = await r.get(clave(cuenta, "token"));
  const guardado = g ? JSON.parse(g) : null;
  if (guardado && guardado.vence - ahora() > 15 * DIA) return "vigente";
  const actual = guardado?.token || (cuenta === env.IG_CUENTA_PALABRAS ? env.IG_TOKEN_LABS : null);
  if (!actual) { await avisarSeguro(avisar, `⚠️ Instagram (${cuenta}): falta el token (IG_TOKEN_LABS en Vercel).`); return "sin token"; }
  try {
    const n = await renovar(actual);
    await r.set(clave(cuenta, "token"), JSON.stringify({ token: n.access_token, vence: ahora() + n.expires_in * 1000 }));
    return "renovado";
  } catch (e) {
    if (tokenInvalido(e)) { await pausar(r, cuenta, avisar, "el token no sirve al renovarlo"); return "error"; }
    await avisarSeguro(avisar, `⚠️ Instagram (${cuenta}): no pude renovar el token (${e.message}). Si lo generaste en Meta hace menos de 24 h es normal: sigue sirviendo y mañana se reintenta.`);
    return "error";
  }
}
