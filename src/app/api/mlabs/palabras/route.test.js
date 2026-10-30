// route.test.js — las palabras clave son solo de la cuenta en sesión: sin sesión 401, origen ajeno 403 y una marca no toca las de otra (spec 2026-10-26 §3).
// Usa un Redis falso mínimo (protocolo RESP sobre un socket local) para comprobar de verdad qué se escribe y dónde.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { GET, PUT } from "./route.js";
import { firmarMarca } from "../../../mlabs/lib/automatizar/sesion.js";

const SECRETO = "secreto-de-prueba";
const datos = new Map();
let servidor, antes;

function falsoRedis() {
  return net.createServer((s) => {
    let buf = Buffer.alloc(0);
    s.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        const t = buf.toString("latin1");
        if (!t.startsWith("*")) return;
        const fin = t.indexOf("\r\n"); if (fin < 0) return;
        const n = Number(t.slice(1, fin)); let pos = fin + 2; const args = [];
        for (let i = 0; i < n; i++) {
          const f = t.indexOf("\r\n", pos); if (f < 0) return;
          const len = Number(t.slice(pos + 1, f)); const ini = f + 2;
          if (t.length < ini + len + 2) return;
          args.push(Buffer.from(t.slice(ini, ini + len), "latin1").toString("utf8")); pos = ini + len + 2;
        }
        buf = buf.subarray(pos);
        const cmd = args[0].toUpperCase();
        if (cmd === "GET") { const v = datos.get(args[1]); s.write(v === undefined ? "$-1\r\n" : `$${Buffer.byteLength(v)}\r\n${v}\r\n`); }
        else if (cmd === "SET") { datos.set(args[1], args[2]); s.write("+OK\r\n"); }
        else s.write("+OK\r\n");
      }
    });
    s.on("error", () => {});
  });
}

before(async () => {
  antes = { ...process.env };
  servidor = falsoRedis();
  await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
  process.env.KV_REDIS_URL = `redis://127.0.0.1:${servidor.address().port}`;
  process.env.MLABS_SESION_SECRETO = SECRETO;
});
after(() => { servidor.close(); process.env = antes; });

const cookie = (cuenta) => `mlabs_sesion=${firmarMarca(cuenta, SECRETO, Date.now())}`;
const palabra = { palabra: "guía", respuesta_publica: "¡Enviado!", mensaje_dm: "Aquí va", link: "https://ejemplo.com/g", pedir_seguir: false, activa: true };
const put = (cuenta, cuerpo, origen = "https://mlabs.elmetacho.com") => new Request("https://mlabs.elmetacho.com/api/mlabs/palabras", {
  method: "PUT",
  headers: { "content-type": "application/json", host: "mlabs.elmetacho.com", ...(origen ? { origin: origen } : {}), ...(cuenta ? { cookie: cookie(cuenta) } : {}) },
  body: JSON.stringify(cuerpo),
});
const get = (cuenta) => new Request("https://mlabs.elmetacho.com/api/mlabs/palabras", { headers: cuenta ? { cookie: cookie(cuenta) } : {} });

test("sin sesión: GET y PUT dan 401 y no escriben nada", async () => {
  assert.equal((await GET(get(null))).status, 401);
  assert.equal((await PUT(put(null, { disparadores: [palabra] }))).status, 401);
  assert.equal(datos.size, 0);
});

test("PUT con origen distinto o sin origen: 403 y no escribe", async () => {
  assert.equal((await PUT(put("111", { disparadores: [palabra] }, "https://malo.com"))).status, 403);
  assert.equal((await PUT(put("111", { disparadores: [palabra] }, null))).status, 403);
  assert.equal(datos.size, 0);
});

test("PUT con lista inválida: 400", async () => {
  const res = await PUT(put("111", { disparadores: [{ ...palabra, link: "http://x.com" }] }));
  assert.equal(res.status, 400);
  assert.equal(datos.size, 0);
});

test("una marca no puede tocar las palabras de otra, aunque mande la cuenta ajena en el cuerpo o la URL", async () => {
  const a = await PUT(put("111", { disparadores: [palabra] }));
  assert.equal(a.status, 200);
  // La marca 222 intenta escribir en la cuenta 111 por el cuerpo y por la URL: se ignora, escribe en la suya.
  const req = new Request("https://mlabs.elmetacho.com/api/mlabs/palabras?cuenta=111", {
    method: "PUT",
    headers: { "content-type": "application/json", host: "mlabs.elmetacho.com", origin: "https://mlabs.elmetacho.com", cookie: cookie("222") },
    body: JSON.stringify({ cuenta: "111", disparadores: [{ ...palabra, palabra: "otra" }] }),
  });
  assert.equal((await PUT(req)).status, 200);
  const de111 = await (await GET(get("111"))).json();
  const de222 = await (await GET(get("222"))).json();
  assert.deepEqual(de111.disparadores.map((d) => d.palabra), ["guía"]);
  assert.deepEqual(de222.disparadores.map((d) => d.palabra), ["otra"]);
  assert.equal(de111.pausa, false);
  assert.deepEqual([...datos.keys()].sort(), ["ig:111:disparadores", "ig:222:disparadores"]);
});
