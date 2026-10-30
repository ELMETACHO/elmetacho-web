import { test } from "node:test";
import assert from "node:assert/strict";
import { redisMemoria } from "../../../admin/lib/instagram/redis-memoria.js";
import { activar, cancelar, recibirAviso, vistaEstado } from "./cobro.js";
import { altaMarca, guardarMarca, guardarSuscripcion, leerMarca, leerSuscripcion } from "./marcas.js";

const DIA = 864e5;
const env = { MLABS_PRECIO: "59900", MLABS_CODIGO_REVISION: "META-REVISA" };
const mpFalso = (sobre = {}) => ({
  crearSuscripcion: async (x) => ({ id: "P1", init_point: `https://mp/${x.cuenta}` }),
  consultarSuscripcion: async ({ id }) => ({ id, status: "authorized", external_reference: "1", next_payment_date: new Date(7 * DIA).toISOString() }),
  consultarCobro: async () => ({ status: "rejected", preapproval_id: "P1" }),
  cancelarSuscripcion: async () => ({}),
  ...sobre,
});
const nueva = async () => { const r = redisMemoria(); await altaMarca(r, { cuenta: "1", usuario: "tienda", ahora: () => 0 }); return r; };
const sinAviso = async () => {};
const poner = async (r, estado, extra = {}) => guardarMarca(r, "1", { ...(await leerMarca(r, "1")), estado, origen: "pago", ...extra });

test("activar con correo: crea la suscripción, guarda el correo y devuelve a dónde ir", async () => {
  const r = await nueva();
  const res = await activar({ r, env, mp: mpFalso(), ahora: () => 0, avisar: sinAviso }, "1", { correo: " a@b.co " });
  assert.deepEqual(res, { ok: true, ir: "https://mp/1" });
  assert.equal((await leerMarca(r, "1")).correo, "a@b.co");
  assert.equal((await leerSuscripcion(r, "1")).id_mp, "P1");
  assert.equal((await leerMarca(r, "1")).estado, "sin_pago");   // se activa con el aviso, no antes
});

test("correo inválido o precio sin configurar: error claro, nada se crea", async () => {
  const r = await nueva();
  assert.equal((await activar({ r, env, mp: mpFalso(), ahora: () => 0, avisar: sinAviso }, "1", { correo: "nope" })).ok, false);
  assert.equal((await activar({ r, env: {}, mp: mpFalso(), ahora: () => 0, avisar: sinAviso }, "1", { correo: "a@b.co" })).ok, false);
  assert.equal(await leerSuscripcion(r, "1"), null);
});

test("Mercado Pago responde 400 «User bad request»: se dice que el correo no es el de su cuenta (no es un error 502)", async () => {
  const r = await nueva();
  const mp = mpFalso({ crearSuscripcion: async () => { throw Object.assign(new Error("User bad request"), { status: 400 }); } });
  const res = await activar({ r, env, mp, ahora: () => 0, avisar: sinAviso }, "1", { correo: "a@b.co" });
  assert.deepEqual(res, { ok: false, error: "Ese correo no es el de tu cuenta de Mercado Pago" });
  assert.equal(await leerSuscripcion(r, "1"), null);
  // cualquier otro fallo de Mercado Pago sí se propaga (la ruta lo vuelve 502)
  const caido = mpFalso({ crearSuscripcion: async () => { throw Object.assign(new Error("invalid currency"), { status: 400 }); } });
  await assert.rejects(activar({ r, env, mp: caido, ahora: () => 0, avisar: sinAviso }, "1", { correo: "a@b.co" }), /invalid currency/);
});

test("código de acceso correcto activa sin pago; incorrecto o variable vacía, no", async () => {
  const r = await nueva(), avisos = [];
  assert.equal((await activar({ r, env, mp: mpFalso(), ahora: () => 0, avisar: async (t) => avisos.push(t) }, "1", { codigo: "otro" })).ok, false);
  assert.equal((await activar({ r, env: { ...env, MLABS_CODIGO_REVISION: "" }, mp: mpFalso(), ahora: () => 0, avisar: sinAviso }, "1", { codigo: "x" })).ok, false);
  assert.equal((await activar({ r, env: {}, mp: mpFalso(), ahora: () => 0, avisar: sinAviso }, "1", { codigo: "undefined" })).ok, false);
  assert.equal((await leerMarca(r, "1")).estado, "sin_pago");
  assert.deepEqual(await activar({ r, env, mp: mpFalso(), ahora: () => 0, avisar: async (t) => avisos.push(t) }, "1", { codigo: "META-REVISA" }), { ok: true });
  const m = await leerMarca(r, "1");
  assert.equal(m.estado, "activa");
  assert.equal(m.origen, "codigo");
  assert.match(avisos.at(-1), /código/);
});

test("una marca que ya está activa no puede volver a activar (ni con pago ni con código)", async () => {
  const r = await nueva();
  await guardarMarca(r, "1", { ...(await leerMarca(r, "1")), estado: "activa", origen: "pago" });
  assert.equal((await activar({ r, env, mp: mpFalso(), ahora: () => 0, avisar: sinAviso }, "1", { correo: "a@b.co" })).ok, false);
  assert.equal((await activar({ r, env, mp: mpFalso(), ahora: () => 0, avisar: sinAviso }, "1", { codigo: "META-REVISA" })).ok, false);
  assert.equal((await leerMarca(r, "1")).origen, "pago");
});

test("volver a suscribirse tras cancelar: la suscripción nueva reemplaza a la vieja y su aviso sí se aplica", async () => {
  const r = await nueva(), avisos = [];
  await guardarMarca(r, "1", { ...(await leerMarca(r, "1")), estado: "cancelada", origen: "pago" });
  await guardarSuscripcion(r, "1", { id_mp: "VIEJA", estado_mp: "cancelled", proximo_cobro: DIA, fin_gratis: DIA, fin_servicio: DIA });
  const mp = mpFalso({
    crearSuscripcion: async () => ({ id: "NUEVA", init_point: "https://mp/n" }),
    consultarSuscripcion: async ({ id }) => ({ id, status: "cancelled", external_reference: "1" }),
  });
  await activar({ r, env, mp, ahora: () => 9 * DIA, avisar: sinAviso }, "1", { correo: "a@b.co" });
  const s = await leerSuscripcion(r, "1");
  assert.equal(s.id_mp, "NUEVA");
  assert.equal(s.fin_servicio, null);
  const d = { r, mp: mpFalso(), ahora: () => 9 * DIA, avisar: async (t) => avisos.push(t) };
  assert.equal(await recibirAviso(d, { tipo: "subscription_preapproval", id: "NUEVA" }), "activa");
  assert.equal(await recibirAviso(d, { tipo: "subscription_preapproval", id: "VIEJA" }), "ignorado");
  assert.equal((await leerMarca(r, "1")).estado, "activa");
});

const ahoraMp = (status) => mpFalso({ consultarSuscripcion: async ({ id }) => ({ id, status, external_reference: "1", next_payment_date: new Date(7 * DIA).toISOString() }) });

test("reintentar activar con la suscripción anterior ya authorized (el aviso no llegó): se aplica y NO se crea otra", async () => {
  const r = await nueva(); let creadas = 0;
  await guardarSuscripcion(r, "1", { id_mp: "P1", estado_mp: "pending", proximo_cobro: null, fin_gratis: null, fin_servicio: null });
  const mp = { ...ahoraMp("authorized"), crearSuscripcion: async () => { creadas++; return { id: "P2", init_point: "x" }; } };
  const res = await activar({ r, env, mp, ahora: () => 0, avisar: sinAviso }, "1", { correo: "a@b.co" });
  assert.deepEqual(res, { ok: true });
  assert.equal(creadas, 0);
  assert.equal((await leerMarca(r, "1")).estado, "activa");
  assert.equal((await leerSuscripcion(r, "1")).id_mp, "P1");
});

test("reintentar activar con la anterior pending: se cancela en Mercado Pago y se crea la nueva; si cancelarla falla, sigue", async () => {
  for (const falla of [false, true]) {
    const r = await nueva(), canceladas = [];
    await guardarSuscripcion(r, "1", { id_mp: "P1", estado_mp: "pending" });
    const mp = { ...ahoraMp("pending"), crearSuscripcion: async () => ({ id: "P2", init_point: "https://mp/p2" }),
      cancelarSuscripcion: async ({ id }) => { canceladas.push(id); if (falla) throw new Error("caído"); } };
    const res = await activar({ r, env, mp, ahora: () => 0, avisar: sinAviso }, "1", { correo: "a@b.co" });
    assert.deepEqual(res, { ok: true, ir: "https://mp/p2" });
    assert.deepEqual(canceladas, ["P1"]);
    assert.equal((await leerSuscripcion(r, "1")).id_mp, "P2");
  }
});

test("reintentar activar con la anterior cancelada o inexistente (404): se crea la nueva; otro error de Mercado Pago sube", async () => {
  const r = await nueva();
  await guardarSuscripcion(r, "1", { id_mp: "P1" });
  const crea = { crearSuscripcion: async () => ({ id: "P2", init_point: "https://mp/p2" }) };
  const c = { ...ahoraMp("cancelled"), ...crea };
  assert.equal((await activar({ r, env, mp: c, ahora: () => 0, avisar: sinAviso }, "1", { correo: "a@b.co" })).ir, "https://mp/p2");
  await guardarSuscripcion(r, "1", { id_mp: "P1" });
  const n = mpFalso({ ...crea, consultarSuscripcion: async () => { throw Object.assign(new Error("not found"), { status: 404 }); } });
  assert.equal((await activar({ r, env, mp: n, ahora: () => 0, avisar: sinAviso }, "1", { correo: "a@b.co" })).ir, "https://mp/p2");
  await guardarSuscripcion(r, "1", { id_mp: "P1" });
  const e = mpFalso({ consultarSuscripcion: async () => { throw Object.assign(new Error("boom"), { status: 500 }); } });
  await assert.rejects(activar({ r, env, mp: e, ahora: () => 0, avisar: sinAviso }, "1", { correo: "a@b.co" }), /boom/);
});

test("los 7 días gratis son solo la primera vez: tras haberlos usado, la suscripción nueva va sin free_trial", async () => {
  const r = await nueva(), pedidos = [];
  const mp = mpFalso({ crearSuscripcion: async (x) => { pedidos.push(x.gratis); return { id: `P${pedidos.length}`, init_point: "x" }; },
    consultarSuscripcion: async ({ id }) => ({ id, status: id === "P1" ? "authorized" : "cancelled", external_reference: "1", next_payment_date: new Date(7 * DIA).toISOString() }) });
  const d = { r, env, mp, ahora: () => 0, avisar: sinAviso };
  await activar(d, "1", { correo: "a@b.co" });                                         // primera vez: con gratis
  await recibirAviso(d, { tipo: "subscription_preapproval", id: "P1" });                // authorized: fija fin_gratis y uso_gratis
  assert.equal((await leerMarca(r, "1")).uso_gratis, true);
  await guardarMarca(r, "1", { ...(await leerMarca(r, "1")), estado: "cancelada" });
  const vuelve = { ...d, mp: { ...mp, consultarSuscripcion: async ({ id }) => ({ id, status: "cancelled", external_reference: "1" }) } };
  await activar(vuelve, "1", { correo: "a@b.co" });   // vuelve a suscribirse
  await activar(vuelve, "1", { correo: "a@b.co" });   // y reintenta: sigue sin gratis aunque la suscripción se reemplace
  assert.deepEqual(pedidos, [true, false, false]);
  assert.equal((await leerMarca(r, "1")).uso_gratis, true);
});

test("aviso de suscripción: consulta Mercado Pago y activa; repetido no avisa dos veces", async () => {
  const r = await nueva(), avisos = [];
  await guardarSuscripcion(r, "1", { id_mp: "P1" });
  const d = { r, mp: mpFalso(), ahora: () => 0, avisar: async (t) => avisos.push(t) };
  assert.equal(await recibirAviso(d, { tipo: "subscription_preapproval", id: "P1" }), "activa");
  assert.equal(await recibirAviso(d, { tipo: "subscription_preapproval", id: "P1" }), "activa");
  assert.equal((await leerMarca(r, "1")).estado, "activa");
  assert.equal(avisos.length, 1);
});

test("avisos en desorden: lo que manda es lo que Mercado Pago dice ahora", async () => {
  const r = await nueva();
  await guardarSuscripcion(r, "1", { id_mp: "P1" });
  const aviso = { tipo: "subscription_preapproval", id: "P1" };
  const vigente = { r, mp: mpFalso(), ahora: () => 0, avisar: sinAviso };
  assert.equal(await recibirAviso(vigente, aviso), "activa");
  // Mercado Pago ya canceló (y el servicio pagado terminó): el aviso «authorized» que llega tarde no resucita nada
  const cancelada = mpFalso({ consultarSuscripcion: async ({ id }) => ({ id, status: "cancelled", external_reference: "1" }) });
  const tarde = { r, mp: cancelada, ahora: () => 8 * DIA, avisar: sinAviso };
  assert.equal(await recibirAviso(tarde, aviso), "cancelada");
  assert.equal(await recibirAviso(tarde, aviso), "cancelada");
  assert.equal((await leerMarca(r, "1")).estado, "cancelada");
});

test("cobro rechazado → pago_fallido y aviso; cuenta desconocida se ignora", async () => {
  const r = await nueva(), avisos = [];
  await guardarSuscripcion(r, "1", { id_mp: "P1" });
  const d = { r, mp: mpFalso(), ahora: () => 0, avisar: async (t) => avisos.push(t) };
  await recibirAviso(d, { tipo: "subscription_preapproval", id: "P1" });
  assert.equal(await recibirAviso(d, { tipo: "subscription_authorized_payment", id: "C1" }), "pago_fallido");
  assert.match(avisos.at(-1), /pago/);
  const otra = mpFalso({ consultarSuscripcion: async ({ id }) => ({ id, status: "authorized", external_reference: "999" }) });
  assert.equal(await recibirAviso({ ...d, mp: otra }, { tipo: "subscription_preapproval", id: "P9" }), "sin cuenta");
});

test("cobro de otra suscripción (no la vigente de la marca): se ignora sin tocar nada", async () => {
  const r = await nueva();
  await guardarSuscripcion(r, "1", { id_mp: "NUEVA" });
  await guardarMarca(r, "1", { ...(await leerMarca(r, "1")), estado: "activa", origen: "pago" });
  const mp = mpFalso({ consultarCobro: async () => ({ status: "rejected", preapproval_id: "VIEJA" }) });
  assert.equal(await recibirAviso({ r, mp, ahora: () => 0, avisar: sinAviso }, { tipo: "subscription_authorized_payment", id: "C1" }), "ignorado");
  assert.equal((await leerMarca(r, "1")).estado, "activa");
  assert.equal((await leerSuscripcion(r, "1")).id_mp, "NUEVA");
});

test("aviso de una suscripción que la marca nunca creó se ignora; tipos desconocidos y objetos que no existen también", async () => {
  const r = await nueva();
  const d = { r, mp: mpFalso(), ahora: () => 0, avisar: sinAviso };
  const pendiente = mpFalso({ consultarSuscripcion: async ({ id }) => ({ id, status: "pending", external_reference: "1" }) });
  assert.equal(await recibirAviso({ ...d, mp: pendiente }, { tipo: "subscription_preapproval", id: "P1" }), "ignorado");   // sin suscripción guardada y sin autorizar
  assert.equal((await leerMarca(r, "1")).estado, "sin_pago");
  assert.equal(await recibirAviso(d, { tipo: "payment", id: "1" }), "ignorado");
  const noExiste = mpFalso({ consultarSuscripcion: async () => { throw Object.assign(new Error("not found"), { status: 404 }); } });
  assert.equal(await recibirAviso({ ...d, mp: noExiste }, { tipo: "subscription_preapproval", id: "123456" }), "ignorado");
  const caido = mpFalso({ consultarSuscripcion: async () => { throw Object.assign(new Error("boom"), { status: 500 }); } });
  await assert.rejects(recibirAviso({ ...d, mp: caido }, { tipo: "subscription_preapproval", id: "P1" }), /boom/);   // este sí se reintenta
});

test("cancelar en días gratis: sigue hasta fin_gratis y guarda fin_servicio", async () => {
  const r = await nueva();
  await poner(r, "activa");
  await guardarSuscripcion(r, "1", { id_mp: "P1", proximo_cobro: 7 * DIA, fin_gratis: 7 * DIA });
  const res = await cancelar({ r, mp: mpFalso() }, "1");
  assert.deepEqual(res, { ok: true, hasta: 7 * DIA });
  assert.equal((await leerSuscripcion(r, "1")).fin_servicio, 7 * DIA);
});

test("cancelar usa el next_payment_date que Mercado Pago dice ahora (no el guardado, que puede estar viejo); si la consulta falla, el guardado", async () => {
  const r = await nueva();
  await poner(r, "activa");
  await guardarSuscripcion(r, "1", { id_mp: "P1", proximo_cobro: 1 * DIA });
  assert.deepEqual(await cancelar({ r, mp: mpFalso() }, "1"), { ok: true, hasta: 7 * DIA });
  await guardarSuscripcion(r, "1", { id_mp: "P1", estado_mp: "authorized", proximo_cobro: 2 * DIA });
  const roto = mpFalso({ consultarSuscripcion: async () => { throw new Error("caído"); } });
  assert.deepEqual(await cancelar({ r, mp: roto }, "1"), { ok: true, hasta: 2 * DIA });
});

test("cancelar: si el PUT falla Y la reversión también falla, sube el error ORIGINAL de Mercado Pago", async () => {
  const r = await nueva();
  await poner(r, "activa");
  await guardarSuscripcion(r, "1", { id_mp: "P1", proximo_cobro: 7 * DIA });
  const mp = mpFalso({ cancelarSuscripcion: async () => { r.set = async () => { throw new Error("redis caído"); }; throw new Error("MP no pudo"); } });
  await assert.rejects(cancelar({ r, mp }, "1"), /MP no pudo/);
});

test("cancelar guarda fin_servicio ANTES del PUT: si el aviso «cancelled» llega antes de que el PUT responda, la marca sigue activa", async () => {
  const r = await nueva();
  const base = { r, mp: mpFalso(), ahora: () => 0, avisar: sinAviso };
  await guardarSuscripcion(r, "1", { id_mp: "P1" });
  await recibirAviso(base, { tipo: "subscription_preapproval", id: "P1" });   // activa, próximo cobro en 7 días
  let vistoDuranteElPut;
  const cancelada = mpFalso({ consultarSuscripcion: async ({ id }) => ({ id, status: "cancelled", external_reference: "1" }) });
  const mp = mpFalso({
    cancelarSuscripcion: async () => {
      vistoDuranteElPut = (await leerSuscripcion(r, "1")).fin_servicio;
      await recibirAviso({ ...base, mp: cancelada, ahora: () => 1 * DIA }, { tipo: "subscription_preapproval", id: "P1" });   // el aviso se adelanta al PUT
    },
  });
  assert.deepEqual(await cancelar({ r, mp }, "1"), { ok: true, hasta: 7 * DIA });
  assert.equal(vistoDuranteElPut, 7 * DIA);
  assert.equal((await leerMarca(r, "1")).estado, "activa");   // no se corta en seco
});

test("cancelar: si el PUT a Mercado Pago falla, se revierte fin_servicio y el error sube", async () => {
  const r = await nueva();
  await poner(r, "activa");
  await guardarSuscripcion(r, "1", { id_mp: "P1", proximo_cobro: 7 * DIA, fin_gratis: 7 * DIA });
  const mp = mpFalso({ cancelarSuscripcion: async () => { throw Object.assign(new Error("caído"), { status: 502 }); } });
  await assert.rejects(cancelar({ r, mp }, "1"), /caído/);
  const s = await leerSuscripcion(r, "1");
  assert.equal(s.fin_servicio ?? null, null);
  assert.equal(s.id_mp, "P1");
});

test("cancelar sin suscripción: error claro", async () => {
  assert.equal((await cancelar({ r: await nueva(), mp: mpFalso() }, "1")).ok, false);
});

test("vistaEstado expone uso_gratis: falso en una marca nueva, verdadero si la marca lo guarda o la suscripción tuvo fin_gratis", () => {
  const m = { usuario: "t", estado: "sin_pago", reconectar_desde: null };
  assert.equal(vistaEstado(m, null).uso_gratis, false);
  assert.equal(vistaEstado(m, { id_mp: "P1", fin_gratis: null }).uso_gratis, false);
  assert.equal(vistaEstado(m, { id_mp: "P1", fin_gratis: 0 }).uso_gratis, false);
  assert.equal(vistaEstado({ ...m, uso_gratis: true }, null).uso_gratis, true);
  assert.equal(vistaEstado(m, { id_mp: "P1", fin_gratis: 7 * DIA }).uso_gratis, true);
  assert.deepEqual(vistaEstado(m, null), { usuario: "t", estado: "sin_pago", casa: false, reconectar: false, suscripcion: null, uso_gratis: false });
});

test("C1: activar, NO pagar y cancelar (suscripción pending): no se guarda fin_servicio y el aviso «cancelled» deja la marca sin pago", async () => {
  const r = await nueva(); let puts = 0;
  await guardarSuscripcion(r, "1", { id_mp: "P1", estado_mp: "pending" });
  const pendiente = (status) => mpFalso({
    consultarSuscripcion: async ({ id }) => ({ id, status, external_reference: "1", next_payment_date: new Date(7 * DIA).toISOString() }),
    cancelarSuscripcion: async () => { puts++; },
  });
  assert.deepEqual(await cancelar({ r, mp: pendiente("pending") }, "1"), { ok: true, hasta: null });
  assert.equal(puts, 1);
  assert.equal((await leerSuscripcion(r, "1")).fin_servicio ?? null, null);
  await recibirAviso({ r, mp: pendiente("cancelled"), ahora: () => 1 * DIA, avisar: sinAviso }, { tipo: "subscription_preapproval", id: "P1" });
  assert.equal((await leerMarca(r, "1")).estado, "sin_pago");
  assert.equal((await leerMarca(r, "1")).uso_gratis ?? false, false);
});

test("cancelar con la marca pago_fallido: no se guarda fin_servicio y el aviso la deja cancelada de inmediato", async () => {
  const r = await nueva();
  await guardarSuscripcion(r, "1", { id_mp: "P1", estado_mp: "authorized", proximo_cobro: 7 * DIA });
  await poner(r, "pago_fallido");
  assert.deepEqual(await cancelar({ r, mp: mpFalso() }, "1"), { ok: true, hasta: null });
  const cancelada = mpFalso({ consultarSuscripcion: async ({ id }) => ({ id, status: "cancelled", external_reference: "1", next_payment_date: new Date(7 * DIA).toISOString() }) });
  assert.equal(await recibirAviso({ r, mp: cancelada, ahora: () => 1 * DIA, avisar: sinAviso }, { tipo: "subscription_preapproval", id: "P1" }), "cancelada");
});

test("doble clic en Activar: llega authorized la suscripción que NO quedó guardada y la guardada está pending → se adopta, se cancela la otra y se aplica", async () => {
  const r = await nueva(), avisos = [], canceladas = [];
  await guardarSuscripcion(r, "1", { id_mp: "B", estado_mp: "pending" });   // la que ganó la escritura
  const mp = mpFalso({
    consultarSuscripcion: async ({ id }) => ({ id, status: id === "A" ? "authorized" : "pending", external_reference: "1", next_payment_date: new Date(7 * DIA).toISOString() }),
    cancelarSuscripcion: async ({ id }) => { canceladas.push(id); },
  });
  assert.equal(await recibirAviso({ r, mp, ahora: () => 0, avisar: async (t) => avisos.push(t) }, { tipo: "subscription_preapproval", id: "A" }), "activa");
  assert.equal((await leerSuscripcion(r, "1")).id_mp, "A");
  assert.equal((await leerSuscripcion(r, "1")).fin_gratis, 7 * DIA);
  assert.deepEqual(canceladas, ["B"]);
  assert.equal((await leerMarca(r, "1")).estado, "activa");
});

test("adopción con un cobro aprobado de la suscripción no guardada; también si no había ninguna guardada", async () => {
  const r = await nueva();
  const mp = mpFalso({ consultarCobro: async () => ({ status: "approved", preapproval_id: "A" }),
    consultarSuscripcion: async ({ id }) => ({ id, status: "authorized", external_reference: "1", next_payment_date: new Date(30 * DIA).toISOString() }) });
  assert.equal(await recibirAviso({ r, mp, ahora: () => 0, avisar: sinAviso }, { tipo: "subscription_authorized_payment", id: "C1" }), "activa");
  assert.equal((await leerSuscripcion(r, "1")).id_mp, "A");
});

test("dos suscripciones authorized: no se toca nada y se avisa a Oscar con los dos ids", async () => {
  const r = await nueva(), avisos = [];
  await guardarSuscripcion(r, "1", { id_mp: "B", estado_mp: "authorized" });
  await poner(r, "activa");
  const mp = mpFalso();   // por defecto toda suscripción consultada está authorized
  assert.equal(await recibirAviso({ r, mp, ahora: () => 0, avisar: async (t) => avisos.push(t) }, { tipo: "subscription_preapproval", id: "A" }), "ignorado");
  assert.equal((await leerSuscripcion(r, "1")).id_mp, "B");
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /A/);
  assert.match(avisos[0], /B/);
});

test("M2: el código de revisión se compara contra la variable recortada", async () => {
  const r = await nueva();
  const res = await activar({ r, env: { ...env, MLABS_CODIGO_REVISION: "  META-REVISA \n" }, mp: mpFalso(), ahora: () => 0, avisar: sinAviso }, "1", { codigo: "META-REVISA" });
  assert.deepEqual(res, { ok: true });
  const r2 = await nueva();
  assert.equal((await activar({ r: r2, env: { ...env, MLABS_CODIGO_REVISION: "   " }, mp: mpFalso(), ahora: () => 0, avisar: sinAviso }, "1", { codigo: " " })).ok, false);
});

test("M-1: aviso de una cuenta sin ficha (se desconectó y se borró): 'sin cuenta' y no crea ficha ni suscripción", async () => {
  const r = redisMemoria();
  assert.equal(await recibirAviso({ r, mp: mpFalso(), ahora: () => 0, avisar: sinAviso }, { tipo: "subscription_preapproval", id: "P1" }), "sin cuenta");
  assert.equal(await r.get("ig:1:marca"), null);
  assert.equal(await r.get("ig:1:suscripcion"), null);
});

test("M-1: si la ficha se borra mientras se atiende el aviso, tampoco se recrea", async () => {
  const r = await nueva();
  await guardarSuscripcion(r, "1", { id_mp: "P0", estado_mp: "pending" });
  const mp = mpFalso({ consultarSuscripcion: async ({ id }) => {
    if (id === "P0") { await r.del("ig:1:marca"); await r.del("ig:1:suscripcion"); return { id, status: "cancelled", external_reference: "1" }; }
    return { id, status: "authorized", external_reference: "1", next_payment_date: new Date(7 * DIA).toISOString() };
  } });
  assert.equal(await recibirAviso({ r, mp, ahora: () => 0, avisar: sinAviso }, { tipo: "subscription_preapproval", id: "P1" }), "sin cuenta");
  assert.equal(await r.get("ig:1:marca"), null);
  assert.equal(await r.get("ig:1:suscripcion"), null);
});
