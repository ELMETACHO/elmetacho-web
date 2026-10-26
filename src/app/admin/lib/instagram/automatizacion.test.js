import { test } from "node:test";
import assert from "node:assert/strict";
import { redisMemoria } from "./redis-memoria.js";
import { atenderComentario, atenderMensaje, BOTON } from "./automatizacion.js";

const curso = { id: "d1", palabra: "curso", respuesta_publica: "¡Enviado! Revisa tu DM 📩", mensaje_dm: "Aquí está el curso", link: "https://mlabs.elmetacho.com/recursos/curso", pedir_seguir: false, activa: true };
const conSeguir = { ...curso, id: "d2", palabra: "guia", pedir_seguir: true };

function montar({ sigue = true, falla = null } = {}) {
  const llamadas = [], fallos = [];
  const graph = {
    responderComentario: async (id, t) => { if (falla === "publica") throw new Error("no se puede"); llamadas.push(["publica", id, t]); },
    privado: async (c, id, m) => { if (falla === "privado") throw new Error("7 días"); llamadas.push(["privado", id, m]); },
    mensaje: async (c, u, m) => llamadas.push(["mensaje", u, m]),
    sigue: async () => sigue,
  };
  return { deps: { r: redisMemoria(), graph, disparadores: [curso, conSeguir], fallo: async (e) => fallos.push(e.message) }, llamadas, fallos };
}
const com = (texto, extra = {}) => ({ tipo: "comentario", cuenta: "222", id: "c1", usuario: "u1", texto, ...extra });

test("comentario con palabra: respuesta pública y DM con el link; repetido no responde dos veces", async () => {
  const { deps, llamadas } = montar();
  assert.equal(await atenderComentario(deps, com("quiero el CURSO")), "enviado");
  assert.deepEqual(llamadas, [
    ["publica", "c1", "¡Enviado! Revisa tu DM 📩"],
    ["privado", "c1", { text: "Aquí está el curso\nhttps://mlabs.elmetacho.com/recursos/curso" }],
  ]);
  assert.equal(await atenderComentario(deps, com("quiero el CURSO")), "repetido");
  assert.equal(llamadas.length, 2);
});

test("no se responde a sí misma (por id ni por texto igual a la respuesta) ni a comentarios sin palabra", async () => {
  const { deps, llamadas } = montar();
  deps.disparadores = [{ ...curso, respuesta_publica: "Te envié el curso 📩" }];   // la respuesta contiene la palabra
  assert.equal(await atenderComentario(deps, com("curso", { usuario: "222" })), "propio");
  assert.equal(await atenderComentario(deps, com("Te envié el curso 📩", { id: "c9", usuario: "u7" })), "sin palabra");
  assert.equal(await atenderComentario(deps, com("qué bonito", { id: "c8" })), "sin palabra");
  assert.equal(llamadas.length, 0);
});

test("si falla la respuesta pública igual va el DM; si falla el DM se anota", async () => {
  const a = montar({ falla: "publica" });
  assert.equal(await atenderComentario(a.deps, com("curso")), "enviado");
  assert.equal(a.llamadas[0][0], "privado");
  assert.deepEqual(a.fallos, ["no se puede"]);
  const b = montar({ falla: "privado" });
  assert.equal(await atenderComentario(b.deps, com("curso")), "fallo");
  assert.deepEqual(b.fallos, ["7 días"]);
});

test("pedir que siga: botón, y al escribir revisa si sigue", async () => {
  const { deps, llamadas } = montar({ sigue: false });
  assert.equal(await atenderComentario(deps, com("la guía")), "enviado");
  assert.equal(llamadas[1][2].quick_replies[0].title, BOTON);
  const msg = { tipo: "mensaje", cuenta: "222", usuario: "u1", payload: "YA_TE_SIGO" };
  assert.equal(await atenderMensaje(deps, msg), "no sigue");
  assert.match(llamadas[2][2].text, /Aún no me sigues/);
  deps.graph.sigue = async () => true;
  assert.equal(await atenderMensaje(deps, { ...msg, payload: null }), "enviado");   // cualquier mensaje sirve
  assert.deepEqual(llamadas[3], ["mensaje", "u1", { text: "Aquí está el curso\nhttps://mlabs.elmetacho.com/recursos/curso" }]);
  assert.equal(await atenderMensaje(deps, msg), "sin espera");
});

test("en pausa no responde nada", async () => {
  const { deps, llamadas } = montar();
  await deps.r.set("ig:222:pausa", "1");
  assert.equal(await atenderComentario(deps, com("curso")), "pausa");
  assert.equal(llamadas.length, 0);
});
