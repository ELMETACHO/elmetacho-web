import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrarCatalogo, validarCatalogo } from "./catalogo.js";

const L = [
  { clave: "2026-10-22-v-wc_20261022_ac94", titulo: "su novia cuida la moto mientras compra", fecha: "2026-10-22", n: 12 },
  { clave: "2026-10-20-perro", titulo: "Pingüino que asustó al perro", fecha: "2026-10-20", n: 8 },
  { clave: "2026-10-19-moto", titulo: "la moto que no arrancaba", fecha: "2026-10-19", n: 5 },
];

test("filtrar: sin tildes ni mayúsculas, todas las palabras, en el orden del catálogo, máximo n", () => {
  assert.deepEqual(filtrarCatalogo(L, "MOTO").map((x) => x.n), [12, 5]);
  assert.deepEqual(filtrarCatalogo(L, "novia mo").map((x) => x.n), [12]);
  assert.deepEqual(filtrarCatalogo(L, "pinguino").map((x) => x.n), [8]);
  assert.deepEqual(filtrarCatalogo(L, "moto", 1).map((x) => x.n), [12]);
  assert.deepEqual(filtrarCatalogo(L, "  "), []);
  assert.deepEqual(filtrarCatalogo(L, "gato"), []);
});

test("validar catálogo: lista de hasta 3000 con clave segura, título y n", () => {
  assert.deepEqual(validarCatalogo(L), { lista: L, error: null });
  assert.match(validarCatalogo("x").error, /lista/);
  assert.match(validarCatalogo([{ ...L[0], clave: "../x" }]).error, /clave/);
  assert.match(validarCatalogo([{ ...L[0], titulo: "" }]).error, /título/);
  assert.match(validarCatalogo(Array(3001).fill(L[0])).error, /3000/);
  assert.deepEqual(validarCatalogo([{ ...L[0], titulo: "x".repeat(300), extra: 1 }]).lista[0].titulo.length, 200);
});
