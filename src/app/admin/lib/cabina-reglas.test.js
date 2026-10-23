import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarCambios, nuevoPedido, sePuedeCancelar, subidaPermitida } from "./pedido.js";
import { aprobarRevision, faltaParaAprobar, noEditable, pedirMas } from "./revision.js";
import { nuevoCandidato, publicarCandidato, validarCandidato } from "./cabina.js";

const T = Date.parse("2026-10-23T19:10:00Z");
const H = 3600e3;
const ID = "c_20261023_ab12", B = `cantados/${ID}/`;
function candidato(estado = "en_revision") {
  const d = validarCandidato(ID, { link: "https://vt.tiktok.com/ZS9/", vista: { duracion: 31.5, ancho: 480, alto: 854 },
    comentarios: [{ id: "c1", usuario: "u", texto: "t", linea: "l,", dentro: true }] });
  assert.deepEqual(d.errores, []);
  return { ...publicarCandidato(nuevoCandidato(ID, new Date(T).toISOString(), d), T), estado };
}
const GANCHO = { pathname: B + "gancho.mov", tamano: 300, duracion: 4, ancho: 1080, alto: 1920 };

test("subidaPermitida: en la Cabina el navegador solo sube el gancho, y solo en revisión", () => {
  assert.equal(subidaPermitida(candidato(), B + "gancho.mov"), true);
  for (const r of ["vista.mp4", "m01.jpg", "p01.jpg", "original.mp4"]) assert.equal(subidaPermitida(candidato(), B + r), false, r);
  for (const e of ["subiendo", "aprobado", "automatico", "en_pc"]) assert.equal(subidaPermitida(candidato(e), B + "gancho.mov"), false, e);
  assert.equal(subidaPermitida(nuevoPedido(ID, new Date(T).toISOString()), B + "p01.jpg"), true);   // los pedidos normales siguen igual
});

test("aplicarCambios en un candidato en revisión: tramos contra la vista, destino y gancho; nada más", () => {
  const { pedido, errores } = aplicarCambios(candidato(), { tramos: [[2, 9]], destino: "story", gancho: GANCHO });
  assert.deepEqual(errores, []);
  assert.deepEqual([pedido.tramos, pedido.destino, pedido.gancho.pathname], [[[2, 9]], "story", B + "gancho.mov"]);
  assert.match(aplicarCambios(candidato(), { tramos: [[30, 33]] }).errores[0], /dura 31.5 s/);
  for (const c of [{ destino: "Story" }, { destino: 1 }, { titulo: "x" }, { estilo: "Salsa" }, { link: "https://vt.tiktok.com/ZS9/" },
                   { pantallazos: [] }, { gancho: { ...GANCHO, pathname: "cantados/otro/gancho.mov" } }])
    assert.equal(aplicarCambios(candidato(), c).errores.length, 1, JSON.stringify(c));
  for (const e of ["subiendo", "aprobado", "automatico", "en_pc"])
    assert.match(aplicarCambios(candidato(e), { destino: "story" }).errores[0], /ya no está en la Cabina/, e);
});

test("un pedido normal no cambia de destino después de creado (reel ↔ story)", () => {
  const p = nuevoPedido(ID, new Date(T).toISOString(), "pantallazos", "reel");
  const r = aplicarCambios(p, { destino: "story" });
  assert.deepEqual([r.errores, r.pedido.destino], [["El destino se escoge al crear el pedido."], "reel"]);
});

test("sePuedeCancelar: un candidato se descarta mientras espera a Oscar; decidido, no; los pedidos siguen igual", () => {
  for (const e of ["subiendo", "en_revision"]) assert.equal(sePuedeCancelar(candidato(e)), true, e);
  for (const e of ["aprobado", "automatico", "en_pc"]) assert.equal(sePuedeCancelar(candidato(e)), false, e);
  for (const e of ["en_pc", "en_revision", "aprobado"]) assert.equal(sePuedeCancelar({ tipo: "link", estado: e }), false, e);
  for (const e of ["subiendo", "listo", "fallido", "necesita_pantallazos"]) assert.equal(sePuedeCancelar({ tipo: "link", estado: e }), true, e);
});

test("aprobar un candidato exige gancho y un tramo (después de la versión); «trae más» no existe en la Cabina", () => {
  const p = candidato();
  assert.deepEqual(faltaParaAprobar(p), ["tu gancho", "marcar al menos un tramo"]);
  assert.deepEqual(faltaParaAprobar({ tipo: "link" }), []);
  assert.deepEqual(aprobarRevision(p, T, 1), { pedido: p, errores: ["Falta: tu gancho, marcar al menos un tramo."], faltan: true });
  assert.equal(aprobarRevision(p, T, 2).conflicto, true);
  const r = aprobarRevision({ ...p, gancho: GANCHO, tramos: [[2, 9]] }, T, 1);
  assert.deepEqual([r.errores, r.pedido.estado, r.pedido.automatico], [[], "aprobado", false]);
  assert.match(pedirMas(p, T, 1).errores[0], /no tiene «Trae más»/);
});

test("noEditable: el candidato vencido sale solo como story corta", () => {
  assert.equal(noEditable(candidato(), T + 70 * H - 1), null);
  assert.match(noEditable(candidato(), T + 70 * H), /story corta/);
});
