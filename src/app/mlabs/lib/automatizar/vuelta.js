// vuelta.js — lo que pasa cuando Instagram devuelve a la marca a la web (spec 2026-10-26 §2 paso 2 y §7).
// Nunca lanza: cualquier fallo (código vencido o repetido, red, timeout, Redis, falta de clave) vuelve como { ok:false, motivo }.
import { avisarSeguro } from "../../../admin/lib/instagram/estado.js";
import { guardarToken } from "../../../admin/lib/instagram/token.js";
import { stateValido } from "./sesion.js";
import { altaMarca, guardarMarca } from "./marcas.js";

export const claveAsid = (asid) => `mlabs:asid:${asid}`;

export async function atenderVuelta({ r, env, ig, ahora, avisar }, { code, error, stateCookie, stateRecibido }) {
  if (error || !code) return { ok: false, motivo: "cancelado" };
  if (!stateValido(stateCookie, stateRecibido)) return { ok: false, motivo: "state" };
  try {
    const corto = await ig.canjearCodigo({ code });
    const largo = await ig.tokenLargo({ token: corto.token });
    const p = await ig.perfil({ token: largo.access_token });
    if (p.tipo === "PERSONAL") return { ok: false, motivo: "personal" };
    await guardarToken(r, env, p.cuenta, largo.access_token, ahora() + largo.expires_in * 1000);
    try { await ig.suscribirWebhook({ token: largo.access_token }); } catch (e) {
      await avisarSeguro(avisar, `⚠️ MLABS: no pude suscribir el webhook de @${p.usuario} (${p.cuenta}): ${e?.message}`);
    }
    // La casa (IG_CUENTA_PALABRAS e IG_CUENTA_CABINA) no tiene ficha ni va a mlabs:clientes; sí se indexa su asid.
    const esCasa = p.cuenta === env.IG_CUENTA_PALABRAS || p.cuenta === env.IG_CUENTA_CABINA;
    if (!esCasa) {
      const { marca, nueva } = await altaMarca(r, { cuenta: p.cuenta, usuario: p.usuario, ahora });
      if (p.asid) await guardarMarca(r, p.cuenta, { ...marca, asid: p.asid });
      if (nueva) await avisarSeguro(avisar, `🆕 MLABS: @${p.usuario} conectó su Instagram.`);
    }
    if (p.asid) await r.set(claveAsid(p.asid), p.cuenta);   // para los callbacks de desautorizar y eliminar
    console.log(`mlabs vuelta: cuenta ${p.cuenta} (@${p.usuario})`);   // en la prueba en vivo se compara con el entry.id del webhook
    return { ok: true, cuenta: p.cuenta };
  } catch (e) {
    console.error("mlabs vuelta:", e?.message);
    return { ok: false, motivo: "codigo" };
  }
}
