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
  const malo = c.slice(0, -2) + (c.endsWith("A") ? "B" : "A") + c.slice(-1);
  assert.throws(() => descifrar(malo, K));
  assert.throws(() => descifrar(c, randomBytes(32).toString("base64")));
});
