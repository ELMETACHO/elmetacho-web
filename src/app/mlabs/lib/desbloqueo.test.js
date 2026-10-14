import { test } from "node:test";
import assert from "node:assert/strict";
import {
  estaDesbloqueado, marcarDesbloqueado, trasFallo, guardarPendiente, tomarPendiente, CLAVE_DESBLOQUEO,
} from "./desbloqueo.js";

const memoria = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const roto = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceeded"); }, removeItem() { throw new Error("x"); } };

test("recuerda el desbloqueo", () => {
  const a = memoria();
  assert.equal(estaDesbloqueado(a), false);
  marcarDesbloqueado(a);
  assert.equal(estaDesbloqueado(a), true);
  assert.equal(a.getItem(CLAVE_DESBLOQUEO), "1");
});

test("sin almacenamiento (nulo o que lanza) no rompe nada", () => {
  for (const a of [null, undefined, roto]) {
    assert.equal(estaDesbloqueado(a), false);
    assert.doesNotThrow(() => marcarDesbloqueado(a));
    assert.doesNotThrow(() => guardarPendiente(a, { x: 1 }));
    assert.equal(tomarPendiente(a), null);
  }
});

test("primer fallo muestra error; segundo fallo desbloquea igual", () => {
  assert.equal(trasFallo(1), "mostrar-error");
  assert.equal(trasFallo(2), "desbloquear");
  assert.equal(trasFallo(3), "desbloquear");
});

test("el lead pendiente se guarda y se toma una sola vez", () => {
  const a = memoria();
  guardarPendiente(a, { correo: "a@b.co", origen: "guia-resena" });
  assert.deepEqual(tomarPendiente(a), { correo: "a@b.co", origen: "guia-resena" });
  assert.equal(tomarPendiente(a), null);
});

test("un pendiente corrupto se descarta", () => {
  const a = memoria();
  a.setItem("mlabs:lead-pendiente", "{no es json");
  assert.equal(tomarPendiente(a), null);
});
