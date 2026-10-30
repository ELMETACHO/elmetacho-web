import { test } from "node:test";
import assert from "node:assert/strict";
import { ErrorMeta } from "../../../admin/lib/instagram/graph.js";
import { ALCANCES, canjearCodigo, desuscribirWebhook, perfil, suscribirWebhook, tokenLargo, urlAutorizacion } from "./instagram.js";

const falso = (respuestas) => {
  const llamadas = [];
  const f = async (url, op = {}) => { llamadas.push({ url: String(url), op }); const r = respuestas.shift(); return new Response(JSON.stringify(r.cuerpo), { status: r.status ?? 200 }); };
  return { f, llamadas };
};

test("URL de autorización con los tres permisos, code y state", () => {
  const u = new URL(urlAutorizacion({ clientId: "123", redirectUri: "https://mlabs.elmetacho.com/api/mlabs/instagram/vuelta", state: "S" }));
  assert.equal(u.origin + u.pathname, "https://www.instagram.com/oauth/authorize");
  assert.equal(u.searchParams.get("client_id"), "123");
  assert.equal(u.searchParams.get("response_type"), "code");
  assert.equal(u.searchParams.get("state"), "S");
  assert.equal(u.searchParams.get("scope"), ALCANCES);
  assert.ok(ALCANCES.includes("instagram_business_manage_comments"));
});

test("canjear: POST con formulario, quita #_ y devuelve el token corto", async () => {
  const { f, llamadas } = falso([{ cuerpo: { data: [{ access_token: "CORTO", user_id: "9", permissions: "x" }] } }]);
  const r = await canjearCodigo({ code: "ABC#_", clientId: "1", secreto: "s", redirectUri: "https://x/v", fetch: f });
  assert.equal(r.token, "CORTO");
  assert.equal(llamadas[0].url, "https://api.instagram.com/oauth/access_token");
  assert.equal(llamadas[0].op.method, "POST");
  assert.equal(new URLSearchParams(llamadas[0].op.body).get("code"), "ABC");
  assert.equal(new URLSearchParams(llamadas[0].op.body).get("grant_type"), "authorization_code");
});

test("canjear también acepta la respuesta sin data[] (formato plano)", async () => {
  const { f } = falso([{ cuerpo: { access_token: "CORTO", user_id: "9" } }]);
  assert.equal((await canjearCodigo({ code: "A", clientId: "1", secreto: "s", redirectUri: "r", fetch: f })).token, "CORTO");
});

test("code vencido o repetido: lanza ErrorMeta (la ruta lo convierte en mensaje amable)", async () => {
  const { f } = falso([{ status: 400, cuerpo: { error_type: "OAuthException", code: 400, error_message: "This authorization code has been used" } }]);
  await assert.rejects(
    canjearCodigo({ code: "A", clientId: "1", secreto: "s", redirectUri: "r", fetch: f }),
    (e) => e instanceof ErrorMeta && /authorization code/.test(e.message) && e.codigo === 400,
  );
});

test("canjear: respuesta sin token o cuerpo no JSON también es ErrorMeta, no un TypeError", async () => {
  const vacio = falso([{ cuerpo: { data: [] } }]);
  await assert.rejects(canjearCodigo({ code: "A", clientId: "1", secreto: "s", redirectUri: "r", fetch: vacio.f }), ErrorMeta);
  const html = async () => new Response("<html>502</html>", { status: 502 });
  await assert.rejects(canjearCodigo({ code: "A", clientId: "1", secreto: "s", redirectUri: "r", fetch: html }), ErrorMeta);
});

test("token largo y perfil", async () => {
  const { f, llamadas } = falso([
    { cuerpo: { access_token: "LARGO", token_type: "bearer", expires_in: 5183944 } },
    { cuerpo: { user_id: "17841", username: "tienda", account_type: "BUSINESS", id: "app-scoped" } },
  ]);
  assert.deepEqual(await tokenLargo({ token: "CORTO", secreto: "s", fetch: f }), { access_token: "LARGO", expires_in: 5183944 });
  assert.match(llamadas[0].url, /graph\.instagram\.com\/access_token\?grant_type=ig_exchange_token/);
  assert.deepEqual(await perfil({ token: "LARGO", fetch: f }), { cuenta: "17841", usuario: "tienda", tipo: "BUSINESS", asid: "app-scoped" });
  assert.match(llamadas[1].url, /fields=user_id%2Cusername%2Caccount_type%2Cid$|fields=user_id,username,account_type,id$/);
  assert.equal(llamadas[1].op.headers.Authorization, "Bearer LARGO");
});

test("token largo sin access_token o sin expires_in numérico, y perfil sin user_id: ErrorMeta", async () => {
  for (const cuerpo of [{ expires_in: 5 }, { access_token: "L" }, { access_token: "L", expires_in: "pronto" }]) {
    await assert.rejects(tokenLargo({ token: "C", secreto: "s", fetch: falso([{ cuerpo }]).f }), ErrorMeta);
  }
  for (const cuerpo of [{ username: "x" }, { user_id: null, username: "x" }]) {
    await assert.rejects(perfil({ token: "L", fetch: falso([{ cuerpo }]).f }), ErrorMeta);
  }
});

test("suscribir y desuscribir el webhook de la cuenta", async () => {
  const { f, llamadas } = falso([{ cuerpo: { success: true } }, { cuerpo: { success: true } }]);
  await suscribirWebhook({ token: "T", fetch: f });
  await desuscribirWebhook({ token: "T", fetch: f });
  assert.match(llamadas[0].url, /\/me\/subscribed_apps\?subscribed_fields=comments%2Cmessages$/);
  assert.equal(llamadas[0].op.method, "POST");
  assert.equal(llamadas[1].op.method, "DELETE");
});
