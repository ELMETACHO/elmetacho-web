import { test } from "node:test";
import assert from "node:assert/strict";
import { firmarSesion, sesionValida, claveCorrecta, leerCookie, cookieSesion, tokenPcValido } from "./sesion.js";

const T0 = Date.UTC(2026, 9, 21);
test("una sesión firmada vale 30 días y luego vence", () => {
  const v = firmarSesion("clave-1", T0);
  assert.equal(sesionValida(v, "clave-1", T0 + 29 * 864e5), true);
  assert.equal(sesionValida(v, "clave-1", T0 + 31 * 864e5), false);
});
test("cambiar la clave invalida la sesión; alterar la firma también", () => {
  const v = firmarSesion("clave-1", T0);
  assert.equal(sesionValida(v, "clave-2", T0), false);
  assert.equal(sesionValida(v.slice(0, -2) + "xx", "clave-1", T0), false);
  assert.equal(sesionValida("basura", "clave-1", T0), false);
  assert.equal(sesionValida(v, "", T0), false);
  assert.equal(sesionValida(v, "clave-1", undefined), false);   // falla cerrado
  assert.equal(sesionValida(v, "clave-1", NaN), false);
});
test("compara la clave sin importar el largo", () => {
  assert.equal(claveCorrecta("abc", "abc"), true);
  assert.equal(claveCorrecta("abcd", "abc"), false);
  assert.equal(claveCorrecta("abc", undefined), false);
});
test("cookie: leer y escribir", () => {
  assert.equal(leerCookie("a=1; admin_sesion=xyz; b=2", "admin_sesion"), "xyz");
  assert.equal(leerCookie(null, "admin_sesion"), null);
  assert.match(cookieSesion("xyz"), /admin_sesion=xyz; Path=\/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000/);
});
test("token del PC", () => {
  assert.equal(tokenPcValido("Bearer t0k", "t0k"), true);
  assert.equal(tokenPcValido("Bearer otro", "t0k"), false);
  assert.equal(tokenPcValido(null, "t0k"), false);
  assert.equal(tokenPcValido("Bearer ", ""), false);
});
