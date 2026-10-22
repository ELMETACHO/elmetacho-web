import { test } from "node:test";
import assert from "node:assert/strict";
import { esperarGuardado, guardarEnFila } from "./cola.js";

const refs = () => ({ cola: { current: Promise.resolve() }, ultimo: { current: null } });
const falso = (respuestas) => { globalThis.fetch = async () => { const r = await respuestas.shift()(); return { ok: r.ok, status: r.status ?? (r.ok ? 200 : 500), json: async () => r.cuerpo ?? {} }; }; };

test("un guardado que falla en vuelo hace que cerrar NO envíe", async () => {
  const { cola, ultimo } = refs();
  falso([() => new Promise((s) => setTimeout(() => s({ ok: false, cuerpo: { error: "x" } }), 5))]);
  let marcado = false;
  guardarEnFila(cola, ultimo, "/u", {}, () => { marcado = true; });
  const r = await esperarGuardado(ultimo);
  assert.equal(r.ok, false);
  assert.equal(marcado, true);
});

test("un guardado posterior exitoso limpia el fallo anterior", async () => {
  const { cola, ultimo } = refs();
  falso([() => ({ ok: false }), () => ({ ok: true })]);
  guardarEnFila(cola, ultimo, "/u", {});
  guardarEnFila(cola, ultimo, "/u", {});
  assert.equal((await esperarGuardado(ultimo)).ok, true);
});

test("un fallo en el último guardado se ve aunque llegue durante la espera", async () => {
  const { cola, ultimo } = refs();
  falso([() => ({ ok: true }), () => ({ ok: false, status: 409 })]);
  guardarEnFila(cola, ultimo, "/u", {});
  const espera = esperarGuardado(ultimo);
  guardarEnFila(cola, ultimo, "/u", {});
  const r = await espera;
  assert.equal(r.ok, false);
  assert.equal(r.error.status, 409);
});

test("sin guardados, todo bien", async () => {
  assert.equal((await esperarGuardado({ current: null })).ok, true);
});
