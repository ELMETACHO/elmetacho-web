// cobro.js — activar (Mercado Pago o código de acceso para Meta), avisos de Mercado Pago y cancelar (spec 2026-10-26 §2 y §5).
import { avisarSeguro } from "../../../admin/lib/instagram/estado.js";
import { iguales } from "../../../admin/lib/sesion.js";
import { aplicarCobro, aplicarSuscripcion } from "./mercadopago.js";
import { guardarMarca, guardarSuscripcion, leerMarca, leerSuscripcion } from "./marcas.js";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BACK = "https://mlabs.elmetacho.com/panel";

export async function activar({ r, env, mp, ahora, avisar }, cuenta, { correo, codigo } = {}) {
  const m = await leerMarca(r, cuenta);
  if (!m) return { ok: false, error: "Inicia sesión otra vez." };
  if (m.estado === "activa" || m.estado === "pago_fallido") return { ok: false, error: "Tu cuenta ya está activa." };
  if (typeof codigo === "string" && codigo.trim()) {
    // Variable vacía o ausente: ningún código sirve.
    if (!env.MLABS_CODIGO_REVISION || !iguales(codigo.trim(), env.MLABS_CODIGO_REVISION)) return { ok: false, error: "El código no es válido." };
    await guardarMarca(r, cuenta, { ...m, estado: "activa", origen: "codigo" });
    await avisarSeguro(avisar, `🔑 MLABS: @${m.usuario} se activó con el código de acceso.`);
    return { ok: true };
  }
  const c = String(correo ?? "").trim();
  if (!CORREO.test(c)) return { ok: false, error: "Escribe un correo válido." };
  const precio = Number.parseInt(env.MLABS_PRECIO, 10);
  if (!(precio > 0)) return { ok: false, error: "El cobro no está configurado todavía." };
  let s;
  try {
    s = await mp.crearSuscripcion({ cuenta, correo: c, precio, backUrl: BACK });
  } catch (e) {
    // Con credenciales de prueba, Mercado Pago rechaza un correo que no sea el de la cuenta compradora.
    if (e?.status === 400 && /user bad request/i.test(e.message)) return { ok: false, error: "Ese correo no es el de tu cuenta de Mercado Pago" };
    throw e;
  }
  await guardarMarca(r, cuenta, { ...m, correo: c });
  // La suscripción nueva REEMPLAZA a la anterior (si la marca se cancela y vuelve): si no, aplicarSuscripcion ignoraría el id nuevo.
  await guardarSuscripcion(r, cuenta, { id_mp: s.id, estado_mp: "pending", proximo_cobro: null, fin_gratis: null, fin_servicio: null });
  return { ok: true, ir: s.init_point };
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
  // Solo cuenta la suscripción vigente de la marca; las viejas o desconocidas no tocan nada.
  const susc = await leerSuscripcion(r, cuenta);
  if (!susc?.id_mp || susc.id_mp !== pre.id || (cobro && cobro.preapproval_id !== susc.id_mp)) return "ignorado";
  const antes = m.estado;
  let { marca, suscripcion } = aplicarSuscripcion(m, susc, pre, ahora());
  if (cobro) marca = aplicarCobro(marca, cobro);
  await guardarMarca(r, cuenta, marca);
  if (suscripcion) await guardarSuscripcion(r, cuenta, suscripcion);
  if (marca.estado !== antes) {
    const texto = { activa: "✅ suscripción activa", pago_fallido: "⚠️ pago fallido (Mercado Pago reintenta)", cancelada: "🛑 suscripción cancelada" }[marca.estado];
    if (texto) await avisarSeguro(avisar, `MLABS @${marca.usuario}: ${texto}.`);
  }
  return marca.estado;
}

// fin_servicio se guarda ANTES del PUT: si el aviso «cancelled» se adelanta, la marca sigue activa hasta esa fecha (no se corta en seco).
export async function cancelar({ r, mp }, cuenta) {
  const s = await leerSuscripcion(r, cuenta);
  if (!s?.id_mp) return { ok: false, error: "No tienes una suscripción activa." };
  const hasta = s.fin_servicio ?? s.proximo_cobro ?? s.fin_gratis ?? null;
  await guardarSuscripcion(r, cuenta, { ...s, fin_servicio: hasta });
  try {
    await mp.cancelarSuscripcion({ id: s.id_mp });
  } catch (e) {
    const actual = (await leerSuscripcion(r, cuenta)) ?? s;
    await guardarSuscripcion(r, cuenta, { ...actual, fin_servicio: s.fin_servicio ?? null });
    throw e;
  }
  return { ok: true, hasta };
}
