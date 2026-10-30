import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { redisMemoria } from "./redis-memoria.js";
import { guardarToken, renovarSiHaceFalta, tokenDe } from "./token.js";
import { crearManejoDeError, enPausa, pausaVigente, pausar, pedirReconexion } from "./estado.js";
import { ErrorMeta } from "./graph.js";

const DIA = 86400e3;
const env = { IG_CUENTA_PALABRAS: "222", IG_TOKEN_LABS: "V", MLABS_CLAVE_TOKENS: randomBytes(32).toString("base64") };

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
  assert.equal(await tokenDe(r, env, "222"), "N");
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

test("token cifrado: se guarda sin texto en claro y se lee; formato viejo {token} sigue sirviendo", async () => {
  const r = redisMemoria();
  await guardarToken(r, env, "500", "IGAAsecreto", 99);
  const crudo = await r.get("ig:500:token");
  assert.equal(crudo.includes("IGAAsecreto"), false);
  assert.equal(JSON.parse(crudo).vence, 99);
  assert.equal(await tokenDe(r, env, "500"), "IGAAsecreto");
  await r.set("ig:222:token", JSON.stringify({ token: "VIEJO", vence: 1 }));
  assert.equal(await tokenDe(r, env, "222"), "VIEJO");
});

test("sin MLABS_CLAVE_TOKENS no se guarda nada (ni vacía ni ausente ni inválida)", async () => {
  for (const clave of ["", undefined, "no-es-base64-de-32-bytes"]) {
    const r = redisMemoria();
    await assert.rejects(guardarToken(r, { ...env, MLABS_CLAVE_TOKENS: clave }, "500", "IGAAsecreto", 99), /MLABS_CLAVE_TOKENS/);
    assert.equal(await r.get("ig:500:token"), null);
  }
});

test("renovar sin clave no guarda el token nuevo en claro", async () => {
  const r = redisMemoria(), avisos = [];
  await r.set("ig:222:token", JSON.stringify({ token: "VIEJO", vence: 0 }));
  const renovar = async () => ({ access_token: "NUEVO", expires_in: 60 * 86400 });
  const res = await renovarSiHaceFalta({ r, env: { ...env, MLABS_CLAVE_TOKENS: "" }, cuenta: "222", ahora: () => 1000 * DIA, renovar, avisar: async (t) => avisos.push(t) });
  assert.equal(res, "error");
  assert.equal((await r.get("ig:222:token")).includes("NUEVO"), false);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /MLABS_CLAVE_TOKENS/);
  assert.match(avisos[0], /NO se guardó/);
  assert.doesNotMatch(avisos[0], /menos de 24 h/);
});

test("renovar guarda cifrado y migra el token viejo de la casa", async () => {
  const r = redisMemoria();
  await r.set("ig:222:token", JSON.stringify({ token: "VIEJO", vence: 0 }));
  const renovar = async (t) => { assert.equal(t, "VIEJO"); return { access_token: "NUEVO", expires_in: 60 * 86400 }; };
  assert.equal(await renovarSiHaceFalta({ r, env, cuenta: "222", ahora: () => 1000 * DIA, renovar, avisar: async () => {} }), "renovado");
  assert.ok(JSON.parse(await r.get("ig:222:token")).cifrado);
  assert.equal(await tokenDe(r, env, "222"), "NUEVO");
});

test("cliente con token inválido: pide reconexión una vez, no pausa ni menciona IG_TOKEN_LABS", async () => {
  const r = redisMemoria(), avisos = [];
  await r.set("ig:500:marca", JSON.stringify({ usuario: "tienda", estado: "activa", reconectar_desde: null }));
  await guardarToken(r, env, "500", "T", 0);
  const renovar = async () => { throw new ErrorMeta("Invalid OAuth", 190); };
  await renovarSiHaceFalta({ r, env, cuenta: "500", ahora: () => 7, renovar, avisar: async (t) => avisos.push(t) });
  assert.equal(JSON.parse(await r.get("ig:500:marca")).reconectar_desde, 7);
  assert.equal(await enPausa(r, "500"), false);
  await pedirReconexion(r, "500", async (t) => avisos.push(t), 8);
  assert.equal(JSON.parse(await r.get("ig:500:marca")).reconectar_desde, 7);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /tienda/);
  assert.doesNotMatch(avisos[0], /IG_TOKEN_LABS/);
});

test("manejo de error con casa:false y 190 pide reconexión", async () => {
  const r = redisMemoria();
  await r.set("ig:500:marca", JSON.stringify({ usuario: "tienda", estado: "activa", reconectar_desde: null }));
  const manejar = crearManejoDeError({ r, cuenta: "500", ahora: () => 3, avisar: async () => {}, token: "T", casa: false });
  await manejar(new ErrorMeta("Invalid OAuth", 190));
  assert.equal(JSON.parse(await r.get("ig:500:marca")).reconectar_desde, 3);
});

test("casa con {cifrado} ilegible: usa IG_TOKEN_LABS y avisa una vez; el cliente sigue lanzando", async () => {
  const r = redisMemoria(), avisos = [];
  await guardarToken(r, env, "222", "GUARDADO", 0);
  await guardarToken(r, env, "500", "DEL_CLIENTE", 0);
  const sinClave = { ...env, MLABS_CLAVE_TOKENS: "" };
  assert.equal(await tokenDe(r, sinClave, "222"), "V");
  await assert.rejects(tokenDe(r, sinClave, "500"), /MLABS_CLAVE_TOKENS/);
  const renovar = async (t) => { assert.equal(t, "V"); return { access_token: "N", expires_in: 60 * 86400 }; };
  const res = await renovarSiHaceFalta({ r, env: sinClave, cuenta: "222", ahora: () => 1000 * DIA, renovar, avisar: async (x) => avisos.push(x) });
  assert.equal(res, "error");
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /descifrar/);
  await assert.rejects(renovarSiHaceFalta({ r, env: sinClave, cuenta: "500", ahora: () => 1000 * DIA, renovar, avisar: async () => {} }), /MLABS_CLAVE_TOKENS/);
});
