import { test } from "node:test";
import assert from "node:assert/strict";
import { formatoPrecio } from "./precio.js";

test("pesos colombianos sin decimales y con punto de miles", () => {
  const t = formatoPrecio(97000, "COP");
  assert.ok(t.includes("97.000"), t);
  assert.ok(t.endsWith("COP"), t);
});

test("dólares", () => {
  const t = formatoPrecio(29, "USD");
  assert.ok(t.includes("29") && t.endsWith("USD"), t);
});

test("sin precio devuelve null", () => {
  assert.equal(formatoPrecio(null, "COP"), null);
  assert.equal(formatoPrecio(0, "COP"), null);
});
