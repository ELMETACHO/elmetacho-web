import { test } from "node:test";
import assert from "node:assert/strict";
import { validarTramos, totalContexto, avisoLargo, MAX_TRAMOS } from "./tramos.js";

test("ordena, redondea a décimas y acepta hasta 3 tramos sin tope", () => {
  const r = validarTramos([[7, 13.04], [0, 4]], 28);
  assert.deepEqual(r, { tramos: [[0, 4], [7, 13]], errores: [] });
  assert.equal(validarTramos([[0, 20], [21, 40], [41, 60]], 61).errores.length, 0);
});

test("rechaza más de 3, solapados, fin <= inicio y negativos", () => {
  assert.match(validarTramos([[0, 1], [2, 3], [4, 5], [6, 7]]).errores[0], /máximo 3/);
  assert.match(validarTramos([[0, 5], [4, 8]]).errores[0], /se pisan/);
  assert.match(validarTramos([[5, 5]]).errores[0], /fin/);
  assert.match(validarTramos([[-1, 3]]).errores[0], /fin|inicio/);
  assert.equal(MAX_TRAMOS, 3);
});

test("pasar el final del video por <= 0,3 s se recorta; más es error", () => {
  assert.deepEqual(validarTramos([[20, 28.2]], 28).tramos, [[20, 28]]);
  assert.match(validarTramos([[20, 29]], 28).errores[0], /dura/);
});

test("total y aviso de más de 25 s", () => {
  assert.equal(totalContexto([[0, 4], [7, 13]]), 10);
  assert.equal(avisoLargo([[0, 26]]), true);
  assert.equal(avisoLargo([[0, 25]]), false);
});

test("lista vacía o basura = error", () => {
  assert.match(validarTramos([]).errores[0], /al menos un tramo/);
  assert.match(validarTramos("x").errores[0], /al menos un tramo/);
});
