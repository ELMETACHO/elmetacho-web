// route.test.js — un aviso sin acciones posibles responde 200 sin tocar Redis, aunque Redis falle (revisión T7).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { POST } from "./route.js";

const post = (obj) => {
  const cuerpo = JSON.stringify(obj);
  const firma = "sha256=" + createHmac("sha256", process.env.IG_APP_SECRET).update(cuerpo).digest("hex");
  return POST(new Request("https://x/api/instagram/webhook", { method: "POST", body: cuerpo, headers: { "x-hub-signature-256": firma } }));
};

test("sin Redis: eco, DM sin link y avisos sin mensajes ni comentarios dan 200; un DM con link da 500 (Meta reintenta)", async () => {
  const antes = { ...process.env };
  delete process.env.KV_REDIS_URL; delete process.env.REDIS_URL;
  Object.assign(process.env, { IG_APP_SECRET: "s", IG_CUENTA_CABINA: "111", IG_CUENTA_PALABRAS: "222" });
  const err = console.error; console.error = () => {};
  try {
    const dm = (id, message) => ({ entry: [{ id, messaging: [{ sender: { id: "9" }, message }] }] });
    assert.equal((await post(dm("111", { is_echo: true, text: "https://vt.tiktok.com/A/" }))).status, 200);
    assert.equal((await post(dm("111", { text: "hola" }))).status, 200);
    assert.equal((await post(dm("999", { is_echo: true, text: "eco" }))).status, 200);
    assert.equal((await post({ entry: [{ id: "999" }] })).status, 200);
    assert.equal((await post(dm("111", { text: "https://vt.tiktok.com/A/" }))).status, 500);
  } finally { console.error = err; for (const k of Object.keys(process.env)) if (!(k in antes)) delete process.env[k]; Object.assign(process.env, antes); }
});
