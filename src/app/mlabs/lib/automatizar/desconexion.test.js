// desconexion.test.js — «Desconectar Instagram»: borra todo lo de la cuenta aunque Meta o Mercado Pago fallen (spec 2026-10-26 §6).
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { redisMemoria } from "../../../admin/lib/instagram/redis-memoria.js";
import { guardarToken } from "../../../admin/lib/instagram/token.js";
import { altaMarca, guardarMarca, guardarSuscripcion, leerMarca, listarClientes } from "./marcas.js";
import { claveAsid } from "./vuelta.js";
import { desconectarCuenta } from "./desconexion.js";

const env = { MLABS_CLAVE_TOKENS: randomBytes(32).toString("base64") };
async function preparar() {
  const r = redisMemoria();
  await altaMarca(r, { cuenta: "1", usuario: "tienda", ahora: () => 0 });
  await guardarMarca(r, "1", { ...(await leerMarca(r, "1")), asid: "A1" });
  await r.set(claveAsid("A1"), "1");
  await r.set(claveAsid("A2"), "2");
  await guardarToken(r, env, "1", "T", 99);
  await guardarSuscripcion(r, "1", { id_mp: "P1" });
  await r.set("ig:1:disparadores", "[]");
  await r.set("ig:1:respondido:c1", "1");
  await r.set("ig:2:marca", "{}");
  return r;
}

test("desconectar: desuscribe, cancela y borra todo lo de la cuenta (incluido su asid) y nada de otras", async () => {
  const r = await preparar(), hechos = [];
  const res = await desconectarCuenta({ r, env, ig: { desuscribirWebhook: async ({ token }) => hechos.push(["ig", token]) }, mp: { cancelarSuscripcion: async ({ id }) => hechos.push(["mp", id]) }, avisar: async () => {} }, "1");
  assert.deepEqual(hechos, [["ig", "T"], ["mp", "P1"]]);
  assert.equal(res.borradas, 6);
  for (const k of ["ig:1:marca", "ig:1:token", "ig:1:suscripcion", "ig:1:disparadores", "ig:1:respondido:c1", claveAsid("A1")]) assert.equal(await r.get(k), null, k);
  assert.equal(await r.get("ig:2:marca"), "{}");
  assert.equal(await r.get(claveAsid("A2")), "2");
  assert.deepEqual(await listarClientes(r), []);
});

test("si Meta y Mercado Pago fallan, igual borra y avisa a Oscar", async () => {
  const r = await preparar(), avisos = [];
  const boom = async () => { throw new Error("caído"); };
  const res = await desconectarCuenta({ r, env, ig: { desuscribirWebhook: boom }, mp: { cancelarSuscripcion: boom }, avisar: async (t) => avisos.push(t) }, "1");
  assert.equal(res.borradas, 6);
  assert.equal(await r.get("ig:1:token"), null);
  assert.equal(await r.get(claveAsid("A1")), null);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /Mercado Pago/);
  assert.match(avisos[0], /Meta/);
});

test("si el token no se puede descifrar, igual borra y avisa", async () => {
  const r = await preparar(), avisos = [];
  const res = await desconectarCuenta({ r, env: { MLABS_CLAVE_TOKENS: randomBytes(32).toString("base64") }, ig: { desuscribirWebhook: async () => assert.fail("sin token no se desuscribe") }, mp: { cancelarSuscripcion: async () => {} }, avisar: async (t) => avisos.push(t) }, "1");
  assert.equal(res.borradas, 6);
  assert.match(avisos[0], /token ilegible/);
});

test("la cuenta casa y la Cabina no se pueden desconectar por aquí y no pierden nada", async () => {
  const r = await preparar();
  const d = { r, ig: {}, mp: {}, avisar: async () => {} };
  await assert.rejects(desconectarCuenta({ ...d, env: { ...env, IG_CUENTA_PALABRAS: "1" } }, "1"), /casa/);
  await assert.rejects(desconectarCuenta({ ...d, env: { ...env, IG_CUENTA_CABINA: "1" } }, "1"), /Cabina/);
  assert.notEqual(await r.get("ig:1:token"), null);
});

test("M-1: borra ANTES de llamar a Meta y a Mercado Pago (el aviso de MP ya no encuentra ficha)", async () => {
  const r = await preparar();
  const vistas = [];
  const ig = { desuscribirWebhook: async () => vistas.push(["ig", await r.get("ig:1:marca")]) };
  const mp = { cancelarSuscripcion: async () => vistas.push(["mp", await r.get("ig:1:marca"), await r.get("ig:1:suscripcion")]) };
  await desconectarCuenta({ r, env, ig, mp, avisar: async () => {} }, "1");
  assert.deepEqual(vistas, [["ig", null], ["mp", null, null]]);
});
