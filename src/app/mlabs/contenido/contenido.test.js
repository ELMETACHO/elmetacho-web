import { test } from "node:test";
import assert from "node:assert/strict";
import { validarContenido } from "./validar.js";

const publicos = [{ slug: "marcas", nombre: "Marcas", titulo: "t", intro: "i" }];
const guia = (extra = {}) => ({
  slug: "resena", palabra: "RESEÑA", titulo: "T", resumen: "R", tipo: "prompt",
  publicos: ["marcas"], tiempo: 3, actualizado: "2026-10-15",
  secciones: [{ titulo: "S1", bloques: [{ p: "x" }] }, { titulo: "S2", bloques: [{ ojo: "y" }] }],
  ...extra,
});
const producto = (extra = {}) => ({
  slug: "editor-automatico", nombre: "Editor", promesa: "P", paraQuien: ["a"], noEsPara: ["b"],
  queIncluye: ["c"], requisitos: ["d"], estado: "preventa", precioLanzamiento: null, precio: null,
  moneda: "COP", fechaEstimada: null, faq: [], ...extra,
});
const novedad = (extra = {}) => ({
  slug: "n1", titulo: "T", fecha: "2026-10-15", fuente: { nombre: "Fuente", url: "https://ejemplo.com" },
  queEs: "Q", paraQueTeSirve: "P", ...extra,
});
const base = (o = {}) => ({ guias: [guia()], productos: [producto()], novedades: [novedad()], publicos, ...o });

test("contenido válido no tiene errores", () => {
  assert.deepEqual(validarContenido(base()), []);
});

test("falta un campo obligatorio de la guía", () => {
  const e = validarContenido(base({ guias: [guia({ resumen: "" })] }));
  assert.ok(e.some((x) => x.includes("resena") && x.includes("resumen")), e.join("|"));
});

test("producto relacionado inexistente", () => {
  const e = validarContenido(base({ guias: [guia({ productoRelacionado: "no-existe" })] }));
  assert.ok(e.some((x) => x.includes("no-existe")), e.join("|"));
});

test("público desconocido", () => {
  const e = validarContenido(base({ guias: [guia({ publicos: ["astronautas"] })] }));
  assert.ok(e.some((x) => x.includes("astronautas")), e.join("|"));
});

test("seccionesLibres fuera de rango", () => {
  const e = validarContenido(base({ guias: [guia({ seccionesLibres: 5 })] }));
  assert.ok(e.some((x) => x.includes("seccionesLibres")), e.join("|"));
});

test("palabra repetida aunque cambien tildes o mayúsculas", () => {
  const e = validarContenido(base({ guias: [guia(), guia({ slug: "otra", palabra: "resena" })] }));
  assert.ok(e.some((x) => x.includes("palabra repetida")), e.join("|"));
});

test("bloque desconocido", () => {
  const e = validarContenido(base({ guias: [guia({ secciones: [{ titulo: "S", bloques: [{ video: "x" }] }] })] }));
  assert.ok(e.some((x) => x.includes("bloque desconocido")), e.join("|"));
});

test("novedad sin fuente o con URL que no es https", () => {
  for (const fuente of [undefined, { nombre: "X", url: "" }, { nombre: "X", url: "http://inseguro.com" }]) {
    const e = validarContenido(base({ novedades: [novedad({ fuente })] }));
    assert.ok(e.some((x) => x.includes("fuente")), e.join("|"));
  }
});

test("producto disponible sin precio", () => {
  const e = validarContenido(base({ productos: [producto({ estado: "disponible" })] }));
  assert.ok(e.some((x) => x.includes("precio")), e.join("|"));
});

test("producto en preventa puede ir sin precio ni fecha", () => {
  assert.deepEqual(validarContenido(base({ productos: [producto()] })), []);
});

test("slug repetido", () => {
  const e = validarContenido(base({ productos: [producto(), producto()] }));
  assert.ok(e.some((x) => x.includes("repetido")), e.join("|"));
});

test("el contenido real del sitio es válido", async () => {
  const c = await import("./index.js"); // lanza error si no es válido
  assert.ok(c.guias.length >= 4);
  assert.equal(c.guiaPorSlug("resena").palabra, "RESEÑA");
});

test("la guía EDITOR existe y lleva a la preventa del editor", async () => {
  const c = await import("./index.js");
  const g = c.guiaPorSlug("editor");
  assert.ok(g, "falta la guía editor");
  assert.equal(g.palabra, "EDITOR");
  assert.equal(g.productoRelacionado, "editor-automatico");
  assert.ok(g.secciones.length >= 3);
});

test("hay al menos una novedad publicada y todas tienen fuente https", async () => {
  const c = await import("./index.js");
  assert.ok(c.novedades.length >= 1);
  for (const n of c.novedades) assert.match(n.fuente.url, /^https:\/\//);
});

test("están las guías del contenido inicial del spec", async () => {
  const c = await import("./index.js");
  const palabras = c.guias.map((g) => g.palabra);
  for (const p of ["CLAUDE", "RESEÑA", "RECICLA", "COMPETENCIA", "EDITOR", "FICHA", "CALENDARIO", "CLIENTE", "DICTA", "FORMULA", "PRECIO"])
    assert.ok(palabras.includes(p), `falta ${p}`);
});

test("las tarjetas del catálogo no llevan el contenido completo de las guías", async () => {
  const c = await import("./index.js");
  assert.equal(c.tarjetasGuias.length, c.guias.length);
  for (const t of c.tarjetasGuias) {
    assert.equal(t.secciones, undefined, `la tarjeta ${t.slug} trae secciones`);
    for (const campo of ["slug", "tipo", "tiempo", "palabra", "titulo", "resumen", "publicos"]) assert.ok(t[campo], `${t.slug} sin ${campo}`);
  }
});
