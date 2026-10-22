import { test } from "node:test";
import assert from "node:assert/strict";
import { almacenMemoria } from "./almacen-memoria.js";

test("guarda, lista (más nuevo primero), lee y borra", async () => {
  const a = almacenMemoria();
  await a.guardar({ id: "c1", creado: "2026-10-20T00:00:00Z" });
  await a.guardar({ id: "c2", creado: "2026-10-21T00:00:00Z" });
  assert.deepEqual((await a.listar()).map((p) => p.id), ["c2", "c1"]);
  await a.borrar("c1");
  assert.equal(await a.leer("c1"), null);
  assert.equal((await a.leer("c2")).id, "c2");
});
test("contador con suma y borrado", async () => {
  const a = almacenMemoria();
  assert.equal(await a.sumar("k", 900), 1);
  assert.equal(await a.sumar("k", 900), 2);
  assert.equal(await a.contador("k"), 2);
  await a.borrarClave("k");
  assert.equal(await a.contador("k"), 0);
});
