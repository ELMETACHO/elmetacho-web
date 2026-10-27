import { test } from "node:test";
import assert from "node:assert/strict";
import { crearGraph, ErrorMeta, renovarToken, tokenInvalido } from "./graph.js";

function fetchFalso(respuestas) {
  const llamadas = [];
  const f = async (url, init = {}) => {
    llamadas.push({ url, metodo: init.method || "GET", auth: init.headers?.Authorization, cuerpo: init.body ? JSON.parse(init.body) : null });
    const [status, d] = respuestas.shift() ?? [200, {}];
    return { ok: status < 400, status, json: async () => d };
  };
  return { f, llamadas };
}

test("respuesta pública, respuesta privada, mensaje y seguimiento", async () => {
  const { f, llamadas } = fetchFalso([[200, { id: "r1" }], [200, {}], [200, {}], [200, { is_user_follow_business: true }]]);
  const g = crearGraph({ token: "T", fetch: f });
  await g.responderComentario("c1", "¡Enviado!");
  await g.privado("222", "c1", { text: "hola" });
  await g.mensaje("222", "u9", { text: "link" });
  assert.equal(await g.sigue("u9"), true);
  assert.equal(llamadas[0].url, "https://graph.instagram.com/v26.0/c1/replies?message=%C2%A1Enviado!");
  assert.equal(llamadas[0].metodo, "POST");
  assert.equal(llamadas[0].auth, "Bearer T");
  assert.deepEqual(llamadas[1].cuerpo, { recipient: { comment_id: "c1" }, message: { text: "hola" } });
  assert.deepEqual(llamadas[2].cuerpo, { recipient: { id: "u9" }, message: { text: "link" } });
  assert.equal(llamadas[3].url, "https://graph.instagram.com/v26.0/u9?fields=is_user_follow_business");
});

test("errores de Meta con su código; 190 = token inválido", async () => {
  const { f } = fetchFalso([[400, { error: { message: "Invalid OAuth access token", code: 190 } }], [400, { error: { message: "otro", code: 10 } }]]);
  const g = crearGraph({ token: "T", fetch: f });
  await assert.rejects(g.privado("222", "c1", { text: "x" }), (e) => e instanceof ErrorMeta && tokenInvalido(e));
  await assert.rejects(g.sigue("u"), (e) => e instanceof ErrorMeta && !tokenInvalido(e));
});

test("renovar el token", async () => {
  const { f, llamadas } = fetchFalso([[200, { access_token: "N", token_type: "bearer", expires_in: 5184000 }]]);
  assert.deepEqual(await renovarToken("V", f), { access_token: "N", expires_in: 5184000 });
  assert.equal(llamadas[0].url, "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=V");
});
