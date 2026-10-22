import { test } from "node:test";
import assert from "node:assert/strict";
import { estaBloqueado, registrarFallo, limpiarIntentos } from "./intentos.js";
import { almacenMemoria } from "./almacen-memoria.js";

test("5 fallos bloquean; limpiar desbloquea", async () => {
  const a = almacenMemoria();
  for (let k = 0; k < 4; k++) await registrarFallo(a, "1.2.3.4");
  assert.equal(await estaBloqueado(a, "1.2.3.4"), false);
  await registrarFallo(a, "1.2.3.4");
  assert.equal(await estaBloqueado(a, "1.2.3.4"), true);
  assert.equal(await estaBloqueado(a, "9.9.9.9"), false);
  await limpiarIntentos(a, "1.2.3.4");
  assert.equal(await estaBloqueado(a, "1.2.3.4"), false);
});
