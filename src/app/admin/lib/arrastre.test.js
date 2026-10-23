import { test } from "node:test";
import assert from "node:assert/strict";
import { destinoDeHueco, huecoEn, marcaDe, moverA, velocidadBorde } from "./arrastre.js";
import { moverAEn } from "./revision.js";

test("moverA lleva el elemento a su posición final, hacia abajo y hacia arriba", () => {
  assert.deepEqual(moverA(["a", "b", "c", "d"], 0, 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moverA(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moverA(["a", "b", "c", "d"], 1, 3), ["a", "c", "d", "b"]);
});

test("moverA fuera de rango, sin cambio o con basura devuelve la misma lista", () => {
  const l = ["a", "b"];
  for (const [de, a] of [[0, 0], [-1, 1], [0, 2], [2, 0], [0.5, 1], [null, 1], [0, undefined]]) assert.equal(moverA(l, de, a), l, `${de}→${a}`);
});

test("huecoEn y destinoDeHueco: soltar entre tarjetas", () => {
  const centros = [100, 200, 300];
  assert.equal(huecoEn(centros, 50), 0);
  assert.equal(huecoEn(centros, 150), 1);
  assert.equal(huecoEn(centros, 999), 3);
  assert.equal(destinoDeHueco(0, 3), 2);   // la primera, al final
  assert.equal(destinoDeHueco(2, 0), 0);   // la última, arriba de todo
  assert.equal(destinoDeHueco(1, 1), 1);   // donde estaba
  assert.equal(destinoDeHueco(1, 2), 1);   // justo debajo de sí misma = no se mueve
});

test("marcaDe: raya arriba de la tarjeta destino o abajo de la última; nada si no se mueve", () => {
  assert.equal(marcaDe(0, 3, 2, 0), "cae-antes");
  assert.equal(marcaDe(1, 3, 2, 0), "");
  assert.equal(marcaDe(2, 3, 0, 3), "cae-despues");
  assert.equal(marcaDe(1, 3, 1, 1), "");
  assert.equal(marcaDe(2, 3, 1, 2), "");
  assert.equal(marcaDe(0, 3, null, null), "");
});

test("velocidadBorde: sube cerca de arriba, baja cerca de abajo, quieta en el medio", () => {
  assert.equal(velocidadBorde(400, 800), 0);
  assert.equal(velocidadBorde(80, 800), 0);
  assert.ok(velocidadBorde(10, 800) < 0);
  assert.ok(velocidadBorde(790, 800) > 0);
  assert.equal(velocidadBorde(0, 800), -18);
  assert.equal(velocidadBorde(-30, 800), -18);
  assert.equal(velocidadBorde(800, 800), 18);
});

test("moverAEn cambia el orden de la revisión; sin cambio devuelve la misma revisión", () => {
  const rev = { orden: ["a", "b", "c"], fuera: ["z"], lineas: { a: "x," } };
  assert.deepEqual(moverAEn(rev, 2, 0), { orden: ["c", "a", "b"], fuera: ["z"], lineas: { a: "x," } });
  assert.equal(moverAEn(rev, 1, 1), rev);
});
