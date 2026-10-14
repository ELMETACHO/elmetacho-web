import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizar } from "./texto.js";

test("normalizar quita tildes y la virgulilla de la ñ, pasa a minúsculas y recorta", () => {
  assert.equal(normalizar(" RESEÑA "), "resena");
  assert.equal(normalizar("Fórmula"), "formula");
  assert.equal(normalizar(undefined), "");
});
