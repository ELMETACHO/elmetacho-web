import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrar } from "./filtrar.js";

const items = [
  { slug: "a", tipo: "guia", publicos: ["marcas", "creadores"] },
  { slug: "b", tipo: "prompt", publicos: ["marcas"] },
  { slug: "c", tipo: "prompt", publicos: ["creadores"] },
];
const slugs = (l) => l.map((x) => x.slug);

test("sin filtros devuelve todo, en el mismo orden", () => {
  assert.deepEqual(slugs(filtrar(items, {})), ["a", "b", "c"]);
  assert.deepEqual(slugs(filtrar(items, { publico: null, tipo: null })), ["a", "b", "c"]);
});

test("filtra por público", () => {
  assert.deepEqual(slugs(filtrar(items, { publico: "creadores" })), ["a", "c"]);
});

test("filtra por tipo", () => {
  assert.deepEqual(slugs(filtrar(items, { tipo: "prompt" })), ["b", "c"]);
});

test("combina público y tipo", () => {
  assert.deepEqual(slugs(filtrar(items, { publico: "marcas", tipo: "prompt" })), ["b"]);
});

test("sin coincidencias devuelve lista vacía", () => {
  assert.deepEqual(filtrar(items, { publico: "ia-y-developers" }), []);
});
