// desautorizacion.test.js — callbacks de Meta (desautorizar y eliminar datos) con signed_request (spec 2026-10-26 §6).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { redisMemoria } from "../../../admin/lib/instagram/redis-memoria.js";
import { guardarToken } from "../../../admin/lib/instagram/token.js";
import { altaMarca, guardarMarca, leerMarca, listarClientes } from "./marcas.js";
import { claveAsid } from "./vuelta.js";
import { atenderBorradoMeta, leerSignedRequest } from "./desautorizacion.js";

const SECRETO = "secreto-app";
const env = { MLABS_CLAVE_TOKENS: randomBytes(32).toString("base64"), IG_APP_SECRET: SECRETO, IG_CUENTA_PALABRAS: "222", IG_CUENTA_CABINA: "111" };
const firmar = (payload, secreto = SECRETO) => {
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${createHmac("sha256", secreto).update(p).digest("base64url")}.${p}`;
};
const valido = { algorithm: "HMAC-SHA256", user_id: "A1", issued_at: 1700000000 };

async function preparar() {
  const r = redisMemoria();
  await altaMarca(r, { cuenta: "1", usuario: "tienda", ahora: () => 0 });
  await guardarMarca(r, "1", { ...(await leerMarca(r, "1")), asid: "A1" });
  await r.set(claveAsid("A1"), "1");
  await guardarToken(r, env, "1", "T", 99);
  await r.set("ig:1:disparadores", "[]");
  return r;
}
const deps = (r, avisos = []) => ({ r, env, ig: { desuscribirWebhook: async () => {} }, mp: { cancelarSuscripcion: async () => {} }, avisar: async (t) => avisos.push(t) });

test("leerSignedRequest: firma válida devuelve el payload; firma mala, algoritmo raro o formato roto devuelven null", () => {
  assert.deepEqual(leerSignedRequest(firmar(valido), SECRETO), valido);
  assert.equal(leerSignedRequest(firmar(valido, "otro"), SECRETO), null);
  assert.equal(leerSignedRequest(firmar({ ...valido, algorithm: "HMAC-SHA1" }), SECRETO), null);
  assert.equal(leerSignedRequest(firmar({ algorithm: "HMAC-SHA256" }), SECRETO), null);   // sin user_id
  assert.equal(leerSignedRequest("sin-punto", SECRETO), null);
  assert.equal(leerSignedRequest("a.b.c", SECRETO), null);
  assert.equal(leerSignedRequest(undefined, SECRETO), null);
  assert.equal(leerSignedRequest(firmar(valido), ""), null);   // sin IG_APP_SECRET nada es válido
  const p = Buffer.from("no json").toString("base64url");
  assert.equal(leerSignedRequest(`${createHmac("sha256", SECRETO).update(p).digest("base64url")}.${p}`, SECRETO), null);   // firma buena, cuerpo roto
});

test("firma válida con asid conocido: borra la cuenta y su índice", async () => {
  const r = await preparar();
  const res = await atenderBorradoMeta(deps(r), firmar(valido));
  assert.deepEqual({ ok: res.ok, borrada: res.borrada, cuenta: res.cuenta }, { ok: true, borrada: true, cuenta: "1" });
  assert.match(res.codigo, /^[0-9a-f]{16}$/);
  for (const k of ["ig:1:marca", "ig:1:token", "ig:1:disparadores", claveAsid("A1")]) assert.equal(await r.get(k), null, k);
  assert.deepEqual(await listarClientes(r), []);
});

test("firma inválida: no ok y no borra nada", async () => {
  const r = await preparar();
  const res = await atenderBorradoMeta(deps(r), firmar(valido, "otro"));
  assert.equal(res.ok, false);
  assert.notEqual(await r.get("ig:1:token"), null);
  assert.equal(await r.get(claveAsid("A1")), "1");
});

test("asid desconocido: responde bien y no borra nada", async () => {
  const r = await preparar();
  const res = await atenderBorradoMeta(deps(r), firmar({ ...valido, user_id: "ZZ" }));
  assert.equal(res.ok, true);
  assert.equal(res.borrada, false);
  assert.notEqual(await r.get("ig:1:token"), null);
  assert.notEqual(await r.get("ig:1:marca"), null);
});

test("asid de la casa o de la Cabina: responde bien, NO borra y avisa a Oscar", async () => {
  const r = await preparar(), avisos = [];
  await guardarToken(r, env, "222", "CASA", 99);
  await r.set(claveAsid("C1"), "222");
  await r.set(claveAsid("K1"), "111");
  for (const id of ["C1", "K1"]) {
    const res = await atenderBorradoMeta(deps(r, avisos), firmar({ ...valido, user_id: id }));
    assert.deepEqual({ ok: res.ok, borrada: res.borrada }, { ok: true, borrada: false });
  }
  assert.equal(avisos.length, 2);
  assert.notEqual(await r.get("ig:222:token"), null);
  assert.equal(await r.get(claveAsid("C1")), "222");
});
