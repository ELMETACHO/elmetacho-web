// desautorizacion.js — callbacks de Meta «desautorizar» y «eliminar datos»: llegan como `signed_request`
// (`firma.payload`, base64url; firma = HMAC-SHA256 del payload codificado con IG_APP_SECRET). Observado en vivo (30 oct):
// el user_id del payload es el id PROFESIONAL de la cuenta (el mismo de `ig:<cuenta>:*`), no un id app-scoped. Por eso se
// resuelve así: casa/Cabina → no se borra; índice `mlabs:asid:<id>` (respaldo); ficha `leerMarca(id)` → la cuenta es el id.
// Meta manda dos avisos seguidos (desautorizar y eliminar): tras borrar queda `mlabs:borrado:<id>` 1 h para que el segundo no alerte.
// Se borra con desconectarCuenta (spec 2026-10-26 §6).
import { createHmac, randomBytes } from "node:crypto";
import { avisarSeguro } from "../../../admin/lib/instagram/estado.js";
import { iguales } from "../../../admin/lib/sesion.js";
import { desconectarCuenta } from "./desconexion.js";
import { leerMarca } from "./marcas.js";
import { claveAsid } from "./vuelta.js";

const claveBorrado = (id) => `mlabs:borrado:${id}`;

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

// { ok:false } si la firma no vale (la ruta responde 400 y no se toca nada). Si vale, siempre ok:true: un id desconocido
// o de la casa/Cabina no borra nada. Si desconectarCuenta falla (Redis), lanza y la ruta responde 500 para que Meta reintente.
export async function atenderBorradoMeta({ r, env, ig, mp, avisar }, signed) {
  const p = leerSignedRequest(signed, env.IG_APP_SECRET);
  if (!p) return { ok: false };
  const codigo = randomBytes(8).toString("hex");
  const id = String(p.user_id);
  const esCasa = (c) => c === env.IG_CUENTA_PALABRAS || c === env.IG_CUENTA_CABINA;
  const casa = async (c) => {
    await avisarSeguro(avisar, `⚠️ MLABS: Meta avisó que se desautorizó/pidió borrar la cuenta de la casa (${c}). No se borró nada; revisa si fue a propósito.`);
    return { ok: true, borrada: false, cuenta: c, codigo };
  };
  if (esCasa(id)) return casa(id);
  let cuenta = await r.get(claveAsid(id));
  if (cuenta && esCasa(cuenta)) return casa(cuenta);
  if (!cuenta && (await leerMarca(r, id))) cuenta = id;
  if (!cuenta) {
    if (await r.get(claveBorrado(id))) return { ok: true, borrada: false, codigo };   // segundo aviso de Meta: ya se borró
    console.log(`mlabs meta: callback de borrado con user_id desconocido (${id})`);
    await avisarSeguro(avisar, `⚠️ MLABS: Meta pidió desautorizar/borrar el user_id ${id} y no hay ficha ni índice. No se borró nada; revisa si Meta manda otro id distinto al de /me.`);
    return { ok: true, borrada: false, codigo };
  }
  await desconectarCuenta({ r, env, ig, mp, avisar }, cuenta);
  await r.del(claveAsid(id));   // por si el id era app-scoped
  await r.set(claveBorrado(id), "1", { expiration: { type: "EX", value: 3600 } });
  if (cuenta !== id) await r.set(claveBorrado(cuenta), "1", { expiration: { type: "EX", value: 3600 } });
  return { ok: true, borrada: true, cuenta, codigo };
}
