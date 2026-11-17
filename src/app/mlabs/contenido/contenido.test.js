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

test("el contenido real del sitio es válido y las guías ya no viven en el código", async () => {
  const c = await import("./index.js"); // lanza error si no es válido
  assert.equal(c.guias, undefined, "las guías viven en Redis (mlabs:recursos), no en el repo público");
  assert.ok(c.productos.some((p) => p.slug === "edita-con-claude"));
});

test("hay al menos una novedad publicada y todas tienen fuente https", async () => {
  const c = await import("./index.js");
  assert.ok(c.novedades.length >= 1);
  for (const n of c.novedades) assert.match(n.fuente.url, /^https:\/\//);
});

test("lo gratis no revela los programas ni el método de los productos", async () => {
  const c = await import("./index.js");
  const { PROHIBIDAS } = await import("../lib/recursos/esquema.js");
  const textos = [
    ...c.productos.map((p) => [`producto ${p.slug}`, JSON.stringify(p)]),
    ...c.publicos.map((p) => [`público ${p.slug}`, JSON.stringify(p)]),
  ];
  for (const [donde, texto] of textos) {
    const m = texto.match(PROHIBIDAS);
    assert.equal(m, null, `${donde} menciona «${m?.[0]}»`);
  }
});
