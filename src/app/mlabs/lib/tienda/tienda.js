// tienda.js — lógica pura de la tienda de MLABS (spec docs/superpowers/specs/2026-11-16-mlabs-tienda-bold.md).
// Precio fijo por producto en COP y USD; la moneda sale de la cookie (selector manual) o del país de Vercel.
// Cobro con el botón de Bold, confirmación por webhook firmado (o por consulta a Bold) y entrega con link firmado.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const MONEDAS = ["COP", "USD"];
export const COOKIE_MONEDA = "mlabs_moneda";
export const ENTREGA_DIAS = 7;
const ID = /^MLABS-T-\d{13}-[a-f0-9]{6}$/;

// La tienda cobra solo con MLABS_TIENDA = "pruebas" (vista previa, llaves de prueba) o "real" (producción, con OK de Oscar).
export function modoTienda(env) {
  const m = env.MLABS_TIENDA;
  if (!["pruebas", "real"].includes(m)) return null;
  if (!env.BOLD_IDENTITY_KEY || !env.BOLD_SECRET_KEY || !env.MLABS_ENTREGA_SECRETO) return null;
  return m;
}

export function monedaPara({ cookie, pais }) {
  if (MONEDAS.includes(cookie)) return cookie;
  return String(pais || "").toUpperCase() === "CO" ? "COP" : "USD";
}

export const precioDe = (p, moneda) => {
  const v = p?.precios?.[moneda];
  return Number.isInteger(v) && v > 0 ? v : null;
};

export const sePuedeComprar = (p, modo) =>
  Boolean(modo) && p?.estado === "disponible" && MONEDAS.every((m) => precioDe(p, m)) && (Boolean(p.archivo) || p.creditos > 0) && (!p.soloPruebas || modo === "pruebas");

export function formatoMoneda(valor, moneda) {
  if (!(valor > 0)) return null;
  const n = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(valor);
  return moneda === "COP" ? `$${n} COP` : `US$${n}`;
}

export const nuevoPedidoId = (ahora, azarHex) => `MLABS-T-${String(ahora).padStart(13, "0")}-${azarHex}`;
export const esPedidoId = (s) => ID.test(String(s ?? ""));

// Firma de integridad del botón: SHA-256 de pedido + monto + moneda + llave secreta (docs del botón de Bold).
export const firmaIntegridad = (pedido, monto, moneda, secreta) => createHash("sha256").update(`${pedido}${monto}${moneda}${secreta}`).digest("hex");

const igualesHex = (a, b) => {
  const x = Buffer.from(String(a), "utf8"), y = Buffer.from(String(b), "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
};

// Webhook de Bold: x-bold-signature = hex(HMAC-SHA256(llave, base64(cuerpo crudo))). En pruebas Bold firma con llave vacía.
export function firmaWebhookValida(cuerpoCrudo, firma, llaves) {
  if (!firma) return false;
  const b64 = Buffer.from(cuerpoCrudo, "utf8").toString("base64");
  return llaves.some((k) => typeof k === "string" && igualesHex(createHmac("sha256", k).update(b64).digest("hex"), firma));
}

// Link de entrega: <pedido>.<vence>.<hmac>. Sin base de datos para validarlo; el pedido igual debe estar pagado.
export function tokenEntrega(pedido, vence, secreto) {
  const h = createHmac("sha256", secreto).update(`${pedido}.${vence}`).digest("hex").slice(0, 32);
  return `${pedido}.${vence}.${h}`;
}
export function leerTokenEntrega(token, secreto, ahora) {
  const [pedido, vence, h] = String(token ?? "").split(".");
  if (!esPedidoId(pedido) || !/^\d+$/.test(vence ?? "")) return null;
  if (!igualesHex(tokenEntrega(pedido, Number(vence), secreto), token)) return null;
  if (Number(vence) < ahora) return { pedido, vencido: true };
  return { pedido, vencido: false };
}

export function nuevoPedido({ id, producto, moneda, nombre, correo, ahora, modo }) {
  return {
    id, slug: producto.slug, nombre_producto: producto.nombre, moneda, monto: precioDe(producto, moneda),
    nombre: String(nombre ?? "").trim().slice(0, 80), correo: String(correo ?? "").trim().toLowerCase().slice(0, 120),
    creditos: producto.creditos > 0 ? producto.creditos : null,
    estado: "pendiente", modo, creado: new Date(ahora).toISOString(),
  };
}

export const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(c ?? "").trim());

/**
 * Confirma un pago (lo llama el webhook y también la página de resultado tras consultar a Bold). Idempotente.
 * pago = { referencia, total, moneda, estado: "APPROVED"|"REJECTED"|…, idBold, correo? }
 * almacen = { leerPedido(id), guardarPedido(p), registrarComprador(p), sumarCreditos?(correo, n) }
 */
export async function confirmarPago(pago, { almacen, ahora, avisar = async () => {} }) {
  if (!esPedidoId(pago.referencia)) return { estado: "ajeno" };   // pagos de /pagar u otros: no son de la tienda
  const p = await almacen.leerPedido(pago.referencia);
  if (!p) return { estado: "desconocido" };
  if (p.estado === "pagado") return { estado: "pagado", pedido: p, repetido: true };
  if (pago.estado !== "APPROVED") {
    if (pago.estado === "REJECTED" && p.estado === "pendiente") await almacen.guardarPedido({ ...p, estado: "rechazado", actualizado: new Date(ahora).toISOString() });
    return { estado: pago.estado === "REJECTED" ? "rechazado" : "pendiente", pedido: p };
  }
  // El monto y la moneda tienen que ser los del pedido: nadie entrega un producto por un pago distinto.
  if (Number(pago.total) !== p.monto || pago.moneda !== p.moneda) {
    await almacen.guardarPedido({ ...p, estado: "revisar", nota: `Pago ${pago.total} ${pago.moneda} ≠ ${p.monto} ${p.moneda}` });
    await avisar(`⚠️ MLABS tienda: el pago de ${p.id} no coincide (${pago.total} ${pago.moneda}, se esperaba ${p.monto} ${p.moneda}). No se entregó.`);
    return { estado: "revisar", pedido: p };
  }
  const pagado = { ...p, estado: "pagado", pagado: new Date(ahora).toISOString(), id_bold: pago.idBold ?? null };
  await almacen.guardarPedido(pagado);
  await almacen.registrarComprador(pagado);
  // Paquetes de Ahorra: el pago suma archivos al correo del pedido (no hay archivo que entregar).
  if (p.creditos > 0) await almacen.sumarCreditos(p.correo, p.creditos);
  await avisar(`💰 MLABS tienda${p.modo === "pruebas" ? " (PRUEBA)" : ""}: ${p.nombre_producto}\n${p.monto} ${p.moneda}\n${p.correo}\nPedido: ${p.id}`);
  return { estado: "pagado", pedido: pagado };
}

// Evento del webhook → pago. Solo SALE_APPROVED y SALE_REJECTED cambian algo.
export function pagoDeEvento(ev) {
  const d = ev?.data ?? {};
  const estado = ev?.type === "SALE_APPROVED" ? "APPROVED" : ev?.type === "SALE_REJECTED" ? "REJECTED" : null;
  if (!estado) return null;
  return { referencia: d.metadata?.reference, total: d.amount?.total, moneda: d.amount?.currency, estado, idBold: d.payment_id ?? ev.subject, correo: d.payer_email };
}
