// desconexion.js — «Desconectar Instagram»: borra todo lo de la cuenta (spec 2026-10-26 §6). Los fallos de Meta o
// Mercado Pago no impiden el borrado: quedan en el log y le llegan a Oscar. La casa y la Cabina nunca se desconectan.
import { avisarSeguro } from "../../../admin/lib/instagram/estado.js";
import { tokenDe } from "../../../admin/lib/instagram/token.js";
import { CLIENTES, clavesDeCuenta, leerMarca, leerSuscripcion } from "./marcas.js";
import { claveAsid } from "./vuelta.js";

export async function desconectarCuenta({ r, env, ig, mp, avisar }, cuenta) {
  if (cuenta === env.IG_CUENTA_PALABRAS) throw new Error("La cuenta casa no se desconecta desde el panel.");
  if (cuenta === env.IG_CUENTA_CABINA) throw new Error("La cuenta de la Cabina no se desconecta desde el panel.");
  const avisos = [];
  const m = await leerMarca(r, cuenta);
  let token = null;
  try { token = await tokenDe(r, env, cuenta); } catch (e) { avisos.push(`token ilegible (${e.message})`); }
  if (token) {
    try { await ig.desuscribirWebhook({ token }); } catch (e) { avisos.push(`Meta: ${e.message}`); }
  }
  const s = await leerSuscripcion(r, cuenta);
  if (s?.id_mp && s.estado_mp !== "cancelled") {
    try { await mp.cancelarSuscripcion({ id: s.id_mp }); } catch (e) { avisos.push(`Mercado Pago: ${e.message} — cancélala a mano (${s.id_mp})`); }
  }
  const claves = await clavesDeCuenta(r, cuenta);
  if (m?.asid) claves.push(claveAsid(m.asid));   // índice asid → cuenta de los callbacks de Meta
  for (const k of claves) await r.del(k);
  await r.sRem(CLIENTES, cuenta);
  if (avisos.length) await avisarSeguro(avisar, `⚠️ MLABS: @${m?.usuario ?? cuenta} se desconectó y sus datos se borraron, pero: ${avisos.join("; ")}`);
  console.log(`mlabs: cuenta ${cuenta} desconectada, ${claves.length} claves borradas`);
  return { borradas: claves.length, avisos };
}
