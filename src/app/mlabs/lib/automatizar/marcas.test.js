import { test } from "node:test";
import assert from "node:assert/strict";
import { redisMemoria } from "../../../admin/lib/instagram/redis-memoria.js";
import { altaMarca, clavesDeCuenta, guardarMarca, leerMarca, listarClientes, responde } from "./marcas.js";

test("alta: crea la ficha sin pago y la agrega a la lista; la segunda vez no cambia el estado", async () => {
  const r = redisMemoria();
  const a = await altaMarca(r, { cuenta: "1", usuario: "tienda", ahora: () => 5 });
  assert.equal(a.nueva, true);
  assert.deepEqual(a.marca, { usuario: "tienda", alta: 5, tipo: "cliente", origen: null, estado: "sin_pago", correo: null, reconectar_desde: null });
  assert.deepEqual(await listarClientes(r), ["1"]);
  await guardarMarca(r, "1", { ...a.marca, estado: "activa", reconectar_desde: 9 });
  const b = await altaMarca(r, { cuenta: "1", usuario: "tienda_nueva", ahora: () => 50 });
  assert.equal(b.nueva, false);
  assert.equal(b.marca.estado, "activa");
  assert.equal(b.marca.usuario, "tienda_nueva");
  assert.equal(b.marca.reconectar_desde, null);   // reconectar limpia la marca
  assert.equal((await leerMarca(r, "1")).alta, 5);
});

test("responde: activa o pago fallido sin reconexión pendiente; nada más", () => {
  const m = (estado, reconectar_desde = null) => ({ estado, reconectar_desde });
  assert.equal(responde(m("activa")), true);
  assert.equal(responde(m("pago_fallido")), true);
  assert.equal(responde(m("sin_pago")), false);
  assert.equal(responde(m("cancelada")), false);
  assert.equal(responde(m("activa", 123)), false);
  assert.equal(responde(null), false);
});

test("clavesDeCuenta encuentra todas las claves ig:<cuenta>:* y no las de otra cuenta", async () => {
  const r = redisMemoria();
  await r.set("ig:1:marca", "{}");
  await r.set("ig:1:respondido:c1", "1");
  await r.set("ig:12:marca", "{}");
  assert.deepEqual((await clavesDeCuenta(r, "1")).sort(), ["ig:1:marca", "ig:1:respondido:c1"]);
});

test("redis en memoria: sRem y sMembers; un set vacío desaparece", async () => {
  const r = redisMemoria();
  await r.sAdd("s", "a"); await r.sAdd("s", "b");
  assert.equal(await r.sRem("s", "a"), 1);
  assert.equal(await r.sRem("s", "a"), 0);
  assert.deepEqual(await r.sMembers("s"), ["b"]);
  await r.sRem("s", "b");
  assert.deepEqual(await r.sMembers("s"), []);
});
