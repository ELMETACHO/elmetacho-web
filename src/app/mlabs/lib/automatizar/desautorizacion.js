// desautorizacion.js — callbacks de Meta «desautorizar» y «eliminar datos»: llegan como `signed_request`
// (`firma.payload`, base64url; firma = HMAC-SHA256 del payload codificado con IG_APP_SECRET; el payload trae el user_id
// APP-SCOPED). Se busca la cuenta en el índice `mlabs:asid:<user_id>` y se borra con desconectarCuenta (spec 2026-10-26 §6).
import { createHmac, randomBytes } from "node:crypto";
import { avisarSeguro } from "../../../admin/lib/instagram/estado.js";
import { iguales } from "../../../admin/lib/sesion.js";
import { desconectarCuenta } from "./desconexion.js";
import { claveAsid } from "./vuelta.js";

// Devuelve el payload si la firma es válida; si no, null. Sin secreto nada es válido.
export function leerSignedRequest(signed, secreto) {
  if (!secreto || typeof signed !== "string") return null;
  const partes = signed.split(".");
  if (partes.length !== 2 || !partes[0] || !partes[1]) return null;
  const [firma, cuerpo] = partes;
  if (!iguales(firma, createHmac("sha256", secreto).update(cuerpo).digest("base64url"))) return null;
  let p;
  try { p = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8")); } catch { return null; }
  if (!p || typeof p !== "object" || String(p.algorithm).toUpperCase() !== "HMAC-SHA256") return null;
  if ((typeof p.user_id !== "string" && typeof p.user_id !== "number") || String(p.user_id) === "") return null;
  return p;
}

// { ok:false } si la firma no vale (la ruta responde 400 y no se toca nada). Si vale, siempre ok:true: un asid desconocido
// o de la casa/Cabina no borra nada. Si desconectarCuenta falla (Redis), lanza y la ruta responde 500 para que Meta reintente.
export async function atenderBorradoMeta({ r, env, ig, mp, avisar }, signed) {
  const p = leerSignedRequest(signed, env.IG_APP_SECRET);
  if (!p) return { ok: false };
  const codigo = randomBytes(8).toString("hex");
  const asid = String(p.user_id);
  const cuenta = await r.get(claveAsid(asid));
  if (!cuenta) {
    console.log(`mlabs meta: callback de borrado con asid desconocido (${asid})`);
    await avisarSeguro(avisar, `⚠️ MLABS: Meta pidió desautorizar/borrar el user_id ${asid} y no está en el índice. No se borró nada; revisa si Meta manda otro id distinto al de /me.`);
    return { ok: true, borrada: false, codigo };
  }
  if (cuenta === env.IG_CUENTA_PALABRAS || cuenta === env.IG_CUENTA_CABINA) {
    await avisarSeguro(avisar, `⚠️ MLABS: Meta avisó que se desautorizó/pidió borrar la cuenta de la casa (${cuenta}). No se borró nada; revisa si fue a propósito.`);
    return { ok: true, borrada: false, cuenta, codigo };
  }
  await desconectarCuenta({ r, env, ig, mp, avisar }, cuenta);
  await r.del(claveAsid(asid));   // por si la ficha ya no traía el asid
  return { ok: true, borrada: true, cuenta, codigo };
}
