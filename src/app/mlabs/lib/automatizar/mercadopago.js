// mercadopago.js — mensualidad de las marcas con suscripciones de Mercado Pago (spec 2026-10-26 §5).
// Doc: mercadopago.com.co/developers/es/docs/subscriptions (POST/GET/PUT /preapproval; avisos con x-signature).
import { createHmac } from "node:crypto";
import { iguales } from "../../../admin/lib/sesion.js";

const API = "https://api.mercadopago.com";
const PLAZO = 10000;

// Lanza un Error con `.status` (HTTP) y el `message` de Mercado Pago tal cual, para poder reconocer el 400 «User bad request».
async function llamar(f, token, metodo, ruta, cuerpo) {
  const r = await f(`${API}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(PLAZO),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(d?.message || `Mercado Pago respondió HTTP ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return d;
}

export async function crearSuscripcion({ cuenta, correo, precio, backUrl, token, fetch: f = fetch }) {
  const d = await llamar(f, token, "POST", "/preapproval", {
    reason: "MLABS Automatización Instagram",
    external_reference: cuenta,
    payer_email: correo,
    back_url: backUrl,
    auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: precio, currency_id: "COP", free_trial: { frequency: 7, frequency_type: "days" } },
    status: "pending",
  });
  return { id: d.id, init_point: d.init_point };
}

export const consultarSuscripcion = ({ id, token, fetch: f = fetch }) => llamar(f, token, "GET", `/preapproval/${encodeURIComponent(id)}`);
export const consultarCobro = ({ id, token, fetch: f = fetch }) => llamar(f, token, "GET", `/authorized_payments/${encodeURIComponent(id)}`);
export const cancelarSuscripcion = ({ id, token, fetch: f = fetch }) => llamar(f, token, "PUT", `/preapproval/${encodeURIComponent(id)}`, { status: "cancelled" });

// Manifiesto: `id:<data.id en minúsculas>;request-id:<x-request-id>;ts:<ts>;`, omitiendo los segmentos cuyo dato falte.
export function firmaMpValida({ xSignature, xRequestId, dataId, secreto }) {
  if (!secreto || typeof xSignature !== "string") return false;
  const partes = Object.fromEntries(xSignature.split(",").map((p) => p.trim().split("=")));
  if (!partes.ts || !partes.v1) return false;
  const manifiesto = [
    dataId ? `id:${String(dataId).toLowerCase()};` : "",
    xRequestId ? `request-id:${xRequestId};` : "",
    `ts:${partes.ts};`,
  ].join("");
  return iguales(partes.v1, createHmac("sha256", secreto).update(manifiesto).digest("hex"));
}

const fecha = (s) => (s ? Date.parse(s) || null : null);

// Traduce la suscripción que devuelve Mercado Pago al estado de la marca. Las cuentas con código de acceso no se tocan.
// Es idempotente: `pre` es lo que Mercado Pago dice ahora, y fin_gratis se fija una sola vez.
export function aplicarSuscripcion(marca, susc, pre, ahoraMs) {
  if (marca.origen === "codigo" || (susc?.id_mp && susc.id_mp !== pre.id)) return { marca, suscripcion: susc };
  const base = { ...(susc ?? {}), id_mp: susc?.id_mp ?? pre.id, estado_mp: pre.status, proximo_cobro: fecha(pre.next_payment_date) ?? susc?.proximo_cobro ?? null };
  if (pre.status === "authorized") {
    return { marca: { ...marca, estado: marca.estado === "pago_fallido" ? "pago_fallido" : "activa", origen: "pago" }, suscripcion: { ...base, fin_gratis: base.fin_gratis ?? base.proximo_cobro } };
  }
  if (pre.status === "cancelled" || pre.status === "paused") {
    const sigue = base.fin_servicio && base.fin_servicio > ahoraMs;
    return { marca: { ...marca, estado: sigue ? "activa" : "cancelada" }, suscripcion: base };
  }
  return { marca, suscripcion: base };   // pending u otros: nada cambia
}

export function aplicarCobro(marca, cobro) {
  if (marca.estado === "cancelada" || marca.origen === "codigo") return marca;
  if (cobro.status === "rejected") return { ...marca, estado: "pago_fallido" };
  if (cobro.status === "approved" || cobro.status === "processed") return { ...marca, estado: "activa" };
  return marca;
}
