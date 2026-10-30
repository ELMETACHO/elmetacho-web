// vuelta.test.js — lógica de la vuelta del inicio de sesión con Instagram (spec 2026-10-26 §2 y §7).
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { redisMemoria } from "../../../admin/lib/instagram/redis-memoria.js";
import { ErrorMeta } from "../../../admin/lib/instagram/graph.js";
import { tokenDe } from "../../../admin/lib/instagram/token.js";
import { atenderVuelta } from "./vuelta.js";
import { leerMarca, listarClientes } from "./marcas.js";

const env = { IG_APP_ID: "id", IG_APP_SECRET: "sec", MLABS_CLAVE_TOKENS: randomBytes(32).toString("base64"), IG_CUENTA_PALABRAS: "222", IG_CUENTA_CABINA: "111" };
const igFalso = (sobre = {}) => {
  const hechos = [];
  return { hechos, ig: {
    canjearCodigo: async ({ code }) => { hechos.push(["canjear", code]); return { token: "CORTO" }; },
    tokenLargo: async () => ({ access_token: "LARGO", expires_in: 5184000 }),
    perfil: async () => ({ cuenta: "17841", usuario: "tienda", tipo: "BUSINESS", asid: "A1" }),
    suscribirWebhook: async () => { hechos.push(["suscribir"]); return { success: true }; },
    ...sobre,
  } };
};
const ok = { code: "C", error: null, stateCookie: "S", stateRecibido: "S" };
const sinAviso = async () => {};

test("vuelta correcta: guarda token cifrado, crea ficha con asid, índice asid, suscribe el webhook y avisa marca nueva", async () => {
  const r = redisMemoria(), avisos = [];
  const { ig, hechos } = igFalso();
  const res = await atenderVuelta({ r, env, ig, ahora: () => 1000, avisar: async (t) => avisos.push(t) }, ok);
  assert.deepEqual(res, { ok: true, cuenta: "17841" });
  assert.equal(await tokenDe(r, env, "17841"), "LARGO");
  assert.equal(JSON.parse(await r.get("ig:17841:token")).vence, 1000 + 5184000 * 1000);
  const marca = await leerMarca(r, "17841");
  assert.equal(marca.estado, "sin_pago");
  assert.equal(marca.asid, "A1");
  assert.equal(await r.get("mlabs:asid:A1"), "17841");
  assert.deepEqual(await listarClientes(r), ["17841"]);
  assert.deepEqual(hechos.map((h) => h[0]), ["canjear", "suscribir"]);
  assert.match(avisos[0], /tienda/);
});

test("state distinto, usuario que cancela o code inválido: no guarda nada", async () => {
  for (const [entrada, motivo, sobre] of [
    [{ ...ok, stateRecibido: "X" }, "state"],
    [{ ...ok, code: null, error: "access_denied" }, "cancelado"],
    [ok, "codigo", { canjearCodigo: async () => { throw new Error("This authorization code has been used"); } }],
  ]) {
    const r = redisMemoria();
    const res = await atenderVuelta({ r, env, ig: igFalso(sobre).ig, ahora: () => 1, avisar: sinAviso }, entrada);
    assert.deepEqual(res, { ok: false, motivo });
    assert.deepEqual(await listarClientes(r), []);
  }
});

test("foco 5: code vencido o repetido (ErrorMeta), fallo de red (TypeError) o perfil roto nunca lanzan: motivo «codigo»", async () => {
  const fallos = [
    { canjearCodigo: async () => { throw new ErrorMeta("Invalid authorization code", 400); } },
    { canjearCodigo: async () => { throw new TypeError("fetch failed"); } },
    { tokenLargo: async () => { throw new DOMException("timeout", "TimeoutError"); } },
    { perfil: async () => { throw new ErrorMeta("Instagram no devolvió el id de la cuenta", null); } },
  ];
  for (const sobre of fallos) {
    const r = redisMemoria();
    const res = await atenderVuelta({ r, env, ig: igFalso(sobre).ig, ahora: () => 1, avisar: sinAviso }, ok);
    assert.deepEqual(res, { ok: false, motivo: "codigo" });
    assert.deepEqual(await listarClientes(r), []);
  }
});

test("foco 5: si falla guardar (p. ej. falta MLABS_CLAVE_TOKENS) la vuelta tampoco lanza", async () => {
  const r = redisMemoria();
  const res = await atenderVuelta({ r, env: { ...env, MLABS_CLAVE_TOKENS: "" }, ig: igFalso().ig, ahora: () => 1, avisar: sinAviso }, ok);
  assert.deepEqual(res, { ok: false, motivo: "codigo" });
  assert.deepEqual(await listarClientes(r), []);
});

test("cuenta personal: no se guarda y se explica", async () => {
  const r = redisMemoria();
  const res = await atenderVuelta({ r, env, ig: igFalso({ perfil: async () => ({ cuenta: "5", usuario: "yo", tipo: "PERSONAL", asid: "A5" }) }).ig, ahora: () => 1, avisar: sinAviso }, ok);
  assert.deepEqual(res, { ok: false, motivo: "personal" });
  assert.equal(await r.get("ig:5:token"), null);
  assert.equal(await r.get("mlabs:asid:A5"), null);
});

test("la cuenta casa (IG_CUENTA_PALABRAS) entra al panel pero no se vuelve cliente; su asid también se indexa", async () => {
  const r = redisMemoria();
  const res = await atenderVuelta({ r, env, ig: igFalso({ perfil: async () => ({ cuenta: "222", usuario: "metacholabs", tipo: "BUSINESS", asid: "A222" }) }).ig, ahora: () => 1, avisar: sinAviso }, ok);
  assert.deepEqual(res, { ok: true, cuenta: "222" });
  assert.deepEqual(await listarClientes(r), []);
  assert.equal(await tokenDe(r, env, "222"), "LARGO");
  assert.equal(await r.get("mlabs:asid:A222"), "222");
});

test("foco 5: dos vueltas de cuentas distintas en el mismo navegador: la sesión pasa a la segunda y la primera queda intacta", async () => {
  const r = redisMemoria();
  const cuenta = (id, usuario, asid, token) => igFalso({
    tokenLargo: async () => ({ access_token: token, expires_in: 100 }),
    perfil: async () => ({ cuenta: id, usuario, tipo: "BUSINESS", asid }),
  }).ig;
  const a = await atenderVuelta({ r, env, ig: cuenta("1", "uno", "A1", "TOK1"), ahora: () => 1, avisar: sinAviso }, ok);
  const marca1 = await leerMarca(r, "1");
  const crudo1 = await r.get("ig:1:token");
  const b = await atenderVuelta({ r, env, ig: cuenta("2", "dos", "A2", "TOK2"), ahora: () => 2, avisar: sinAviso }, ok);
  assert.equal(a.cuenta, "1");
  assert.equal(b.cuenta, "2");   // la ruta firma la cookie con la cuenta devuelta: la sesión pasa a la segunda
  assert.deepEqual(await leerMarca(r, "1"), marca1);
  assert.equal(await r.get("ig:1:token"), crudo1);
  assert.equal(await tokenDe(r, env, "1"), "TOK1");
  assert.equal(await tokenDe(r, env, "2"), "TOK2");
  assert.equal(await r.get("mlabs:asid:A1"), "1");
  assert.deepEqual((await listarClientes(r)).sort(), ["1", "2"]);
});

test("si falla la suscripción al webhook igual entra, pero Oscar recibe aviso", async () => {
  const r = redisMemoria(), avisos = [];
  const res = await atenderVuelta({ r, env, ig: igFalso({ suscribirWebhook: async () => { throw new Error("boom"); } }).ig, ahora: () => 1, avisar: async (t) => avisos.push(t) }, ok);
  assert.equal(res.ok, true);
  assert.ok(avisos.some((t) => /webhook/.test(t)));
});

test("la cuenta de la Cabina (IG_CUENTA_CABINA) tampoco se vuelve cliente ni tiene ficha; su asid se indexa", async () => {
  const r = redisMemoria();
  const res = await atenderVuelta({ r, env, ig: igFalso({ perfil: async () => ({ cuenta: "111", usuario: "elmetacho_", tipo: "BUSINESS", asid: "A111" }) }).ig, ahora: () => 1, avisar: sinAviso }, ok);
  assert.deepEqual(res, { ok: true, cuenta: "111" });
  assert.deepEqual(await listarClientes(r), []);
  assert.equal(await leerMarca(r, "111"), null);
  assert.equal(await r.get("mlabs:asid:A111"), "111");
});

test("I-2: fallos de configuración o internos avisan a Oscar una vez; los de la marca no avisan", async () => {
  const r = redisMemoria(), avisos = [];
  const d = (sobre = {}, e = env) => ({ r, env: e, ig: igFalso(sobre).ig, ahora: () => 1, avisar: async (t) => avisos.push(t) });
  // fallos de la marca / de Meta: solo log
  await atenderVuelta(d(), { ...ok, stateRecibido: "X" });
  await atenderVuelta(d(), { ...ok, code: null, error: "access_denied" });
  await atenderVuelta(d({ canjearCodigo: async () => { throw new ErrorMeta("code vencido", 400); } }), ok);
  await atenderVuelta(d({ perfil: async () => ({ cuenta: "5", usuario: "yo", tipo: "PERSONAL", asid: "A5" }) }), ok);
  assert.deepEqual(avisos, []);
  // falta MLABS_CLAVE_TOKENS: avisa; el segundo fallo dentro de la hora no repite
  const res = await atenderVuelta(d({}, { ...env, MLABS_CLAVE_TOKENS: "" }), ok);
  assert.deepEqual(res, { ok: false, motivo: "codigo" });
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /MLABS_CLAVE_TOKENS/);
  assert.ok(!avisos[0].includes("LARGO"));
  await atenderVuelta(d({}, { ...env, MLABS_CLAVE_TOKENS: "" }), ok);
  assert.equal(avisos.length, 1);
});

test("I-2: falta IG_APP_ID o IG_APP_SECRET avisa a Oscar", async () => {
  const avisos = [];
  const res = await atenderVuelta({ r: redisMemoria(), env: { ...env, IG_APP_ID: "" }, ig: igFalso().ig, ahora: () => 1, avisar: async (t) => avisos.push(t) }, ok);
  assert.deepEqual(res, { ok: false, motivo: "codigo" });
  assert.match(avisos[0], /IG_APP_ID/);
});

test("I-2: si falla firmar la sesión no sale el aviso «conectó su Instagram» y sí el de configuración", async () => {
  const avisos = [];
  const sesion = () => { throw new Error("Falta MLABS_SESION_SECRETO"); };
  const res = await atenderVuelta({ r: redisMemoria(), env, ig: igFalso().ig, ahora: () => 1, avisar: async (t) => avisos.push(t), sesion }, ok);
  assert.equal(res.ok, false);
  assert.ok(!avisos.some((t) => /conectó/.test(t)));
  assert.ok(avisos.some((t) => /MLABS_SESION_SECRETO/.test(t)));
});

test("I-2: con la sesión firmada devuelve la cookie y avisa de la marca nueva", async () => {
  const avisos = [];
  const res = await atenderVuelta({ r: redisMemoria(), env, ig: igFalso().ig, ahora: () => 1, avisar: async (t) => avisos.push(t), sesion: (c) => `COOKIE-${c}` }, ok);
  assert.deepEqual(res, { ok: true, cuenta: "17841", cookie: "COOKIE-17841" });
  assert.match(avisos[0], /conectó/);
});
