import { test } from "node:test";
import assert from "node:assert/strict";
import { crearIndice, buscar } from "./buscar.js";

const indice = crearIndice([
  { href: "/recursos/resena", titulo: "Cómo responder reseñas sin sonar a robot", tipo: "prompt", palabra: "RESEÑA", resumen: "Usa la IA para responder", publicos: ["marcas"] },
  { href: "/recursos/recicla", titulo: "Un video, siete piezas de contenido", tipo: "prompt", palabra: "RECICLA", resumen: "Grabas una vez", publicos: ["creadores"] },
  { href: "/productos/editor-automatico", titulo: "Editor automático con Claude", tipo: "producto", resumen: "Claude te edita el video" },
]);

test("la palabra exacta del video encuentra la guía, sin importar tildes ni mayúsculas", () => {
  for (const q of ["RESEÑA", "reseña", "resena", "  Resena  "]) {
    assert.equal(buscar(indice, q).exacta?.href, "/recursos/resena", q);
  }
});

test("busca en título y resumen, y exige todas las palabras", () => {
  const r = buscar(indice, "video siete").resultados.map((x) => x.href);
  assert.deepEqual(r, ["/recursos/recicla"]);
});

test("una palabra parcial encuentra resultados y la coincidencia de palabra clave va primero", () => {
  const r = buscar(indice, "re").resultados.map((x) => x.href);
  assert.equal(r[0], "/recursos/resena");
  assert.equal(buscar(indice, "re").exacta, null);
});

test("encuentra productos", () => {
  assert.deepEqual(buscar(indice, "editor").resultados.map((x) => x.href), ["/productos/editor-automatico"]);
});

test("sin resultados y consulta vacía", () => {
  assert.deepEqual(buscar(indice, "astronauta"), { exacta: null, resultados: [] });
  assert.deepEqual(buscar(indice, "   "), { exacta: null, resultados: [] });
});

test("respeta el máximo", () => {
  assert.equal(buscar(indice, "e", 1).resultados.length, 1);
});
