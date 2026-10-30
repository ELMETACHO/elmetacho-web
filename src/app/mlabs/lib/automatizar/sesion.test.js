import { test } from "node:test";
import assert from "node:assert/strict";
import { COOKIE_MARCA, cookieMarca, cuentaDeReq, firmarMarca, marcaDeSesion, mismoOrigen, nuevoState, stateValido } from "./sesion.js";

const S = "secreto-de-prueba";
const DIA = 864e5;

test("la sesión guarda la cuenta, vence a los 30 días y no acepta firmas ajenas", () => {
  const v = firmarMarca("17841", S, 0);
  assert.equal(marcaDeSesion(v, S, 29 * DIA), "17841");
  assert.equal(marcaDeSesion(v, S, 31 * DIA), null);
  assert.equal(marcaDeSesion(v, "otro", 0), null);
  assert.equal(marcaDeSesion(v.replace("17841", "99999"), S, 0), null);
  assert.equal(marcaDeSesion(null, S, 0), null);
  assert.equal(marcaDeSesion(v, "", 0), null);   // sin secreto falla cerrado
});

test("firmarMarca lanza un error claro si falta MLABS_SESION_SECRETO", () => {
  assert.throws(() => firmarMarca("17841", "", 0), /MLABS_SESION_SECRETO/);
  assert.throws(() => firmarMarca("17841", undefined, 0), /MLABS_SESION_SECRETO/);
});

test("al firmar una cuenta nueva, la cookie resultante solo devuelve esa cuenta", () => {
  const cookie = cookieMarca(firmarMarca("222", S, 0)).split(";")[0];   // "mlabs_sesion=<valor>"
  const valor = cookie.slice(COOKIE_MARCA.length + 1);
  const req = { headers: new Headers({ cookie }) };
  assert.equal(cuentaDeReq(req, { MLABS_SESION_SECRETO: S }, 0), "222");
  assert.equal(marcaDeSesion(valor, S, 0), "222");
  assert.notEqual(marcaDeSesion(valor, S, 0), "111");
});

test("cookie de sesión: HttpOnly, Secure, Lax y para todo el sitio", () => {
  const c = cookieMarca("x");
  for (const parte of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/;"]) assert.ok(c.includes(parte), parte);
});

test("state: aleatorio y comparación exacta", () => {
  const s = nuevoState();
  assert.ok(s.length >= 40);
  assert.notEqual(s, nuevoState());
  assert.equal(stateValido(s, s), true);
  assert.equal(stateValido(s, s + "x"), false);
  assert.equal(stateValido(null, s), false);
  assert.equal(stateValido(s, null), false);
});

test("mismo origen: Origin debe coincidir con Host", () => {
  const req = (origin, host) => ({ headers: new Headers({ ...(origin ? { origin } : {}), host }) });
  assert.equal(mismoOrigen(req("https://mlabs.elmetacho.com", "mlabs.elmetacho.com")), true);
  assert.equal(mismoOrigen(req("https://malo.com", "mlabs.elmetacho.com")), false);
  assert.equal(mismoOrigen(req(null, "mlabs.elmetacho.com")), false);
});

test("cuentaDeReq lee la cookie con el secreto del entorno", () => {
  const v = firmarMarca("333", S, 0);
  const req = { headers: new Headers({ cookie: `otra=1; ${COOKIE_MARCA}=${v}` }) };
  assert.equal(cuentaDeReq(req, { MLABS_SESION_SECRETO: S }, 0), "333");
  assert.equal(cuentaDeReq(req, {}, 0), null);
});
