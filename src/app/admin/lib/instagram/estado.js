// estado.js — pausa (token inválido o faltante) y conteo de fallos por hora, con avisos por Telegram (spec §6).
import { createHash } from "node:crypto";
import { clave } from "./claves.js";
import { tokenInvalido } from "./graph.js";
import { guardarMarca, leerMarca } from "../../../mlabs/lib/automatizar/marcas.js";

const PAUSA_S = 6 * 3600;

// Un fallo de Telegram no debe romper la pausa ni el cron.
export const avisarSeguro = async (avisar, texto) => {
  try { await avisar(texto); } catch (err) { console.error("instagram: no pude avisar por Telegram:", err?.message); }
};

const huella = (token) => createHash("sha256").update(token).digest("hex").slice(0, 16);

export const enPausa = async (r, cuenta) => Boolean(await r.get(clave(cuenta, "pausa")));

// La pausa guarda la huella del token que falló: con un token distinto (el que Oscar pega nuevo) se levanta sola.
// Si no se conoce el token ("1"), dura hasta que venza.
export async function pausaVigente(r, cuenta, token) {
  const k = clave(cuenta, "pausa");
  const v = await r.get(k);
  if (!v) return false;
  if (v !== "1" && token && huella(token) !== v) { await r.del(k); return false; }
  return true;
}

export async function pausar(r, cuenta, avisar, motivo, token = "") {
  await r.del(clave(cuenta, "token"));   // la próxima vez se usa IG_TOKEN_LABS (el que Oscar pegue nuevo)
  const nueva = await r.set(clave(cuenta, "pausa"), token ? huella(token) : "1", { condition: "NX", expiration: { type: "EX", value: PAUSA_S } });
  if (nueva) await avisarSeguro(avisar, `⚠️ Instagram (${cuenta}): palabras clave en pausa 6 h — ${motivo}. Genera un token nuevo en Meta, pégalo en Vercel como IG_TOKEN_LABS y redespliega: la pausa se levanta sola con el token nuevo.`);
}

// Cliente con token que no sirve (spec 2026-10-26 §6): su panel pide reconectar; Oscar recibe un solo aviso.
export async function pedirReconexion(r, cuenta, avisar, ahoraMs) {
  const m = await leerMarca(r, cuenta);
  if (!m || m.reconectar_desde) return;
  await guardarMarca(r, cuenta, { ...m, reconectar_desde: ahoraMs });
  await avisarSeguro(avisar, `⚠️ MLABS: el token de @${m.usuario} (${cuenta}) ya no sirve. Su panel le pide volver a conectar Instagram.`);
}

export function crearManejoDeError({ r, cuenta, ahora, avisar, token, casa = true }) {
  return async (e) => {
    console.error(`instagram ${cuenta}:`, e?.message);
    if (tokenInvalido(e)) return casa ? pausar(r, cuenta, avisar, "el token no sirve", token) : pedirReconexion(r, cuenta, avisar, ahora());
    const k = clave(cuenta, "fallos", new Date(ahora()).toISOString().slice(0, 13));
    const n = await r.incr(k);
    if (n === 1) await r.expire(k, 7200);
    if (n === 3) await avisarSeguro(avisar, `⚠️ Instagram (${cuenta}): 3 fallos en una hora al responder. Último: ${e?.message}`);
  };
}
