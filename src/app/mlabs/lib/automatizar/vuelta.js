// vuelta.js — lo que pasa cuando Instagram devuelve a la marca a la web (spec 2026-10-26 §2 paso 2 y §7).
// Nunca lanza: cualquier fallo (código vencido o repetido, red, timeout, Redis, falta de clave) vuelve como { ok:false, motivo }.
import { ErrorMeta } from "../../../admin/lib/instagram/graph.js";
import { avisarSeguro } from "../../../admin/lib/instagram/estado.js";
import { guardarToken } from "../../../admin/lib/instagram/token.js";
import { stateValido } from "./sesion.js";
import { altaMarca, guardarMarca } from "./marcas.js";

export const claveAsid = (asid) => `mlabs:asid:${asid}`;

// Fallos de CONFIGURACIÓN o internos (falta una variable, Redis caído): avisan a Oscar una vez por hora, sin tokens ni secretos.
// Con Redis disponible el límite es una clave NX; sin Redis, un contador en memoria de la instancia.
let ultimoAvisoLocal = 0;
export async function avisarFalloInterno({ r, avisar, ahora = Date.now }, detalle) {
  let toca = true;
  try {
    if (r) toca = Boolean(await r.set("mlabs:aviso:vuelta", "1", { condition: "NX", expiration: { type: "EX", value: 3600 } }));
    else { toca = ahora() - ultimoAvisoLocal > 3600_000; if (toca) ultimoAvisoLocal = ahora(); }
  } catch { toca = true; }
  if (toca) await avisarSeguro(avisar, `⚠️ MLABS: falló la vuelta del inicio de sesión con Instagram por un problema de configuración o interno (no de la marca): ${String(detalle).slice(0, 200)}`);
}

// Fallos de la marca o de la red/Meta (código vencido, timeout, perfil roto): solo log. Todo lo demás es interno.
const esFalloDeUsuario = (e) => e instanceof ErrorMeta || e instanceof TypeError || e?.name === "TimeoutError" || e?.name === "AbortError";

// `sesion(cuenta)` (opcional) firma la sesión de la marca; si lanza (falta el secreto) cuenta como fallo de configuración
// y el aviso «conectó su Instagram» no sale. Devuelve { ok, cuenta, cookie }.
export async function atenderVuelta({ r, env, ig, ahora, avisar, sesion }, { code, error, stateCookie, stateRecibido }) {
  if (error || !code) return { ok: false, motivo: "cancelado" };
  if (!stateValido(stateCookie, stateRecibido)) return { ok: false, motivo: "state" };
  try {
    if (!env.IG_APP_ID || !env.IG_APP_SECRET) throw new Error("Falta IG_APP_ID o IG_APP_SECRET");
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
    let nuevaMarca = false;
    if (!esCasa) {
      const { marca, nueva } = await altaMarca(r, { cuenta: p.cuenta, usuario: p.usuario, ahora });
      if (p.asid) await guardarMarca(r, p.cuenta, { ...marca, asid: p.asid });
      nuevaMarca = nueva;
    }
    if (p.asid) await r.set(claveAsid(p.asid), p.cuenta);   // para los callbacks de desautorizar y eliminar
    const cookie = sesion ? sesion(p.cuenta) : undefined;   // si lanza, no se avisa de la marca nueva
    if (nuevaMarca) await avisarSeguro(avisar, `🆕 MLABS: @${p.usuario} conectó su Instagram.`);
    console.log(`mlabs vuelta: cuenta ${p.cuenta} (@${p.usuario})`);   // en la prueba en vivo se compara con el entry.id del webhook
    return cookie === undefined ? { ok: true, cuenta: p.cuenta } : { ok: true, cuenta: p.cuenta, cookie };
  } catch (e) {
    console.error("mlabs vuelta:", e?.message);
    if (!esFalloDeUsuario(e)) await avisarFalloInterno({ r, avisar, ahora }, e?.message);
    return { ok: false, motivo: "codigo" };
  }
}
