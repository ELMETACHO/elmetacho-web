import { test } from "node:test";
import assert from "node:assert/strict";
import { nuevoId, nuevoPedido, aplicarCambios, erroresParaEnviar, archivos, borradorVencido, prefijo } from "./pedido.js";

const P = () => nuevoPedido("c_20261021_ab12", "2026-10-21T18:30:00.000Z");
const arch = (n, extra = {}) => ({ pathname: `cantados/c_20261021_ab12/${n}`, tamano: 100, ...extra });

test("id con fecha y azar", () => assert.equal(nuevoId(new Date("2026-10-21T18:30:00Z"), "ab12"), "c_20261021_ab12"));

test("pedido nuevo en subiendo con estilo por defecto", () => {
  const p = P();
  assert.equal(p.estado, "subiendo");
  assert.equal(p.estilo, "Salsa, merengue");
  assert.deepEqual(p.pantallazos, []);
});

test("aplica cambios válidos y valida tramos contra la duración del original", () => {
  let { pedido, errores } = aplicarCambios(P(), { original: arch("original.mp4", { duracion: 28 }), titulo: "  hola  " });
  assert.deepEqual(errores, []);
  assert.equal(pedido.titulo, "hola");
  ({ pedido, errores } = aplicarCambios(pedido, { tramos: [[0, 4], [7, 13]] }));
  assert.deepEqual(pedido.tramos, [[0, 4], [7, 13]]);
  assert.match(aplicarCambios(pedido, { tramos: [[20, 40]] }).errores[0], /dura/);
});

test("rechaza archivos de otro pedido, estilos raros y cambios fuera de subiendo", () => {
  assert.match(aplicarCambios(P(), { gancho: { pathname: "cantados/otro/g.mov", tamano: 1 } }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { pantallazos: [{ pathname: "../x", tamano: 1 }] }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { estilo: "Reguetón" }).errores[0], /estilo/i);
  assert.match(aplicarCambios({ ...P(), estado: "listo" }, { titulo: "x" }).errores[0], /ya se envió/);
});

test("para enviar hace falta original, tramo, gancho y un pantallazo", () => {
  assert.equal(erroresParaEnviar(P()).length, 4);
  const p = { ...P(), original: arch("original.mp4", { duracion: 28 }), tramos: [[0, 4]], gancho: arch("gancho.mov"), pantallazos: [arch("p01.jpg")] };
  assert.deepEqual(erroresParaEnviar(p), []);
  assert.deepEqual(archivos(p), [p.original.pathname, p.gancho.pathname, p.pantallazos[0].pathname]);
  assert.equal(erroresParaEnviar({ ...p, gancho: { ...p.gancho, tamano: 0 } }).length, 1);
});

test("borrador de más de 48 h vence; uno listo nunca", () => {
  const t = Date.parse("2026-10-21T18:30:00.000Z");
  assert.equal(borradorVencido(P(), t + 49 * 3600e3), true);
  assert.equal(borradorVencido(P(), t + 47 * 3600e3), false);
  assert.equal(borradorVencido({ ...P(), estado: "listo" }, t + 99 * 3600e3), false);
  assert.equal(prefijo("x"), "cantados/x/");
});

test("rechaza rutas que no son la ranura exacta del pedido", () => {
  const ruta = (x) => aplicarCambios(P(), { original: { pathname: x, tamano: 1 } }).errores[0];
  assert.match(ruta("cantados/c_20261021_ab12/"), /archivo/);
  assert.match(ruta("cantados/c_20261021_ab12/%2e%2e/x"), /archivo/);
  assert.match(ruta("cantados/c_20261021_ab12/sub/original.mp4"), /archivo/);
  assert.match(ruta("cantados/c_20261021_ab12/original\..mp4"), /archivo/);
  assert.match(aplicarCambios(P(), { gancho: { pathname: "cantados/c_20261021_ab12/p01.jpg", tamano: 1 } }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { pantallazos: [{ pathname: "cantados/c_20261021_ab12/gancho.mov", tamano: 1 }] }).errores[0], /archivo/);
});

test("rechaza tamaños y medidas negativas o no finitas", () => {
  assert.match(aplicarCambios(P(), { original: arch("original.mp4", { tamano: -5 }) }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { original: arch("original.mp4", { tamano: 1.5 }) }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { original: arch("original.mp4", { tamano: NaN }) }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { original: arch("original.mp4", { duracion: -1 }) }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { gancho: arch("gancho.mov", { ancho: Infinity }) }).errores[0], /archivo/);
});

test("datos nulos o que no son objeto devuelven error sin lanzar", () => {
  assert.deepEqual(aplicarCambios(P(), null), { pedido: P(), errores: ["Datos inválidos."] });
  assert.deepEqual(aplicarCambios(P(), "x").errores, ["Datos inválidos."]);
  assert.deepEqual(aplicarCambios(P(), []).errores, ["Datos inválidos."]);
});
