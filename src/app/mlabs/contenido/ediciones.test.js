import { test } from "node:test";
import assert from "node:assert/strict";
import { validarContenido } from "./validar.js";

const publicos = [{ slug: "marcas", nombre: "Marcas", titulo: "t", intro: "i" }];
const guia = (extra = {}) => ({
  slug: "claude", palabra: "CLAUDE", titulo: "T", resumen: "R", tipo: "guia",
  publicos: ["marcas"], tiempo: 3, actualizado: "2026-10-15",
  secciones: [{ titulo: "S1", bloques: [{ p: "x" }] }],
  ...extra,
});
const novedad = (extra = {}) => ({
  slug: "n1", titulo: "T", fecha: "2026-10-15", fuente: { nombre: "Fuente", url: "https://ejemplo.com" },
  queEs: "Q", paraQueTeSirve: "P", ...extra,
});
const edicion = (extra = {}) => ({
  slug: "2026-10-15", fecha: "2026-10-15", titulo: "Semana del 15 de octubre", intro: "I",
  destacado: novedad({ slug: "destacada" }),
  novedades: [novedad()],
  guiasRelacionadas: ["claude"],
  ...extra,
});
const base = (o = {}) => ({ guias: [guia()], productos: [], novedades: [], publicos, ediciones: [edicion()], palabraNovedades: "NOVEDADES", ...o });
const tiene = (e, texto) => assert.ok(e.some((x) => x.includes(texto)), e.join(" | "));

test("edición válida no tiene errores", () => {
  assert.deepEqual(validarContenido(base()), []);
});

test("edición sin destacado", () => {
  tiene(validarContenido(base({ ediciones: [edicion({ destacado: undefined })] })), "destacado");
});

test("el slug de la edición es su fecha AAAA-MM-DD", () => {
  tiene(validarContenido(base({ ediciones: [edicion({ slug: "semana-1" })] })), "slug de la edición");
  tiene(validarContenido(base({ ediciones: [edicion({ fecha: "2026-10-16" })] })), "slug de la edición");
});

test("edición repetida", () => {
  tiene(validarContenido(base({ ediciones: [edicion(), edicion()] })), "edición repetida");
});

test("novedades de la edición validadas: sin fuente https falla", () => {
  tiene(validarContenido(base({ ediciones: [edicion({ novedades: [novedad({ fuente: { nombre: "X", url: "http://x.com" } })] })] })), "fuente");
  tiene(validarContenido(base({ ediciones: [edicion({ destacado: novedad({ slug: "d", queEs: "" }) })] })), "queEs");
});

test("aclaración con su propia fuente https", () => {
  const mala = novedad({ aclaracion: { texto: "Ojo", fuente: { nombre: "Prensa", url: "" } } });
  tiene(validarContenido(base({ ediciones: [edicion({ novedades: [mala] })] })), "aclaración");
  const buena = novedad({ aclaracion: { texto: "Ojo", fuente: { nombre: "Prensa", url: "https://prensa.com" } } });
  assert.deepEqual(validarContenido(base({ ediciones: [edicion({ novedades: [buena] })] })), []);
});

test("cada curso del destacado dice para quién sirve", () => {
  const d = novedad({ slug: "d", cursos: [{ nombre: "Claude 101", paraQuien: "" }] });
  tiene(validarContenido(base({ ediciones: [edicion({ destacado: d })] })), "curso");
});

test("guía relacionada de la edición inexistente", () => {
  tiene(validarContenido(base({ ediciones: [edicion({ guiasRelacionadas: ["no-existe"] })] })), "no-existe");
});

test("la palabra NOVEDADES no puede repetirse en una guía", () => {
  tiene(validarContenido(base({ guias: [guia({ palabra: "Novedades" })] })), "palabra repetida");
});

test("slug de novedad repetido entre ediciones", () => {
  const e1 = edicion();
  const e2 = edicion({ slug: "2026-10-22", fecha: "2026-10-22", destacado: novedad({ slug: "otra" }) });
  tiene(validarContenido(base({ ediciones: [e1, e2] })), "novedad repetido: n1");
});

test("contenido real: la edición del 15 de octubre de 2026 está arriba y completa", async () => {
  const c = await import("./index.js");
  assert.ok(c.edicionesRecientes.length >= 1);
  const ultima = c.edicionesRecientes[0];
  assert.equal(ultima.slug, "2026-10-15");
  assert.equal(c.edicionPorSlug("2026-10-15"), ultima);
  assert.match(ultima.destacado.fuente.url, /^https:\/\/anthropic\.skilljar\.com/);
  const cursos = ultima.destacado.cursos.map((x) => x.nombre);
  for (const n of ["Claude 101", "Claude Code 101", "AI Fluency for Small Businesses", "AI Fluency for Creative Work"]) assert.ok(cursos.includes(n), `falta ${n}`);
  const gemini = ultima.novedades.find((n) => n.slug === "gemini-agent-workspace");
  assert.ok(gemini, "falta la novedad de Gemini");
  assert.match(gemini.aclaracion.texto, /vista previa privada/);
  assert.match(gemini.aclaracion.texto, /Business y Enterprise/);
  assert.ok(ultima.guiasRelacionadas.length >= 1);
  assert.equal(c.PALABRA_NOVEDADES, "NOVEDADES");
});

test("contenido real: ediciones de la más nueva a la más vieja y novedades con su edición", async () => {
  const c = await import("./index.js");
  const fechas = c.edicionesRecientes.map((e) => e.fecha);
  assert.deepEqual(fechas, [...fechas].sort().reverse());
  for (const n of c.novedadesRecientes) assert.ok(c.edicionPorSlug(n.edicion), `${n.slug} sin edición`);
});
