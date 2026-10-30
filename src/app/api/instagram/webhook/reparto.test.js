import { test } from "node:test";
import assert from "node:assert/strict";
import { cuentasDe, repartir } from "./reparto.js";

const C = { cabina: "111", responden: new Set(["222"]) };

test("DM a la cuenta de la Cabina → links; a la de palabras → mensaje; eco → nada", () => {
  const ev = { object: "instagram", entry: [
    { id: "111", messaging: [{ sender: { id: "9" }, message: { attachments: [{ type: "ig_reel", payload: { url: "https://www.instagram.com/reel/X/?igsh=1" } }] } }] },
    { id: "222", messaging: [
      { sender: { id: "8" }, message: { text: "Ya te sigo", quick_reply: { payload: "YA_TE_SIGO" } } },
      { sender: { id: "222" }, message: { is_echo: true, text: "eco" } },
    ] },
  ] };
  assert.deepEqual(repartir(ev, C).acciones, [
    { tipo: "links", cuenta: "111", usuario: "9", links: ["https://www.instagram.com/reel/X/"] },
    { tipo: "mensaje", cuenta: "222", usuario: "8", payload: "YA_TE_SIGO" },
  ]);
});

test("comentarios solo de la cuenta de palabras; id como value.id o value.comment_id", () => {
  const ev = { entry: [
    { id: "222", changes: [
      { field: "comments", value: { id: "c1", from: { id: "7", username: "ana" }, text: "Curso!!", media: { id: "m" } } },
      { field: "comments", value: { comment_id: "c2", from: { id: "6" }, text: "curso" } },
      { field: "live_comments", value: { id: "c3", from: { id: "5" }, text: "curso" } },
    ] },
    { id: "111", changes: [{ field: "comments", value: { id: "c4", from: { id: "4" }, text: "curso" } }] },
  ] };
  assert.deepEqual(repartir(ev, C).acciones, [
    { tipo: "comentario", cuenta: "222", id: "c1", usuario: "7", texto: "Curso!!", respuestaA: null },
    { tipo: "comentario", cuenta: "222", id: "c2", usuario: "6", texto: "curso", respuestaA: null },
  ]);
});

test("cuentas que no responden quedan como desconocidas; sin datos no se procesa nada", () => {
  const ev = { entry: [{ id: "333", messaging: [{ sender: { id: "1" }, message: { text: "https://vt.tiktok.com/A/" } }] }] };
  assert.deepEqual(repartir(ev, C), { acciones: [], desconocidas: ["333"] });
  assert.deepEqual(repartir({ entry: [{ id: "111", messaging: [] }] }, { responden: new Set() }).desconocidas, ["111"]);
  assert.deepEqual(repartir(null, C), { acciones: [], desconocidas: [] });
});

test("varias marcas: cada comentario va con su cuenta; una marca sin pago no aparece", () => {
  const ev = { entry: [
    { id: "500", changes: [{ field: "comments", value: { id: "a", from: { id: "7" }, text: "precio" } }] },
    { id: "600", changes: [{ field: "comments", value: { id: "b", from: { id: "8" }, text: "precio" } }] },
  ] };
  const { acciones, desconocidas } = repartir(ev, { cabina: "111", responden: new Set(["222", "500"]) });
  assert.deepEqual(acciones.map((a) => [a.cuenta, a.id]), [["500", "a"]]);
  assert.deepEqual(desconocidas, ["600"]);
});

test("cuentasDe: ids distintos del aviso", () => {
  assert.deepEqual(cuentasDe({ entry: [{ id: "1" }, { id: "2" }, { id: "1" }, {}] }), ["1", "2"]);
  assert.deepEqual(cuentasDe(null), []);
});

test("un comentario que responde a otro lleva respuestaA con el id del padre", () => {
  const ev = { entry: [{ id: "222", changes: [{ field: "comments", value: { id: "c5", parent_id: "c1", from: { id: "7" }, text: "curso" } }] }] };
  assert.deepEqual(repartir(ev, C).acciones, [{ tipo: "comentario", cuenta: "222", id: "c5", usuario: "7", texto: "curso", respuestaA: "c1" }]);
});
