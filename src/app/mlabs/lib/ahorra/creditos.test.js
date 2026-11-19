import { test } from "node:test";
import assert from "node:assert/strict";
import { registrar, gastar, devolver, saldoDe, cookieSesion, leerSesion, carpeta, GRATIS, LIMITE_IP_DIA, REGISTROS_IP_DIA } from "./creditos.js";

function redis() {
  const m = new Map();
  return {
    m,
    get: async (k) => (m.has(k) ? m.get(k) : null),
    set: async (k, v, o = {}) => { if (o.NX && m.has(k)) return null; m.set(k, String(v)); return "OK"; },
    incr: async (k) => { const v = Number(m.get(k) ?? 0) + 1; m.set(k, String(v)); return v; },
    decr: async (k) => { const v = Number(m.get(k) ?? 0) - 1; m.set(k, String(v)); return v; },
    incrBy: async (k, n) => { const v = Number(m.get(k) ?? 0) + n; m.set(k, String(v)); return v; },
    expire: async () => 1,
  };
}

test("un correo nuevo recibe 3 gratis una sola vez", async () => {
  const r = redis();
  assert.deepEqual(await registrar(r, "ana@x.co", "1.1.1.1"), { saldo: GRATIS, nuevo: true });
  await gastar(r, "ana@x.co", "1.1.1.1");
  assert.deepEqual(await registrar(r, "ana@x.co", "1.1.1.1"), { saldo: GRATIS - 1, nuevo: false });
});

test("límite de correos nuevos por IP al día", async () => {
  const r = redis();
  for (let i = 0; i < REGISTROS_IP_DIA; i++) assert.equal((await registrar(r, `u${i}@x.co`, "2.2.2.2")).nuevo, true);
  assert.match((await registrar(r, "otro@x.co", "2.2.2.2")).error, /varios correos/);
  assert.equal((await registrar(r, "otro@x.co", "3.3.3.3")).nuevo, true);
});

test("gastar: baja el saldo, no pasa de cero y respeta el límite por IP", async () => {
  const r = redis();
  await registrar(r, "b@x.co", "4.4.4.4");
  for (let i = GRATIS - 1; i >= 0; i--) assert.deepEqual(await gastar(r, "b@x.co", "4.4.4.4"), { ok: true, saldo: i });
  const sin = await gastar(r, "b@x.co", "4.4.4.4");
  assert.equal(sin.sinSaldo, true);
  assert.equal(await saldoDe(r, "b@x.co"), 0);
  await devolver(r, "b@x.co");
  assert.equal(await saldoDe(r, "b@x.co"), 1);
  r.m.set("mlabs:ahorra:ip:5.5.5.5", String(LIMITE_IP_DIA));
  assert.match((await gastar(r, "b@x.co", "5.5.5.5")).error, /límite/);
  assert.equal(await saldoDe(r, "b@x.co"), 1);
});

test("sesión firmada: válida, adulterada o con otro secreto", () => {
  const c = cookieSesion("ana@x.co", "s");
  assert.equal(leerSesion(c, "s"), "ana@x.co");
  assert.equal(leerSesion(c, "otro"), null);
  assert.equal(leerSesion(cookieSesion("pepe@x.co", "s").split(".")[0] + "." + c.split(".")[1], "s"), null);
  assert.equal(leerSesion("basura", "s"), null);
  assert.equal(leerSesion(c, ""), null);
});

test("carpeta de subida por persona, sin el correo en claro", () => {
  assert.match(carpeta("Ana@X.co "), /^ahorra\/[a-f0-9]{16}\/$/);
  assert.equal(carpeta("ana@x.co"), carpeta(" ANA@x.co"));
  assert.ok(!carpeta("ana@x.co").includes("ana"));
});
