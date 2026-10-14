import { test } from "node:test";
import assert from "node:assert/strict";
import { urlRedisDirecta } from "./config.js";

test("lee la URL que crea la integración de Redis de Vercel (KV_REDIS_URL)", () => {
  assert.equal(urlRedisDirecta({ KV_REDIS_URL: "redis://integracion" }), "redis://integracion");
});

test("sigue aceptando los otros nombres", () => {
  assert.equal(urlRedisDirecta({ KV_URL: "redis://a" }), "redis://a");
  assert.equal(urlRedisDirecta({ REDIS_URL: "redis://b" }), "redis://b");
  assert.equal(urlRedisDirecta({ STORAGE_URL: "redis://c" }), "redis://c");
});

test("sin ninguna variable devuelve undefined", () => {
  assert.equal(urlRedisDirecta({}), undefined);
});
