import { test } from "node:test";
import assert from "node:assert/strict";
import { repartir } from "./reparto.js";

const C = { cabina: "111", palabras: "222" };

test("DM a la cuenta de la Cabina → links; a la de palabras → mensaje; eco → nada", () => {
  const ev = { object: "instagram", entry: [
    { id: "111", messaging: [{ sender: { id: "9" }, message: { attachments: [{ type: "ig_reel", payload: { url: "https://www.instagram.com/reel/X/?igsh=1" } }] } }] },
    { id: "222", messaging: [
      { sender: { id: "8" }, message: { text: "Ya te sigo", quick_reply: { payload: "YA_TE_SIGO" } } },
      { sender: { id: "222" }, message: { is_echo: true, text: "eco" } },
    ] },
  ] };
  assert.deepEqual(repartir(ev, C).acciones, [
    { tipo: "links", cuenta: "111", links: ["https://www.instagram.com/reel/X/"] },
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
    { tipo: "comentario", cuenta: "222", id: "c1", usuario: "7", texto: "Curso!!" },
    { tipo: "comentario", cuenta: "222", id: "c2", usuario: "6", texto: "curso" },
  ]);
});

test("cuentas que no están en las variables quedan como desconocidas; sin variables no se procesa nada", () => {
  const ev = { entry: [{ id: "333", messaging: [{ sender: { id: "1" }, message: { text: "https://vt.tiktok.com/A/" } }] }] };
  assert.deepEqual(repartir(ev, C), { acciones: [], desconocidas: ["333"] });
  assert.deepEqual(repartir({ entry: [{ id: "111", messaging: [] }] }, {}).desconocidas, ["111"]);
  assert.deepEqual(repartir(null, C), { acciones: [], desconocidas: [] });
});
