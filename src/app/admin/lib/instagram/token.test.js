import { test } from "node:test";
import assert from "node:assert/strict";
import { redisMemoria } from "./redis-memoria.js";
import { renovarSiHaceFalta, tokenDe } from "./token.js";
import { crearManejoDeError, enPausa, pausaVigente, pausar } from "./estado.js";
import { ErrorMeta } from "./graph.js";

const DIA = 86400e3;
const env = { IG_CUENTA_PALABRAS: "222", IG_TOKEN_LABS: "V" };

test("token: Redis gana sobre la variable; otra cuenta no tiene", async () => {
  const r = redisMemoria();
  assert.equal(await tokenDe(r, env, "222"), "V");
  assert.equal(await tokenDe(r, env, "111"), null);
  await r.set("ig:222:token", JSON.stringify({ token: "N", vence: 1 }));
  assert.equal(await tokenDe(r, env, "222"), "N");
});

test("renovar: vigente no llama; cerca de vencer renueva; error avisa con explicación", async () => {
  const r = redisMemoria(), avisos = [], ahora = () => 1000 * DIA;
  let llamadas = 0;
  const renovar = async () => { llamadas++; return { access_token: "N", expires_in: 60 * 86400 }; };
  assert.equal(await renovarSiHaceFalta({ r, env, cuenta: "222", ahora, renovar, avisar: async (t) => avisos.push(t) }), "renovado");
  assert.equal(JSON.parse(await r.get("ig:222:token")).token, "N");
  assert.equal(await renovarSiHaceFalta({ r, env, cuenta: "222", ahora, renovar, avisar: async (t) => avisos.push(t) }), "vigente");
  assert.equal(llamadas, 1);
  const falla = async () => { throw new Error("token demasiado nuevo"); };
  assert.equal(await renovarSiHaceFalta({ r: redisMemoria(), env, cuenta: "222", ahora, renovar: falla, avisar: async (t) => avisos.push(t) }), "error");
  assert.match(avisos.at(-1), /menos de 24 h/);
  assert.equal(await renovarSiHaceFalta({ r: redisMemoria(), env: {}, cuenta: "222", ahora, renovar, avisar: async (t) => avisos.push(t) }), "sin token");
});

test("errores: token inválido pausa 6 h y borra el token guardado; 3 fallos en una hora avisan una vez", async () => {
  const reloj = { t: 0 }, r = redisMemoria(() => reloj.t), avisos = [];
  const manejar = crearManejoDeError({ r, cuenta: "222", ahora: () => reloj.t, avisar: async (t) => avisos.push(t) });
  await r.set("ig:222:token", JSON.stringify({ token: "N", vence: 1 }));
  await manejar(new ErrorMeta("Invalid OAuth", 190));
  await manejar(new ErrorMeta("Invalid OAuth", 190));
  assert.equal(await enPausa(r, "222"), true);
  assert.equal(await r.get("ig:222:token"), null);
  assert.equal(avisos.length, 1);
  reloj.t = 6 * 3600e3 + 1;
  assert.equal(await enPausa(r, "222"), false);
  for (let k = 0; k < 4; k++) await manejar(new ErrorMeta("otro", 10));
  assert.equal(avisos.length, 2);
  assert.match(avisos[1], /3 fallos/);
});

test("renovar con token inválido (190): pausa y avisa sin el texto de «menos de 24 h»", async () => {
  const r = redisMemoria(), avisos = [];
  const renovar = async () => { throw new ErrorMeta("Invalid OAuth", 190); };
  assert.equal(await renovarSiHaceFalta({ r, env, cuenta: "222", ahora: () => 1000 * DIA, renovar, avisar: async (t) => avisos.push(t) }), "error");
  assert.equal(await enPausa(r, "222"), true);
  assert.equal(avisos.length, 1);
  assert.doesNotMatch(avisos[0], /menos de 24 h/);
});

test("pausar: si el aviso falla, la pausa queda puesta y no se propaga el error", async () => {
  const r = redisMemoria();
  await pausar(r, "222", async () => { throw new Error("Telegram caído"); }, "x");
  assert.equal(await enPausa(r, "222"), true);
});

test("la pausa termina con un token nuevo; sin token conocido dura hasta que venza", async () => {
  const r = redisMemoria();
  await pausar(r, "222", async () => {}, "x", "TOKEN_A");
  assert.equal(await pausaVigente(r, "222", "TOKEN_A"), true);
  assert.equal(await r.get("ig:222:pausa") === "TOKEN_A", false);   // no se guarda el token en claro
  assert.equal(await pausaVigente(r, "222", "TOKEN_B"), false);
  assert.equal(await r.get("ig:222:pausa"), null);
  await pausar(r, "222", async () => {}, "x");
  assert.equal(await r.get("ig:222:pausa"), "1");
  assert.equal(await pausaVigente(r, "222", "TOKEN_B"), true);
  assert.equal(await pausaVigente(redisMemoria(), "222", "TOKEN_B"), false);
});

test("error 190 guarda el hash del token que falló", async () => {
  const r = redisMemoria();
  const manejar = crearManejoDeError({ r, cuenta: "222", ahora: () => 0, avisar: async () => {}, token: "TOKEN_A" });
  await manejar(new ErrorMeta("Invalid OAuth", 190));
  assert.equal(await pausaVigente(r, "222", "TOKEN_A"), true);
  assert.equal(await pausaVigente(r, "222", "TOKEN_B"), false);
});
