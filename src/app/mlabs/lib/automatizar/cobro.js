// cobro.js — activar (Mercado Pago o código de acceso para Meta), avisos de Mercado Pago y cancelar (spec 2026-10-26 §2 y §5).
import { avisarSeguro } from "../../../admin/lib/instagram/estado.js";
import { iguales } from "../../../admin/lib/sesion.js";
import { aplicarCobro, aplicarSuscripcion } from "./mercadopago.js";
import { guardarMarca, guardarSuscripcion, leerMarca, leerSuscripcion } from "./marcas.js";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BACK = "https://mlabs.elmetacho.com/panel";
// Una vez que la suscripción fijó días gratis, la marca recuerda que ya los usó.
const conGratis = (marca, susc) => (susc?.fin_gratis > 0 ? { ...marca, uso_gratis: true } : marca);

export async function activar({ r, env, mp, ahora, avisar }, cuenta, { correo, codigo } = {}) {
  const m = await leerMarca(r, cuenta);
  if (!m) return { ok: false, error: "Inicia sesión otra vez." };
  if (m.estado === "activa" || m.estado === "pago_fallido") return { ok: false, error: "Tu cuenta ya está activa." };
  if (typeof codigo === "string" && codigo.trim()) {
    // Variable vacía o ausente: ningún código sirve.
    const esperado = String(env.MLABS_CODIGO_REVISION ?? "").trim();
    if (!esperado || !iguales(codigo.trim(), esperado)) return { ok: false, error: "El código no es válido." };
    await guardarMarca(r, cuenta, { ...m, estado: "activa", origen: "codigo" });
    await avisarSeguro(avisar, `🔑 MLABS: @${m.usuario} se activó con el código de acceso.`);
    return { ok: true };
  }
  // Si ya había una suscripción (abandonó el checkout o pagó y el aviso no llegó), se mira qué dice Mercado Pago antes de crear otra.
  const previa = await leerSuscripcion(r, cuenta);
  if (previa?.id_mp) {
    let pre = null;
    try { pre = await mp.consultarSuscripcion({ id: previa.id_mp }); } catch (e) { if (e?.status !== 404) throw e; }
    if (pre?.status === "authorized") {
      const { marca, suscripcion } = aplicarSuscripcion(m, previa, pre, ahora());
      await guardarMarca(r, cuenta, conGratis(marca, suscripcion));
      if (suscripcion) await guardarSuscripcion(r, cuenta, suscripcion);
      if (marca.estado !== m.estado) await avisarSeguro(avisar, `MLABS @${marca.usuario}: ✅ suscripción activa.`);
      return { ok: true };
    }
    if (pre?.status === "pending") {
      try { await mp.cancelarSuscripcion({ id: previa.id_mp }); } catch (e) { console.error("mlabs activar: no se pudo cancelar la suscripción pendiente anterior:", e?.message); }
    }
  }
  const c = String(correo ?? "").trim();
  if (!CORREO.test(c)) return { ok: false, error: "Escribe un correo válido." };
  const precio = Number.parseInt(env.MLABS_PRECIO, 10);
  if (!(precio > 0)) return { ok: false, error: "El cobro no está configurado todavía." };
  // Los 7 días gratis son solo la primera vez por cuenta (la marca guarda `uso_gratis` aunque se reemplace la suscripción).
  const sinGratis = Boolean(m.uso_gratis || previa?.fin_gratis);
  let s;
  try {
    s = await mp.crearSuscripcion({ cuenta, correo: c, precio, backUrl: BACK, gratis: !sinGratis });
  } catch (e) {
    // Con credenciales de prueba, Mercado Pago rechaza un correo que no sea el de la cuenta compradora.
    if (e?.status === 400 && /user bad request/i.test(e.message)) return { ok: false, error: "Ese correo no es el de tu cuenta de Mercado Pago" };
    throw e;
  }
  await guardarMarca(r, cuenta, { ...m, correo: c, ...(sinGratis ? { uso_gratis: true } : {}) });
  // La suscripción nueva REEMPLAZA a la anterior (si la marca se cancela y vuelve): si no, aplicarSuscripcion ignoraría el id nuevo.
  // fin_gratis: 0 evita que aplicarSuscripcion lo rellene con el primer cobro cuando no hay días gratis.
  await guardarSuscripcion(r, cuenta, { id_mp: s.id, estado_mp: "pending", proximo_cobro: null, fin_gratis: sinGratis ? 0 : null, fin_servicio: null });
  return { ok: true, ir: s.init_point };
}

// Devuelve la suscripción nueva que pasa a ser la vigente, o null si el aviso debe ignorarse.
async function adoptar({ r, mp, avisar }, cuenta, m, susc, pre) {
  if (pre.status !== "authorized" || m.origen === "codigo") return null;
  if (susc?.id_mp) {
    let guardada = null;
    try { guardada = await mp.consultarSuscripcion({ id: susc.id_mp }); } catch (e) { if (e?.status !== 404) throw e; }
    if (guardada?.status === "authorized") {
      await avisarSeguro(avisar, `⚠️ MLABS @${m.usuario}: tiene DOS suscripciones authorized en Mercado Pago (${susc.id_mp} y ${pre.id}). Cancela una a mano.`);
      return null;
    }
    if (guardada?.status === "pending") {
      try { await mp.cancelarSuscripcion({ id: susc.id_mp }); } catch (e) { console.error("mlabs aviso: no se pudo cancelar la suscripción pendiente anterior:", e?.message); }
    }
  }
  await avisarSeguro(avisar, `MLABS @${m.usuario}: se adoptó la suscripción ${pre.id} (la guardada era ${susc?.id_mp ?? "ninguna"}).`);
  return { id_mp: pre.id, estado_mp: "pending", proximo_cobro: null, fin_gratis: m.uso_gratis ? 0 : null, fin_servicio: null };
}

// Devuelve el estado final de la marca, o "ignorado" / "sin cuenta". Siempre consulta a Mercado Pago antes de cambiar nada.
export async function recibirAviso({ r, mp, ahora, avisar }, { tipo, id }) {
  if (tipo !== "subscription_authorized_payment" && tipo !== "subscription_preapproval") return "ignorado";
  let pre, cobro = null;
  try {
    if (tipo === "subscription_authorized_payment") {
      cobro = await mp.consultarCobro({ id });
      if (!cobro?.preapproval_id) return "ignorado";
      pre = await mp.consultarSuscripcion({ id: cobro.preapproval_id });
    } else {
      pre = await mp.consultarSuscripcion({ id });
    }
  } catch (e) {
    if (e?.status === 404) return "ignorado";   // objeto que no existe (p. ej. el aviso simulado del panel): reintentar no sirve
    throw e;
  }
  const cuenta = String(pre.external_reference ?? "");
  const m = cuenta ? await leerMarca(r, cuenta) : null;
  if (!m) return "sin cuenta";
  // Solo cuenta la suscripción vigente de la marca; las viejas o desconocidas no tocan nada, salvo que sea una `authorized`
  // de esta misma cuenta (p. ej. doble clic en «Activar») y la guardada no lo esté: entonces se adopta.
  let susc = await leerSuscripcion(r, cuenta);
  if (!susc?.id_mp || susc.id_mp !== pre.id) {
    susc = await adoptar({ r, mp, avisar }, cuenta, m, susc, pre);
    if (!susc) return "ignorado";
  }
  const antes = m.estado;
  let { marca, suscripcion } = aplicarSuscripcion(m, susc, pre, ahora());
  if (cobro) marca = aplicarCobro(marca, cobro);
  await guardarMarca(r, cuenta, conGratis(marca, suscripcion));
  if (suscripcion) await guardarSuscripcion(r, cuenta, suscripcion);
  if (marca.estado !== antes) {
    const texto = { activa: "✅ suscripción activa", pago_fallido: "⚠️ pago fallido (Mercado Pago reintenta)", cancelada: "🛑 suscripción cancelada" }[marca.estado];
    if (texto) await avisarSeguro(avisar, `MLABS @${marca.usuario}: ${texto}.`);
  }
  return marca.estado;
}

// fin_servicio se guarda ANTES del PUT: si el aviso «cancelled» se adelanta, la marca sigue activa hasta esa fecha (no se corta en seco).
// Solo se guarda si hay un periodo ya ganado (marca `activa` y suscripción `authorized` en Mercado Pago); si no, solo se cancela.
export async function cancelar({ r, mp }, cuenta) {
  const s = await leerSuscripcion(r, cuenta);
  if (!s?.id_mp) return { ok: false, error: "No tienes una suscripción activa." };
  const m = await leerMarca(r, cuenta);
  let proximo = s.proximo_cobro ?? null, estadoMp = s.estado_mp;
  try {
    const pre = await mp.consultarSuscripcion({ id: s.id_mp });
    proximo = Date.parse(pre.next_payment_date) || proximo;
    estadoMp = pre.status;
  } catch { /* se usa lo guardado */ }
  if (!(m?.estado === "activa" && estadoMp === "authorized")) {
    if (s.fin_servicio) return { ok: true, hasta: s.fin_servicio };   // ya estaba cancelada
    await mp.cancelarSuscripcion({ id: s.id_mp });
    return { ok: true, hasta: null };
  }
  const hasta = s.fin_servicio ?? proximo ?? s.fin_gratis ?? null;
  await guardarSuscripcion(r, cuenta, { ...s, fin_servicio: hasta });
  try {
    await mp.cancelarSuscripcion({ id: s.id_mp });
  } catch (e) {
    try {
      const actual = (await leerSuscripcion(r, cuenta)) ?? s;
      await guardarSuscripcion(r, cuenta, { ...actual, fin_servicio: s.fin_servicio ?? null });
    } catch (e2) {
      console.error("mlabs cancelar: no se pudo revertir fin_servicio:", e2?.message);
    }
    throw e;   // siempre el error original de Mercado Pago
  }
  return { ok: true, hasta };
}

// Lo que el panel necesita saber de la marca; `uso_gratis` decide si todavía se le puede prometer la prueba de 7 días.
export const vistaEstado = (m, s) => ({
  usuario: m.usuario, estado: m.estado, casa: false, reconectar: Boolean(m.reconectar_desde), suscripcion: s,
  uso_gratis: Boolean(m.uso_gratis || s?.fin_gratis > 0),
});
