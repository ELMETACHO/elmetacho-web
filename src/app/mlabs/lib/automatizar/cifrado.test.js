import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cifrar, descifrar } from "./cifrado.js";

const K = randomBytes(32).toString("base64");

test("cifrar y descifrar devuelven el mismo token; dos cifrados del mismo texto son distintos", () => {
  const a = cifrar("IGAAtoken", K), b = cifrar("IGAAtoken", K);
  assert.notEqual(a, b);
  assert.equal(a.includes("IGAAtoken"), false);
  assert.equal(descifrar(a, K), "IGAAtoken");
});

test("sin clave o con clave corta falla cerrado (nunca guarda en claro)", () => {
  assert.throws(() => cifrar("x", ""), /MLABS_CLAVE_TOKENS/);
  assert.throws(() => cifrar("x", undefined), /MLABS_CLAVE_TOKENS/);
  assert.throws(() => cifrar("x", Buffer.alloc(16).toString("base64")), /MLABS_CLAVE_TOKENS/);
});

test("texto alterado u otra clave: descifrar lanza", () => {
  const c = cifrar("IGAAtoken", K);
  const bytes = Buffer.from(c, "base64url");
  bytes[bytes.length - 1] ^= 1;
  const malo = bytes.toString("base64url");
  assert.throws(() => descifrar(malo, K));
  assert.throws(() => descifrar(c, randomBytes(32).toString("base64")));
});

test("un tag de autenticación truncado se rechaza (authTagLength fijo en 16)", () => {
  const b = Buffer.from(cifrar("IGAAtoken", K), "base64url");
  // iv(12) + solo 4 bytes de tag: sin authTagLength fijo, el descifrador podría validar un tag corto
  const corto = b.subarray(0, 16).toString("base64url");
  assert.throws(() => descifrar(corto, K));
  // 27 bytes: el tag queda recortado en un byte (sin texto cifrado)
  assert.throws(() => descifrar(b.subarray(0, 27).toString("base64url"), K));
});
