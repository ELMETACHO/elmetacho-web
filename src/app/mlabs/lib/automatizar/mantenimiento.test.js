// mantenimiento.test.js — cron diario: tokens, apagado de lo vencido y borrado a los 30 días sin reconectar (spec 2026-10-26 §6).
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { redisMemoria } from "../../../admin/lib/instagram/redis-memoria.js";
import { guardarToken } from "../../../admin/lib/instagram/token.js";
import { altaMarca, guardarMarca, guardarSuscripcion, leerMarca, leerSuscripcion } from "./marcas.js";
import { mantenerCuentas } from "./mantenimiento.js";

const DIA = 864e5;
const env = { MLABS_CLAVE_TOKENS: randomBytes(32).toString("base64"), IG_CUENTA_PALABRAS: "222", IG_TOKEN_LABS: "V" };
const base = (r, extra = {}) => ({ r, env, renovar: async () => ({ access_token: "x", expires_in: 1 }), avisar: async () => {}, desconectar: async () => {}, ...extra });
async function marcaActiva(r, cuenta, susc, extra = {}) {
  await altaMarca(r, { cuenta, usuario: `u${cuenta}`, ahora: () => 0 });
  await guardarToken(r, env, cuenta, `T${cuenta}`, 1000 * DIA);
  await guardarMarca(r, cuenta, { ...(await leerMarca(r, cuenta)), estado: "activa", origen: "pago", ...extra });
  await guardarSuscripcion(r, cuenta, susc);
}

test("renueva casa y clientes; cierra la cancelada vencida; borra a quien lleva 30 días sin reconectar", async () => {
  const r = redisMemoria(), ahora = () => 100 * DIA, borrados = [], renovados = [];
  for (const c of ["1", "2", "3"]) { await altaMarca(r, { cuenta: c, usuario: `u${c}`, ahora: () => 0 }); await guardarToken(r, env, c, `T${c}`, 0); }
  await guardarMarca(r, "1", { ...(await leerMarca(r, "1")), estado: "activa" });
  await guardarMarca(r, "2", { ...(await leerMarca(r, "2")), estado: "activa" });
  await guardarSuscripcion(r, "2", { id_mp: "P2", estado_mp: "cancelled", fin_servicio: 99 * DIA });
  await guardarMarca(r, "3", { ...(await leerMarca(r, "3")), reconectar_desde: 69 * DIA });
  const res = await mantenerCuentas({
    r, env, ahora,
    renovar: async (t) => { renovados.push(t); return { access_token: `${t}n`, expires_in: 60 * 86400 }; },
    avisar: async () => {},
    desconectar: async (c) => borrados.push(c),
  });
  assert.equal((await leerMarca(r, "2")).estado, "cancelada");
  assert.deepEqual(borrados, ["3"]);
  assert.deepEqual(renovados.sort(), ["T1", "T2", "V"]);
  assert.equal(res["3"], "borrada (30 días sin reconectar)");
  assert.equal(res["222"], "renovado");
});

test("cancelada en días gratis sigue activa hasta fin_servicio y luego se apaga", async () => {
  const r = redisMemoria();
  await marcaActiva(r, "1", { id_mp: "P1", estado_mp: "cancelled", fin_gratis: 7 * DIA, fin_servicio: 7 * DIA });
  const d = base(r);
  await mantenerCuentas({ ...d, ahora: () => 6 * DIA });
  assert.equal((await leerMarca(r, "1")).estado, "activa");
  await mantenerCuentas({ ...d, ahora: () => 8 * DIA });
  assert.equal((await leerMarca(r, "1")).estado, "cancelada");
});

test("con Mercado Pago: fin_gratis vencido y la suscripción ya no está authorized → se apaga; si sigue authorized (pagó) → sigue activa", async () => {
  const r = redisMemoria();
  await marcaActiva(r, "1", { id_mp: "P1", estado_mp: "authorized", fin_gratis: 7 * DIA });
  await marcaActiva(r, "2", { id_mp: "P2", estado_mp: "authorized", fin_gratis: 7 * DIA });
  const mp = { consultarSuscripcion: async ({ id }) => ({ id, status: id === "P1" ? "cancelled" : "authorized", next_payment_date: new Date(7 * DIA).toISOString() }) };
  await mantenerCuentas({ ...base(r), mp, ahora: () => 10 * DIA });
  assert.equal((await leerMarca(r, "1")).estado, "cancelada");
  assert.equal((await leerSuscripcion(r, "1")).estado_mp, "cancelled");
  assert.equal((await leerMarca(r, "2")).estado, "activa");
});

test("con Mercado Pago: si dice authorized, no se apaga aunque fin_servicio esté vencido; si no responde, tampoco", async () => {
  const r = redisMemoria();
  await marcaActiva(r, "1", { id_mp: "P1", estado_mp: "cancelled", fin_servicio: 5 * DIA });
  await marcaActiva(r, "2", { id_mp: "P2", estado_mp: "cancelled", fin_servicio: 5 * DIA });
  const mp = { consultarSuscripcion: async ({ id }) => { if (id === "P2") throw new Error("caído"); return { id, status: "authorized" }; } };
  const res = await mantenerCuentas({ ...base(r), mp, ahora: () => 10 * DIA });
  assert.equal((await leerMarca(r, "1")).estado, "activa");
  assert.equal((await leerMarca(r, "2")).estado, "activa");
  assert.equal(res["2"], "vigente");   // sigue su curso normal: el token no necesita renovarse todavía
});

test("las cuentas con código de acceso no se apagan por fechas", async () => {
  const r = redisMemoria();
  await marcaActiva(r, "1", { id_mp: "P1", fin_servicio: 5 * DIA }, { origen: "codigo" });
  await mantenerCuentas({ ...base(r), ahora: () => 10 * DIA });
  assert.equal((await leerMarca(r, "1")).estado, "activa");
});

test("un error en una cuenta no detiene a las demás", async () => {
  const r = redisMemoria();
  for (const c of ["1", "2"]) { await altaMarca(r, { cuenta: c, usuario: c, ahora: () => 0 }); await guardarToken(r, env, c, `T${c}`, 0); }
  const renovar = async (t) => { if (t === "T1") throw new Error("red"); return { access_token: "n", expires_in: 60 * 86400 }; };
  const res = await mantenerCuentas({ r, env, ahora: () => DIA, renovar, avisar: async () => {}, desconectar: async () => {} });
  assert.equal(res["1"], "error");
  assert.equal(res["2"], "renovado");
});

test("si desconectar lanza con una cuenta, las demás se siguen atendiendo", async () => {
  const r = redisMemoria();
  for (const c of ["1", "2"]) { await altaMarca(r, { cuenta: c, usuario: c, ahora: () => 0 }); await guardarToken(r, env, c, `T${c}`, 0); }
  await guardarMarca(r, "1", { ...(await leerMarca(r, "1")), reconectar_desde: 1 });
  const res = await mantenerCuentas({ ...base(r), ahora: () => 40 * DIA, renovar: async () => ({ access_token: "n", expires_in: 60 * 86400 }), desconectar: async () => { throw new Error("redis"); } });
  assert.equal(res["1"], "error");
  assert.equal(res["2"], "renovado");
});
