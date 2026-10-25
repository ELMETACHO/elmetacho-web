// estado.js — pausa (token inválido o faltante) y conteo de fallos por hora, con avisos por Telegram (spec §6).
import { clave } from "./claves.js";
import { tokenInvalido } from "./graph.js";

const PAUSA_S = 6 * 3600;

// Un fallo de Telegram no debe romper la pausa ni el cron.
export const avisarSeguro = async (avisar, texto) => {
  try { await avisar(texto); } catch (err) { console.error("instagram: no pude avisar por Telegram:", err?.message); }
};

export const enPausa = async (r, cuenta) => Boolean(await r.get(clave(cuenta, "pausa")));

export async function pausar(r, cuenta, avisar, motivo) {
  await r.del(clave(cuenta, "token"));   // la próxima vez se usa IG_TOKEN_LABS (el que Oscar pegue nuevo)
  const nueva = await r.set(clave(cuenta, "pausa"), "1", { condition: "NX", expiration: { type: "EX", value: PAUSA_S } });
  if (nueva) await avisarSeguro(avisar, `⚠️ Instagram (${cuenta}): palabras clave en pausa 6 h — ${motivo}. Genera un token nuevo en Meta y pégalo en Vercel como IG_TOKEN_LABS.`);
}

export function crearManejoDeError({ r, cuenta, ahora, avisar }) {
  return async (e) => {
    console.error(`instagram ${cuenta}:`, e?.message);
    if (tokenInvalido(e)) return pausar(r, cuenta, avisar, "el token no sirve");
    const k = clave(cuenta, "fallos", new Date(ahora()).toISOString().slice(0, 13));
    const n = await r.incr(k);
    if (n === 1) await r.expire(k, 7200);
    if (n === 3) await avisarSeguro(avisar, `⚠️ Instagram (${cuenta}): 3 fallos en una hora al responder. Último: ${e?.message}`);
  };
}
