// servidor.js — dependencias reales de la tienda: Redis (pedidos y compradores), Bold (consulta de pago) y Telegram.
import { issueSignedToken, presignUrl } from "@vercel/blob";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { confirmarPago } from "./tienda.js";
import { claveSaldo, GRATIS } from "../ahorra/creditos.js";

const clavePedido = (id) => `mlabs:tienda:pedido:${id}`;
export const COMPRADORES = "mlabs:tienda:compradores";

export const almacenTienda = (r) => ({
  leerPedido: async (id) => { const v = await r.get(clavePedido(id)); return v ? JSON.parse(v) : null; },
  guardarPedido: (p) => r.set(clavePedido(p.id), JSON.stringify(p)),
  registrarComprador: (p) =>
    r.rPush(COMPRADORES, JSON.stringify({ pedido: p.id, slug: p.slug, nombre: p.nombre, correo: p.correo, monto: p.monto, moneda: p.moneda, modo: p.modo, pagado: p.pagado })),
  // Bold reintenta: cada evento se procesa una sola vez (30 días).
  eventoNuevo: async (id) => Boolean(await r.set(`mlabs:bold:evento:${id}`, "1", { NX: true, EX: 60 * 60 * 24 * 30 })),
  olvidarEvento: (id) => r.del(`mlabs:bold:evento:${id}`),
  // Si la persona nunca usó los gratis, primero recibe sus 3 y luego el paquete.
  sumarCreditos: async (correo, n) => { await r.set(claveSaldo(correo), String(GRATIS), { NX: true }); await r.incrBy(claveSaldo(correo), n); },
});

export async function avisarTelegram(texto) {
  const { TELEGRAM_BOT_TOKEN: t, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!t || !chat) return;
  await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text: texto.slice(0, 4000) }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
}

// Estado real en Bold (no se confía en lo que diga el navegador). Mismo servicio que /api/bold/estado.
export async function consultarBold(pedido) {
  const r = await fetch(`https://payments.api.bold.co/v2/payment-voucher/${pedido}`, {
    headers: { Authorization: `x-api-key ${process.env.BOLD_IDENTITY_KEY}` }, cache: "no-store", signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!r?.ok) return null;
  const v = await r.json();
  return { referencia: pedido, estado: v.payment_status, total: v.total, moneda: v.currency ?? null, idBold: v.transaction_id ?? null };
}

// La página de resultado confirma con Bold si el webhook aún no llegó (Bold avisa hasta 10 min después).
export async function confirmarConBold(pedidoId) {
  return conRedis(async (r) => {
    const almacen = almacenTienda(r);
    const p = await almacen.leerPedido(pedidoId);
    if (!p || p.estado !== "pendiente") return { estado: p?.estado ?? "desconocido", pedido: p };
    const pago = await consultarBold(pedidoId);
    if (!pago) return { estado: "pendiente", pedido: p };
    return confirmarPago({ ...pago, moneda: pago.moneda ?? p.moneda }, { almacen, ahora: Date.now(), avisar: avisarTelegram });
  });
}

// Link de descarga de Blob privado: vale 15 minutos (el link de entrega firmado vale 7 días y genera uno nuevo cada vez).
export async function enlaceArchivo(pathname) {
  const validUntil = Date.now() + 15 * 60e3;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  return (await presignUrl(token, { operation: "get", pathname, access: "private", validUntil })).presignedUrl;
}
