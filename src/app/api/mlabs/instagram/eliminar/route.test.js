// route.test.js — /eliminar y /desautorizar: firma inválida 400 sin tocar nada; asid desconocido responde {url, confirmation_code} (spec 2026-10-26 §6).
// Redis falso mínimo (RESP sobre un socket local): GET siempre vacío, así que todo asid es desconocido.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { createHmac } from "node:crypto";
import { POST as eliminar } from "./route.js";
import { POST as desautorizar } from "../desautorizar/route.js";

const SECRETO = "secreto-app";
let servidor, antes;
const comandos = [];

before(async () => {
  antes = { ...process.env };
  servidor = net.createServer((s) => {
    let buf = "";
    s.on("data", (d) => {
      buf += d.toString("latin1");
      for (;;) {
        if (!buf.startsWith("*")) return;
        const fin = buf.indexOf("\r\n"); if (fin < 0) return;
        const n = Number(buf.slice(1, fin)); let pos = fin + 2; const args = [];
        for (let i = 0; i < n; i++) {
          const f = buf.indexOf("\r\n", pos); if (f < 0) return;
          const len = Number(buf.slice(pos + 1, f)); const ini = f + 2;
          if (buf.length < ini + len + 2) return;
          args.push(buf.slice(ini, ini + len)); pos = ini + len + 2;
        }
        buf = buf.slice(pos);
        comandos.push(args[0].toUpperCase());
        s.write(args[0].toUpperCase() === "GET" ? "$-1\r\n" : "+OK\r\n");
      }
    });
    s.on("error", () => {});
  });
  await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
  process.env.KV_REDIS_URL = `redis://127.0.0.1:${servidor.address().port}`;
  process.env.IG_APP_SECRET = SECRETO;
});
after(() => { servidor.close(); process.env = antes; });

const firmar = (payload, secreto = SECRETO) => {
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${createHmac("sha256", secreto).update(p).digest("base64url")}.${p}`;
};
const post = (signed) => new Request("https://mlabs.elmetacho.com/api/mlabs/instagram/eliminar", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(signed == null ? {} : { signed_request: signed }).toString(),
});
const valido = { algorithm: "HMAC-SHA256", user_id: "A1", issued_at: 1700000000 };

test("firma inválida o ausente: 400 y no se escribe nada", async () => {
  for (const ruta of [eliminar, desautorizar]) {
    assert.equal((await ruta(post(firmar(valido, "otro")))).status, 400);
    assert.equal((await ruta(post(null))).status, 400);
  }
  assert.equal(comandos.some((c) => c === "DEL" || c === "SET"), false);
});

test("eliminar con asid desconocido: 200 con url y confirmation_code, sin borrar nada", async () => {
  const res = await eliminar(post(firmar(valido)));
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.match(j.confirmation_code, /^[0-9a-f]{16}$/);
  assert.equal(j.url, `https://mlabs.elmetacho.com/eliminar-datos?codigo=${j.confirmation_code}`);
  assert.equal(comandos.some((c) => c === "DEL" || c === "SET"), false);
});

test("desautorizar con asid desconocido: 200", async () => {
  assert.equal((await desautorizar(post(firmar(valido)))).status, 200);
});
