import { test } from "node:test";
import assert from "node:assert/strict";
import { enviarLead } from "./enviarLead.js";

const respuesta = (ok, cuerpo) => async () => ({ ok, json: async () => cuerpo });

test("envía el lead como JSON a /api/lead", async () => {
  let llamada;
  const f = async (url, op) => { llamada = { url, op }; return { ok: true, json: async () => ({ ok: true }) }; };
  assert.equal(await enviarLead({ correo: "a@b.co", origen: "guia-resena" }, f), true);
  assert.equal(llamada.url, "/api/lead");
  assert.equal(llamada.op.method, "POST");
  assert.deepEqual(JSON.parse(llamada.op.body), { correo: "a@b.co", origen: "guia-resena" });
});

test("si la API responde error, lanza su mensaje", async () => {
  await assert.rejects(enviarLead({}, respuesta(false, { error: "Faltan datos." })), /Faltan datos\./);
});

test("si la API no devuelve JSON, lanza un mensaje genérico", async () => {
  const f = async () => ({ ok: false, json: async () => { throw new Error("no json"); } });
  await assert.rejects(enviarLead({}, f), /No pudimos guardar tus datos/);
});

test("si no hay red, propaga el error", async () => {
  await assert.rejects(enviarLead({}, async () => { throw new TypeError("Failed to fetch"); }), /Failed to fetch/);
});
