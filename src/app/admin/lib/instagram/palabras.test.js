import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarDisparador, esRespuestaPropia, guardarDisparadores, leerDisparadores, validarDisparadores } from "./palabras.js";
import { redisMemoria } from "./redis-memoria.js";

const d = (palabra, extra = {}) => ({ id: palabra, palabra, respuesta_publica: "¡Enviado! Revisa tu DM 📩", mensaje_dm: "Aquí está", link: "https://mlabs.elmetacho.com/recursos/x", pedir_seguir: false, activa: true, ...extra });

test("coincide la palabra completa sin mayúsculas ni tildes; la primera gana", () => {
  const lista = [d("curso"), d("guía"), d("curso gratis")];
  assert.equal(buscarDisparador("Curso!!", lista)?.id, "curso");
  assert.equal(buscarDisparador("quiero el CURSO 🙏", lista)?.id, "curso");
  assert.equal(buscarDisparador("la GUIA porfa", lista)?.id, "guía");
  assert.equal(buscarDisparador("recursos", lista), null);
  assert.equal(buscarDisparador("me da el cursooo", lista), null);
  assert.equal(buscarDisparador("", lista), null);
  assert.equal(buscarDisparador("curso", [d("curso", { activa: false })]), null);
  assert.equal(buscarDisparador("el curso gratis ya", [d("curso gratis")])?.id, "curso gratis");
  assert.equal(buscarDisparador("gratis el curso", [d("curso gratis")]), null);
});

test("respuesta propia: el texto es igual a una respuesta configurada", () => {
  const lista = [d("curso", { respuesta_publica: "Te envié el curso 📩" })];
  assert.equal(esRespuestaPropia("te envie el curso 📩", lista), true);
  assert.equal(esRespuestaPropia("curso", lista), false);
});

test("validar: campos, link https, tope de 1000 bytes y palabras repetidas", () => {
  let n = 0;
  const nuevoId = () => `id${n++}`;
  const ok = validarDisparadores([{ palabra: " Curso ", respuesta_publica: "Listo", mensaje_dm: "Hola", link: "https://mlabs.elmetacho.com/r", pedir_seguir: 1, activa: true }], nuevoId);
  assert.deepEqual(ok, { errores: [], disparadores: [{ id: "id0", palabra: "Curso", respuesta_publica: "Listo", mensaje_dm: "Hola", link: "https://mlabs.elmetacho.com/r", pedir_seguir: true, activa: true }] });
  const malos = validarDisparadores([
    { palabra: "", respuesta_publica: "x", mensaje_dm: "x", link: "https://a.co" },
    { palabra: "a", respuesta_publica: "x", mensaje_dm: "x", link: "http://a.co" },
    { palabra: "b", respuesta_publica: "x", mensaje_dm: "ñ".repeat(500), link: "https://a.co" },
    { palabra: "Guía", respuesta_publica: "x", mensaje_dm: "x", link: "https://a.co" },
    { palabra: "guia", respuesta_publica: "x", mensaje_dm: "x", link: "https://a.co" },
  ], nuevoId);
  assert.equal(malos.errores.length, 4);
  assert.match(malos.errores.join(" "), /palabra/);
  assert.match(malos.errores.join(" "), /https/);
  assert.match(malos.errores.join(" "), /1000/);
  assert.match(malos.errores.join(" "), /repetida/);
  assert.deepEqual(validarDisparadores("no", nuevoId).errores, ["La lista no es válida."]);
});

test("guardar y leer por cuenta", async () => {
  const r = redisMemoria();
  assert.deepEqual(await leerDisparadores(r, "222"), []);
  await guardarDisparadores(r, "222", [d("curso")]);
  assert.equal((await leerDisparadores(r, "222"))[0].palabra, "curso");
  assert.deepEqual(await leerDisparadores(r, "111"), []);
});
