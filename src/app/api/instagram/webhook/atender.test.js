import { test } from "node:test";
import assert from "node:assert/strict";
import { redisMemoria } from "../../../admin/lib/instagram/redis-memoria.js";
import { COLA, PASE, REMITENTES } from "../../../admin/lib/instagram/claves.js";
import { guardarMarca } from "../../../mlabs/lib/automatizar/marcas.js";
import { guardarToken } from "../../../admin/lib/instagram/token.js";
import { huellaDe } from "./meta.js";
import { atenderEvento, hayAcciones } from "./atender.js";

const LINK = "https://vt.tiktok.com/ZSabc/";
const env = { IG_CUENTA_CABINA: "111", IG_CUENTA_PALABRAS: "222", IG_HUELLA_SECRETA: "secreto" };
const dm = (cuenta, sender) => ({ entry: [{ id: cuenta, messaging: [{ sender: { id: sender }, message: { text: LINK } }] }] });
const callar = async (fn) => { const l = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = l; } };

test("el pase directo de la Cabina sigue funcionando: guarda el link con huella y a la tercera persona lo fuerza", async () => {
  const r = redisMemoria();
  await callar(async () => {
    for (const s of ["1", "2", "3"]) await atenderEvento(r, dm("111", s), { env, avisar: async () => {} });
  });
  assert.equal((await r.lRange(COLA, 0, -1)).length, 1);
  assert.deepEqual((await r.sMembers(REMITENTES(LINK))).sort(), ["1", "2", "3"].map((s) => huellaDe(s, "secreto")).sort());
  assert.equal(await r.get(PASE(LINK)), "1");   // la tercera persona activó el pase una sola vez
});

test("sin IG_HUELLA_SECRETA el link entra a la cola pero el pase directo queda apagado", async () => {
  const r = redisMemoria(), logs = [];
  const l = console.log; console.log = (m) => logs.push(m);
  try { await atenderEvento(r, dm("111", "1"), { env: { ...env, IG_HUELLA_SECRETA: "" }, avisar: async () => {} }); } finally { console.log = l; }
  assert.equal((await r.lRange(COLA, 0, -1)).length, 1);
  assert.equal(await r.sCard(REMITENTES(LINK)), 0);
  assert.ok(logs.some((m) => /falta IG_HUELLA_SECRETA/.test(m)));
});

test("una marca sin pago o desconocida no se atiende; la Cabina sigue entrando aunque haya fichas", async () => {
  const r = redisMemoria();
  await guardarMarca(r, "500", { estado: "sin_pago" });
  const ev = { entry: [
    { id: "500", changes: [{ field: "comments", value: { id: "a", from: { id: "7" }, text: "precio" } }] },
    { id: "777", messaging: [{ sender: { id: "1" }, message: { text: "hola" } }] },
    ...dm("111", "9").entry,
  ] };
  const logs = [];
  const l = console.log; console.log = (m) => logs.push(m);
  try { await atenderEvento(r, ev, { env, avisar: async () => {} }); } finally { console.log = l; }
  assert.ok(logs.some((m) => /cuenta sin uso 500, 777/.test(m)));
  assert.equal((await r.lRange(COLA, 0, -1)).length, 1);
});

test("positivo: la casa (IG_CUENTA_PALABRAS) y una marca activa con token sí se atienden", async () => {
  const clave = Buffer.alloc(32, 7).toString("base64");
  const e2 = { ...env, MLABS_CLAVE_TOKENS: clave };
  const r = redisMemoria();
  await guardarMarca(r, "500", { estado: "activa" });
  await guardarToken(r, e2, "500", "TOK500", Date.now() + 1e9);
  await guardarToken(r, e2, "222", "TOK222", Date.now() + 1e9);
  const com = (id) => ({ id, changes: [{ field: "comments", value: { id: "c" + id, from: { id: "7" }, text: "sin palabras clave" } }] });
  const logs = [];
  const l = console.log; console.log = (m) => logs.push(m);
  try { await atenderEvento(r, { entry: [com("500"), com("222")] }, { env: e2, avisar: async () => {} }); } finally { console.log = l; }
  assert.equal(logs.some((m) => /sin uso/.test(m)), false);
  assert.ok(logs.some((m) => /webhook instagram: 500 comentario/.test(m)));
  assert.ok(logs.some((m) => /webhook instagram: 222 comentario/.test(m)));
});

test("hayAcciones: ecos, DMs sin link y avisos vacíos no tienen acciones posibles; un DM con link o un comentario sí", () => {
  assert.equal(hayAcciones({ entry: [{ id: "111", messaging: [{ sender: { id: "1" }, message: { is_echo: true, text: LINK } }] }] }, env), false);
  assert.equal(hayAcciones({ entry: [{ id: "111", messaging: [{ sender: { id: "1" }, message: { text: "hola" } }] }] }, env), false);
  assert.equal(hayAcciones({ entry: [{ id: "111" }] }, env), false);
  assert.equal(hayAcciones(null, env), false);
  assert.equal(hayAcciones(dm("111", "1"), env), true);
  assert.equal(hayAcciones({ entry: [{ id: "500", changes: [{ field: "comments", value: { id: "a", text: "x" } }] }] }, env), true);
});
