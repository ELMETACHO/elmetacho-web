import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { aplicarCobro, aplicarSuscripcion, cancelarSuscripcion, consultarCobro, consultarSuscripcion, crearSuscripcion, firmaMpValida } from "./mercadopago.js";

const DIA = 864e5;
const marca = (estado = "sin_pago") => ({ usuario: "t", estado, origen: null, reconectar_desde: null });

test("crear: POST /preapproval con COP, 7 días gratis, referencia = cuenta", async () => {
  let pedido;
  const f = async (url, op) => { pedido = { url, op, cuerpo: JSON.parse(op.body) }; return new Response(JSON.stringify({ id: "P1", init_point: "https://mp/checkout" }), { status: 201 }); };
  const r = await crearSuscripcion({ cuenta: "17841", correo: "a@b.co", precio: 59900, backUrl: "https://mlabs.elmetacho.com/panel", token: "T", fetch: f });
  assert.deepEqual(r, { id: "P1", init_point: "https://mp/checkout" });
  assert.equal(pedido.url, "https://api.mercadopago.com/preapproval");
  assert.equal(pedido.op.headers.Authorization, "Bearer T");
  assert.equal(pedido.cuerpo.external_reference, "17841");
  assert.equal(pedido.cuerpo.status, "pending");
  assert.deepEqual(pedido.cuerpo.auto_recurring, { frequency: 1, frequency_type: "months", transaction_amount: 59900, currency_id: "COP", free_trial: { frequency: 7, frequency_type: "days" } });
});

test("crear con gratis:false no manda free_trial", async () => {
  let cuerpo;
  const f = async (u, op) => { cuerpo = JSON.parse(op.body); return new Response(JSON.stringify({ id: "P1", init_point: "x" }), { status: 201 }); };
  await crearSuscripcion({ cuenta: "1", correo: "a@b.co", precio: 1, backUrl: "x", gratis: false, token: "T", fetch: f });
  assert.equal("free_trial" in cuerpo.auto_recurring, false);
});

test("errores de Mercado Pago se lanzan con su mensaje y su status HTTP", async () => {
  const f = async () => new Response(JSON.stringify({ message: "invalid currency" }), { status: 400 });
  await assert.rejects(crearSuscripcion({ cuenta: "1", correo: "a@b.co", precio: 1, backUrl: "x", token: "T", fetch: f }), (e) => e.message === "invalid currency" && e.status === 400);
  const g = async () => new Response("no es json", { status: 502 });
  await assert.rejects(consultarSuscripcion({ id: "P1", token: "T", fetch: g }), (e) => e.status === 502 && /502/.test(e.message));
});

test("consultar: GET de la suscripción y del cobro", async () => {
  const urls = [];
  const f = async (u, o) => { urls.push([u, o.method]); return new Response(JSON.stringify({ status: "x" })); };
  await consultarSuscripcion({ id: "P1", token: "T", fetch: f });
  await consultarCobro({ id: "C1", token: "T", fetch: f });
  assert.deepEqual(urls, [["https://api.mercadopago.com/preapproval/P1", "GET"], ["https://api.mercadopago.com/authorized_payments/C1", "GET"]]);
});

test("cancelar: PUT con status cancelled", async () => {
  let op;
  await cancelarSuscripcion({ id: "P1", token: "T", fetch: async (u, o) => { op = { u, o }; return new Response("{}"); } });
  assert.equal(op.u, "https://api.mercadopago.com/preapproval/P1");
  assert.equal(op.o.method, "PUT");
  assert.deepEqual(JSON.parse(op.o.body), { status: "cancelled" });
});

test("firma de los avisos: manifiesto id;request-id;ts y HMAC hex, con data.id en minúsculas", () => {
  const secreto = "s", ts = "1700000000", dataId = "P1", xRequestId = "req-1";
  const v1 = createHmac("sha256", secreto).update(`id:p1;request-id:${xRequestId};ts:${ts};`).digest("hex");
  assert.equal(firmaMpValida({ xSignature: `ts=${ts},v1=${v1}`, xRequestId, dataId, secreto }), true);
  assert.equal(firmaMpValida({ xSignature: `ts=${ts},v1=${v1}`, xRequestId, dataId: "P2", secreto }), false);
  assert.equal(firmaMpValida({ xSignature: null, xRequestId, dataId, secreto }), false);
  assert.equal(firmaMpValida({ xSignature: `ts=${ts},v1=${v1}`, xRequestId, dataId, secreto: "" }), false);
});

test("firma sin x-request-id: el manifiesto omite ese segmento", () => {
  const secreto = "s", ts = "1700000000";
  const v1 = createHmac("sha256", secreto).update(`id:p1;ts:${ts};`).digest("hex");
  assert.equal(firmaMpValida({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: null, dataId: "P1", secreto }), true);
  assert.equal(firmaMpValida({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "", dataId: "P1", secreto }), true);
  const con = createHmac("sha256", secreto).update(`id:p1;request-id:;ts:${ts};`).digest("hex");
  assert.equal(firmaMpValida({ xSignature: `ts=${ts},v1=${con}`, xRequestId: null, dataId: "P1", secreto }), false);
});

test("autorizada → activa con fin de días gratis y próximo cobro", () => {
  const pre = { id: "P1", status: "authorized", next_payment_date: new Date(7 * DIA).toISOString() };
  const { marca: m, suscripcion: s } = aplicarSuscripcion(marca(), { id_mp: "P1" }, pre, 0);
  assert.equal(m.estado, "activa");
  assert.equal(m.origen, "pago");
  assert.equal(s.estado_mp, "authorized");
  assert.equal(s.proximo_cobro, 7 * DIA);
  assert.equal(s.fin_gratis, 7 * DIA);
});

test("cancelada con fin_servicio en el futuro sigue activa; sin él o ya pasado, cancelada", () => {
  const pre = { id: "P1", status: "cancelled" };
  assert.equal(aplicarSuscripcion(marca("activa"), { id_mp: "P1", fin_servicio: 10 * DIA }, pre, 5 * DIA).marca.estado, "activa");
  assert.equal(aplicarSuscripcion(marca("activa"), { id_mp: "P1", fin_servicio: 10 * DIA }, pre, 11 * DIA).marca.estado, "cancelada");
  assert.equal(aplicarSuscripcion(marca("activa"), { id_mp: "P1" }, pre, 0).marca.estado, "cancelada");
  assert.equal(aplicarSuscripcion(marca("activa"), { id_mp: "P1" }, { id: "P1", status: "paused" }, 0).marca.estado, "cancelada");
});

test("pendiente no cambia nada; la cuenta con código de acceso no se toca", () => {
  assert.equal(aplicarSuscripcion(marca(), { id_mp: "P1" }, { id: "P1", status: "pending" }, 0).marca.estado, "sin_pago");
  const conCodigo = { ...marca("activa"), origen: "codigo" };
  assert.equal(aplicarSuscripcion(conCodigo, null, { id: "P1", status: "cancelled" }, 0).marca.estado, "activa");
});

test("aviso viejo de otra suscripción (id distinto al guardado) se ignora", () => {
  const susc = { id_mp: "P2", estado_mp: "authorized" };
  const r = aplicarSuscripcion(marca("activa"), susc, { id: "P1", status: "cancelled" }, 0);
  assert.equal(r.marca.estado, "activa");
  assert.deepEqual(r.suscripcion, susc);
});

test("avisos repetidos: aplicar dos veces el mismo dato da el mismo resultado", () => {
  const pre = { id: "P1", status: "authorized", next_payment_date: new Date(7 * DIA).toISOString() };
  const uno = aplicarSuscripcion(marca(), { id_mp: "P1" }, pre, 0);
  const dos = aplicarSuscripcion(uno.marca, uno.suscripcion, pre, 0);
  assert.deepEqual(dos, uno);
  const canc = { id: "P1", status: "cancelled" };
  const c1 = aplicarSuscripcion(uno.marca, { ...uno.suscripcion, fin_servicio: 10 * DIA }, canc, 5 * DIA);
  const c2 = aplicarSuscripcion(c1.marca, c1.suscripcion, canc, 5 * DIA);
  assert.deepEqual(c2, c1);
});

test("avisos en desorden: manda lo que MP dice ahora, y fin_gratis no se pisa con el cobro siguiente", () => {
  // La consulta ya dice cancelled: un aviso viejo de autorización no la revive.
  const canc = { id: "P1", status: "cancelled" };
  const a = aplicarSuscripcion(marca("activa"), { id_mp: "P1" }, canc, 0);
  const b = aplicarSuscripcion(a.marca, a.suscripcion, canc, 0);
  assert.equal(b.marca.estado, "cancelada");
  // Una consulta posterior que dice authorized conserva el fin_gratis original.
  const ok = { id: "P1", status: "authorized", next_payment_date: new Date(7 * DIA).toISOString() };
  const x = aplicarSuscripcion(marca(), { id_mp: "P1" }, ok, 0);
  const sig = { ...ok, next_payment_date: new Date(37 * DIA).toISOString() };
  const y = aplicarSuscripcion(x.marca, x.suscripcion, sig, 8 * DIA);
  assert.equal(y.suscripcion.fin_gratis, 7 * DIA);
  assert.equal(y.suscripcion.proximo_cobro, 37 * DIA);
});

test("cobro rechazado → pago_fallido; aprobado → activa; no revive una cancelada", () => {
  assert.equal(aplicarCobro(marca("activa"), { status: "rejected" }).estado, "pago_fallido");
  assert.equal(aplicarCobro(marca("pago_fallido"), { status: "approved" }).estado, "activa");
  assert.equal(aplicarCobro(marca("cancelada"), { status: "approved" }).estado, "cancelada");
  const conCodigo = { ...marca("activa"), origen: "codigo" };
  assert.equal(aplicarCobro(conCodigo, { status: "rejected" }), conCodigo);
  const r = aplicarCobro(marca("activa"), { status: "rejected" });
  assert.deepEqual(aplicarCobro(r, { status: "rejected" }), r);
});

test("cancelación externa: sin fin_servicio, sigue activa hasta el próximo cobro y luego se apaga", () => {
  const pre = { id: "P1", status: "cancelled", next_payment_date: new Date(7 * DIA).toISOString() };
  const durante = aplicarSuscripcion(marca("activa"), { id_mp: "P1" }, pre, 3 * DIA);
  assert.equal(durante.marca.estado, "activa");
  assert.equal(durante.suscripcion.fin_servicio, 7 * DIA);
  assert.equal(aplicarSuscripcion(durante.marca, durante.suscripcion, pre, 8 * DIA).marca.estado, "cancelada");
  assert.equal(aplicarSuscripcion(marca("activa"), { id_mp: "P1" }, pre, 8 * DIA).marca.estado, "cancelada");
  // un fin_servicio ya guardado manda sobre el próximo cobro
  assert.equal(aplicarSuscripcion(marca("activa"), { id_mp: "P1", fin_servicio: 2 * DIA }, pre, 3 * DIA).marca.estado, "cancelada");
});

test("pago_fallido que cancela queda cancelada de inmediato (no pagó el periodo en curso)", () => {
  const pre = { id: "P1", status: "cancelled" };
  const s = { id_mp: "P1", fin_servicio: 10 * DIA };
  assert.equal(aplicarSuscripcion(marca("pago_fallido"), s, pre, 5 * DIA).marca.estado, "cancelada");
  assert.equal(aplicarSuscripcion(marca("pago_fallido"), s, pre, 11 * DIA).marca.estado, "cancelada");
});

test("sin_pago que recibe cancelled/paused (aunque haya next_payment_date futuro) sigue sin pago: no hay servicio gratis", () => {
  const pre = { id: "P1", status: "cancelled", next_payment_date: new Date(7 * DIA).toISOString() };
  assert.equal(aplicarSuscripcion(marca("sin_pago"), { id_mp: "P1", fin_servicio: 7 * DIA }, pre, 0).marca.estado, "sin_pago");
  assert.equal(aplicarSuscripcion(marca("sin_pago"), { id_mp: "P1" }, { ...pre, status: "paused" }, 0).marca.estado, "sin_pago");
  assert.equal(aplicarSuscripcion(marca("cancelada"), { id_mp: "P1" }, pre, 0).marca.estado, "cancelada");
});
