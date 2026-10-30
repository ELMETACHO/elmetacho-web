// token.js — tokens de Instagram por cuenta (spec 2026-10-25 §4.6 y 2026-10-26 §4): cifrados en Redis con
// MLABS_CLAVE_TOKENS. La cuenta casa (IG_CUENTA_PALABRAS) usa IG_TOKEN_LABS de respaldo; un cliente, nunca.
import { clave } from "./claves.js";
import { avisarSeguro, pausar, pedirReconexion } from "./estado.js";
import { tokenInvalido } from "./graph.js";
import { cifrar, descifrar } from "../../../mlabs/lib/automatizar/cifrado.js";

const DIA = 86400e3;
const esCasa = (env, cuenta) => cuenta === env.IG_CUENTA_PALABRAS;

async function leerGuardado(r, env, cuenta) {
  const g = await r.get(clave(cuenta, "token"));
  if (!g) return null;
  const v = JSON.parse(g);
  return { token: v.cifrado ? descifrar(v.cifrado, env.MLABS_CLAVE_TOKENS) : v.token, vence: v.vence };   // v.token: formato viejo sin cifrar
}

export async function guardarToken(r, env, cuenta, token, venceMs) {
  const cifrado = cifrar(token, env.MLABS_CLAVE_TOKENS);   // lanza antes de escribir si falta la clave
  await r.set(clave(cuenta, "token"), JSON.stringify({ cifrado, vence: venceMs }));
}

export async function tokenDe(r, env, cuenta) {
  const g = await leerGuardado(r, env, cuenta);
  if (g?.token) return g.token;
  return esCasa(env, cuenta) ? env.IG_TOKEN_LABS || null : null;
}

export async function renovarSiHaceFalta({ r, env, cuenta, ahora, renovar, avisar }) {
  const guardado = await leerGuardado(r, env, cuenta);
  if (guardado && guardado.vence - ahora() > 15 * DIA) return "vigente";
  const actual = guardado?.token || (esCasa(env, cuenta) ? env.IG_TOKEN_LABS : null);
  if (!actual) { await avisarSeguro(avisar, `⚠️ Instagram (${cuenta}): falta el token${esCasa(env, cuenta) ? " (IG_TOKEN_LABS en Vercel)" : ""}.`); return "sin token"; }
  try {
    const n = await renovar(actual);
    await guardarToken(r, env, cuenta, n.access_token, ahora() + n.expires_in * 1000);
    return "renovado";
  } catch (e) {
    if (tokenInvalido(e)) {
      if (esCasa(env, cuenta)) await pausar(r, cuenta, avisar, "el token no sirve al renovarlo", actual);
      else await pedirReconexion(r, cuenta, avisar, ahora());
      return "error";
    }
    await avisarSeguro(avisar, `⚠️ Instagram (${cuenta}): no pude renovar el token (${e.message}). Si lo generaste en Meta hace menos de 24 h es normal: sigue sirviendo y mañana se reintenta.`);
    return "error";
  }
}
