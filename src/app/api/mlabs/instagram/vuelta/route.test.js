// route.test.js — la ruta de vuelta nunca responde 500: cualquier error acaba en «No se conectó tu cuenta» (foco 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route.js";

test("sin Redis ni variables (error inesperado): redirige a /automatizar?error=codigo con 302, no lanza", async () => {
  const antes = { ...process.env };
  delete process.env.KV_REDIS_URL; delete process.env.REDIS_URL;
  try {
    const req = new Request("https://mlabs.elmetacho.com/api/mlabs/instagram/vuelta?code=C&state=S", { headers: { cookie: "mlabs_state=S" } });
    const res = await GET(req);
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "https://mlabs.elmetacho.com/automatizar?error=codigo");
    assert.match(res.headers.get("set-cookie"), /mlabs_state=;/);
    assert.doesNotMatch(res.headers.get("set-cookie"), /mlabs_sesion=[^;]/);
  } finally { Object.assign(process.env, antes); }
});

test("el usuario cancela: va directo a ?error=cancelado sin tocar Redis", async () => {
  const res = await GET(new Request("https://mlabs.elmetacho.com/api/mlabs/instagram/vuelta?error=access_denied"));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "https://mlabs.elmetacho.com/automatizar?error=cancelado");
});
