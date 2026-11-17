import { test } from "node:test";
import assert from "node:assert/strict";
import { erroresRecurso, palabraOcupada, combinarRecursos } from "./esquema.js";

const ctx = { slugsPublicos: new Set(["marcas"]), slugsProductos: new Set(["kit"]), estricto: true };
const guia = (extra = {}) => ({
  slug: "resena", palabra: "RESEÑA", titulo: "T", resumen: "R", tipo: "prompt", publicos: ["marcas"], tiempo: 3,
  actualizado: "2026-11-16", secciones: [{ titulo: "S1", bloques: [{ p: "x" }] }, { titulo: "S2", bloques: [{ lista: ["a", "b"] }] }],
  ...extra,
});

test("una guía bien hecha no tiene errores", () => {
  assert.deepEqual(erroresRecurso(guia(), ctx), []);
});

test("estricto: rechaza bloques vacíos y secciones sin bloques", () => {
  assert.ok(erroresRecurso(guia({ secciones: [{ titulo: "S", bloques: [{ p: " " }] }] }), ctx).some((x) => x.includes("vacío")));
  assert.ok(erroresRecurso(guia({ secciones: [{ titulo: "S", bloques: [] }] }), ctx).some((x) => x.includes("no tiene bloques")));
  assert.ok(erroresRecurso(guia({ secciones: [{ titulo: "S", bloques: [{ lista: [] }] }] }), ctx).some((x) => x.includes("lista")));
});

test("estricto: lo gratis no revela el método", () => {
  const e = erroresRecurso(guia({ resumen: "Lo hago con FFmpeg" }), ctx);
  assert.ok(e.some((x) => x.includes("FFmpeg")), e.join("|"));
});

test("slug, tipo, público, producto y fecha inválidos", () => {
  const e = erroresRecurso(guia({ slug: "Mala Ñ", tipo: "video", publicos: ["nadie"], productoRelacionado: "x", actualizado: "16-11" }), ctx);
  for (const parte of ["slug", "tipo", "nadie", "producto relacionado", "AAAA-MM-DD"]) assert.ok(e.some((x) => x.includes(parte)), parte);
});

test("seccionesLibres fuera de rango", () => {
  assert.ok(erroresRecurso(guia({ seccionesLibres: 5 }), ctx).some((x) => x.includes("seccionesLibres")));
});

test("no estricto (build): no revisa palabras prohibidas", () => {
  assert.deepEqual(erroresRecurso(guia({ resumen: "python" }), { ...ctx, estricto: false }), []);
});

test("palabra ocupada por otro recurso o reservada; la propia no cuenta", () => {
  const otros = [{ slug: "otra", palabra: "Reseña" }, { slug: "resena", palabra: "RESEÑA" }];
  assert.equal(palabraOcupada(guia(), otros), true);
  assert.equal(palabraOcupada(guia(), [{ slug: "resena", palabra: "RESENA" }]), false);
  assert.equal(palabraOcupada(guia({ palabra: "novedades" }), [], ["NOVEDADES"]), true);
});

test("combinar: Redis gana sobre lo heredado y suma lo nuevo", () => {
  const r = combinarRecursos([{ slug: "a", v: 1 }, { slug: "b", v: 1 }], [{ slug: "b", v: 2 }, { slug: "c", v: 2 }]);
  assert.deepEqual(r.map((g) => `${g.slug}${g.v}`), ["a1", "b2", "c2"]);
});
