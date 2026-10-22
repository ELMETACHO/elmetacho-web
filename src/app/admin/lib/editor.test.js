import { test } from "node:test";
import assert from "node:assert/strict";
import { ajustar, marcar, mover, extension, extSegura } from "./editor.js";

test("marcar inicio y fin crea el tramo, aunque se marquen al revés", () => {
  let s = marcar([], null, 7);
  assert.deepEqual(s, { tramos: [], pendiente: 7 });
  s = marcar(s.tramos, s.pendiente, 4);
  assert.deepEqual(s, { tramos: [[4, 7]], pendiente: null });
});
test("ajustar respeta 0, la duración y no deja fin <= inicio", () => {
  assert.deepEqual(ajustar([[0, 4]], 0, "inicio", -1, 28), [[0, 4]]);
  assert.deepEqual(ajustar([[0, 4]], 0, "fin", 0.1, 28), [[0, 4.1]]);
  assert.deepEqual(ajustar([[20, 28]], 0, "fin", 1, 28), [[20, 28]]);
  assert.deepEqual(ajustar([[3, 3.1]], 0, "fin", -0.1, 28), [[3, 3.1]]);
});
test("mover reordena sin salirse", () => {
  assert.deepEqual(mover(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
  assert.deepEqual(mover(["a", "b"], 0, -1), ["a", "b"]);
});
test("extensión en minúscula, con defecto", () => {
  assert.equal(extension("IMG_0652.MOV"), ".mov");
  assert.equal(extension("sin"), ".bin");
});

test("extSegura: minúscula, y defecto por tipo si no sirve", () => {
  assert.equal(extSegura("A.MOV", "video"), ".mov");
  assert.equal(extSegura("foto.JPG", "imagen"), ".jpg");
  assert.equal(extSegura("sin", "video"), ".mp4");
  assert.equal(extSegura("sin", "imagen"), ".jpg");
  assert.equal(extSegura("x.bin", "video"), ".mp4");
  assert.equal(extSegura("x.abcdefg", "video"), ".mp4");
  assert.equal(extSegura("x.abcdefg", "imagen"), ".jpg");
  assert.equal(extSegura("x.a", "imagen"), ".jpg");
});
