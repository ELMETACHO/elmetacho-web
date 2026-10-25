import { test } from "node:test";
import assert from "node:assert/strict";
import { redisMemoria } from "./redis-memoria.js";
import { confirmarDm, listaDm, pendientesDm } from "./dm.js";
import { guardarLinks } from "../../../api/instagram/webhook/meta.js";

test("la cola de DM: pendientes en orden de llegada, confirmar los saca", async () => {
  const r = redisMemoria();
  await guardarLinks(r, ["https://vt.tiktok.com/A/"], "2026-10-25T10:00:00.000Z");
  await guardarLinks(r, ["https://www.instagram.com/reel/B/"], "2026-10-25T11:00:00.000Z");
  assert.deepEqual(await pendientesDm(r), ["https://vt.tiktok.com/A/", "https://www.instagram.com/reel/B/"]);
  assert.equal(await confirmarDm(r, ["https://vt.tiktok.com/A/", "", 7], "2026-10-26T05:00:00.000Z"), 1);
  assert.deepEqual(await pendientesDm(r), ["https://www.instagram.com/reel/B/"]);
  const lista = await listaDm(r);
  assert.equal(lista[0].link, "https://www.instagram.com/reel/B/");
  assert.equal(lista[1].entregado, "2026-10-26T05:00:00.000Z");
});

test("redis falso: SET NX con vencimiento", async () => {
  const reloj = { t: 0 };
  const r = redisMemoria(() => reloj.t);
  assert.equal(await r.set("k", "1", { condition: "NX", expiration: { type: "EX", value: 10 } }), "OK");
  assert.equal(await r.set("k", "2", { condition: "NX" }), null);
  reloj.t = 11_000;
  assert.equal(await r.get("k"), null);
});
