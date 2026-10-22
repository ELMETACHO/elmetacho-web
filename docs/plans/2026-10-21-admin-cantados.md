# Admin de cantados · Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** que Oscar arme pedidos de "comentarios cantados" en `elmetacho.com/admin` (privado) y que el PC los recoja en la franja de las 2 p. m., los produzca y los entregue por Telegram, sin dejar nada en la nube.

**Arquitectura:** Web (Next 16) con toda la lógica pura en `src/app/admin/lib/` (probada con `node:test`) y rutas delgadas que la llaman con dependencias reales (Redis, Vercel Blob, Telegram). El navegador sube los archivos directo a Blob privado. El PC (Python, `PREMIERE-CLAUDE/cantados`) consulta la API del PC, baja con enlaces firmados, avisa "bajado" (la web borra los blobs) y reutiliza el camino de pedidos con pantallazos que ya existe.

**Stack:** Next.js 16.4.1 (App Router, JSX), React 19, Tailwind v4, `redis` 6, `@vercel/blob` (nuevo), `node:test`; Python 3 + pytest en el PC.

**Spec:** `docs/superpowers/specs/2026-10-21-admin-design.md`

## Restricciones globales

- Todo el código web en `src/app/admin/**`; docs en `docs/admin.md`. Fuera de ahí solo `package.json`/`package-lock.json` (PR 1, aprueba Oscar) y `src/app/robots.js` (PR 2, aprueba Oscar).
- Ninguna API de `src/app/admin/api/` responde sin verificar sesión (o `ADMIN_PC_TOKEN` en `api/pc/*`).
- Variables: `ADMIN_CLAVE`, `ADMIN_PC_TOKEN`, `BLOB_READ_WRITE_TOKEN`/`BLOB_STORE_ID` (Blob), `KV_REDIS_URL` (Redis), `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` (aviso). Nunca abrir `.env*`.
- Cookie `admin_sesion`: httpOnly, Secure, SameSite=Lax, Path=/admin, 30 días, HMAC-SHA256 con llave derivada de `ADMIN_CLAVE`.
- Bloqueo: 5 intentos fallidos por IP → 15 min.
- Tramos: máx. 3, sin tope; aviso (no bloquea) si el total > 25 s; `bucle_largo` si total > 7 s.
- Estilos: `"Salsa, merengue"` (defecto), `"Salsa"`, `"Merengue"`.
- Estados web: `subiendo` → `listo` → `en_pc` → (borrado al entregar) | `fallido`.
- Blob: privado; rutas `cantados/<id>/original.<ext>`, `gancho.<ext>`, `pNN.<ext>`; se borran al marcar `bajado`.
- Borradores `subiendo` de más de 48 h se borran al consultar el PC.
- Textos de la interfaz en español, tuteo colombiano.
- Antes de cada PR: `npm test`, `npx eslint --ignore-pattern ".claude/**"`, `npm run build` sin errores.

## Foco de revisión

1. Archivo enorme (gancho 4K de 300 MB) subido con mala señal: la subida debe ser multiparte y reintentar; el pedido queda `subiendo`, nunca `listo` con un archivo incompleto → `erroresParaEnviar` exige `tamano > 0` y la API `PATCH` verifica con `head()` que el blob exista con ese tamaño (Task 5).
2. Pantallazos vacíos o un `pathname` de otro pedido metido a mano en el `PATCH`: se rechaza todo `pathname` fuera de `cantados/<id>/` (Task 3).
3. El PC pide la lista dos veces (pasada cortada) antes de marcar `bajado`: no debe duplicar el pedido en `pedidos.json` → `leer_web` salta ids ya registrados (Task 11).
4. Oscar cancela justo cuando el PC lo está bajando: `DELETE` con `en_pc` responde 409 y `bajado` sobre un pedido inexistente responde 404 sin romper la pasada (Tasks 5 y 11).
5. Tramo que pasa la duración del video (Oscar marcó con el video de 28 s y el fin quedó en 28,2 por redondeo): se recorta al final del video si excede ≤ 0,3 s; si excede más, error (Task 1).

---

## Parte A · Web (`C:\Users\delga\Documents\elmetacho-web`, rama `feat/admin-cantados`)

### Task 1: Tramos

**Files:**
- Create: `src/app/admin/lib/tramos.js`
- Test: `src/app/admin/lib/tramos.test.js`

**Interfaces:**
- Produces: `MAX_TRAMOS = 3`, `AVISO_S = 25`, `LARGO_S = 7`, `validarTramos(tramos: number[][], duracion?: number) → { tramos: number[][], errores: string[] }`, `totalContexto(tramos) → number`, `avisoLargo(tramos) → boolean`.

- [ ] **Paso 1: prueba que falla**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarTramos, totalContexto, avisoLargo, MAX_TRAMOS } from "./tramos.js";

test("ordena, redondea a décimas y acepta hasta 3 tramos sin tope", () => {
  const r = validarTramos([[7, 13.04], [0, 4]], 28);
  assert.deepEqual(r, { tramos: [[0, 4], [7, 13]], errores: [] });
  assert.equal(validarTramos([[0, 20], [21, 40], [41, 60]], 61).errores.length, 0);
});

test("rechaza más de 3, solapados, fin <= inicio y negativos", () => {
  assert.match(validarTramos([[0, 1], [2, 3], [4, 5], [6, 7]]).errores[0], /máximo 3/);
  assert.match(validarTramos([[0, 5], [4, 8]]).errores[0], /se pisan/);
  assert.match(validarTramos([[5, 5]]).errores[0], /fin/);
  assert.match(validarTramos([[-1, 3]]).errores[0], /fin|inicio/);
  assert.equal(MAX_TRAMOS, 3);
});

test("pasar el final del video por <= 0,3 s se recorta; más es error", () => {
  assert.deepEqual(validarTramos([[20, 28.2]], 28).tramos, [[20, 28]]);
  assert.match(validarTramos([[20, 29]], 28).errores[0], /dura/);
});

test("total y aviso de más de 25 s", () => {
  assert.equal(totalContexto([[0, 4], [7, 13]]), 10);
  assert.equal(avisoLargo([[0, 26]]), true);
  assert.equal(avisoLargo([[0, 25]]), false);
});

test("lista vacía o basura = error", () => {
  assert.match(validarTramos([]).errores[0], /al menos un tramo/);
  assert.match(validarTramos("x").errores[0], /al menos un tramo/);
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/tramos.test.js` → FALLA (no existe el módulo).
- [ ] **Paso 3: implementación**

```js
// Tramos del bucle que marca Oscar: hasta 3, sin tope de duración (aviso si pasa de 25 s). Spec admin §2.3.
export const MAX_TRAMOS = 3;
export const AVISO_S = 25;
export const LARGO_S = 7;
const HOLGURA_S = 0.3;
const decima = (x) => Math.round(Number(x) * 10) / 10;

export const totalContexto = (tramos) => decima(tramos.reduce((s, [a, z]) => s + (z - a), 0));
export const avisoLargo = (tramos) => totalContexto(tramos) > AVISO_S;

export function validarTramos(tramos, duracion) {
  if (!Array.isArray(tramos) || tramos.length === 0) return { tramos: [], errores: ["Marca al menos un tramo."] };
  if (tramos.length > MAX_TRAMOS) return { tramos: [], errores: [`Son máximo ${MAX_TRAMOS} tramos.`] };
  const errores = [];
  let out = tramos.map((t) => (Array.isArray(t) ? [decima(t[0]), decima(t[1])] : [NaN, NaN])).sort((x, y) => x[0] - y[0]);
  out = out.map(([a, z]) => {
    if (!Number.isFinite(a) || !Number.isFinite(z) || a < 0 || z <= a) {
      errores.push("Cada tramo necesita un inicio y un fin después del inicio.");
      return [a, z];
    }
    if (duracion && z > duracion) {
      if (z - duracion <= HOLGURA_S) return [a, decima(duracion)];
      errores.push(`El tramo ${a}–${z} s se pasa: el video dura ${decima(duracion)} s.`);
    }
    return [a, z];
  });
  for (let k = 1; k < out.length; k++) if (out[k][0] < out[k - 1][1]) errores.push("Hay tramos que se pisan.");
  return { tramos: errores.length ? [] : out, errores };
}
```

- [ ] **Paso 4:** `node --test src/app/admin/lib/tramos.test.js` → PASA.
- [ ] **Paso 5:** `git add src/app/admin/lib/tramos*.js && git commit -m "Admin: validación de tramos del bucle"`

### Task 2: Sesión y límite de intentos

**Files:**
- Create: `src/app/admin/lib/sesion.js`, `src/app/admin/lib/intentos.js`
- Test: `src/app/admin/lib/sesion.test.js`, `src/app/admin/lib/intentos.test.js`

**Interfaces:**
- Produces: `COOKIE = "admin_sesion"`, `DIAS_SESION = 30`, `firmarSesion(clave, ahoraMs) → string`, `sesionValida(valor, clave, ahoraMs) → boolean`, `claveCorrecta(intento, clave) → boolean`, `iguales(a, b) → boolean`, `leerCookie(cabeceraCookie, nombre) → string|null`, `cookieSesion(valor) → string` (cabecera Set-Cookie), `cookieBorrada() → string`, `tokenPcValido(cabeceraAuth, token) → boolean`.
- Produces: `MAX_INTENTOS = 5`, `BLOQUEO_S = 900`, `estaBloqueado(almacen, ip) → Promise<boolean>`, `registrarFallo(almacen, ip) → Promise<number>`, `limpiarIntentos(almacen, ip)`. Usa del almacén (Task 4): `contador(clave)`, `sumar(clave, ttlS)`, `borrarClave(clave)`.

- [ ] **Paso 1: pruebas que fallan**

```js
// sesion.test.js
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
```

```js
// intentos.test.js
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
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/` → FALLA.
- [ ] **Paso 3: implementación**

```js
// sesion.js — sesión de Oscar en /admin (cookie firmada) y token del PC. Spec admin §3.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "admin_sesion";
export const DIAS_SESION = 30;
const llave = (clave) => createHash("sha256").update(`admin-sesion:${clave}`).digest();
const resumen = (x) => createHash("sha256").update(String(x ?? "")).digest();

export function iguales(a, b) {
  const x = resumen(a), y = resumen(b);
  return timingSafeEqual(x, y);
}
export const claveCorrecta = (intento, clave) => Boolean(clave) && typeof intento === "string" && iguales(intento, clave);

export function firmarSesion(clave, ahoraMs) {
  const vence = String(ahoraMs + DIAS_SESION * 864e5);
  return `${vence}.${createHmac("sha256", llave(clave)).update(vence).digest("base64url")}`;
}
export function sesionValida(valor, clave, ahoraMs) {
  if (!clave || typeof valor !== "string") return false;
  const [vence, firma] = valor.split(".");
  if (!/^\d+$/.test(vence || "") || !firma || Number(vence) < ahoraMs) return false;
  return iguales(firma, createHmac("sha256", llave(clave)).update(vence).digest("base64url"));
}
export function leerCookie(cabecera, nombre) {
  for (const parte of String(cabecera || "").split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nombre) return v.join("=");
  }
  return null;
}
export const cookieSesion = (valor) =>
  `${COOKIE}=${valor}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${DIAS_SESION * 86400}`;
export const cookieBorrada = () => `${COOKIE}=; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export function tokenPcValido(cabecera, token) {
  if (!token || typeof cabecera !== "string" || !cabecera.startsWith("Bearer ")) return false;
  return iguales(cabecera.slice(7), token);
}
```

```js
// intentos.js — 5 claves malas por IP bloquean 15 min (contador en Redis con vencimiento).
export const MAX_INTENTOS = 5;
export const BLOQUEO_S = 900;
const clave = (ip) => `admin:intentos:${ip}`;
export const estaBloqueado = async (almacen, ip) => (await almacen.contador(clave(ip))) >= MAX_INTENTOS;
export const registrarFallo = (almacen, ip) => almacen.sumar(clave(ip), BLOQUEO_S);
export const limpiarIntentos = (almacen, ip) => almacen.borrarClave(clave(ip));
```
(La prueba de intentos usa `almacen-memoria.js` de la Task 4: si se ejecuta esta tarea antes, crear primero ese archivo tal como está en la Task 4.)

- [ ] **Paso 4:** `node --test src/app/admin/lib/` → PASA.
- [ ] **Paso 5:** commit "Admin: sesión firmada, token del PC y límite de intentos".

### Task 3: Modelo del pedido

**Files:**
- Create: `src/app/admin/lib/pedido.js`
- Test: `src/app/admin/lib/pedido.test.js`

**Interfaces:**
- Consumes: `validarTramos` (Task 1).
- Produces: `ESTILOS`, `HORAS_BORRADOR = 48`, `nuevoId(fecha: Date, azar: string) → "c_AAAAMMDD_xxxx"`, `nuevoPedido(id, creadoIso) → Pedido`, `prefijo(id) → "cantados/<id>/"`, `aplicarCambios(p, cambios) → { pedido, errores }`, `erroresParaEnviar(p) → string[]`, `archivos(p) → string[]`, `borradorVencido(p, ahoraMs) → boolean`, `nombreVisible(p) → string`.
- Forma de `Pedido`: la de spec §5 (`id, creado, estado, titulo, estilo, tramos, original, gancho, pantallazos, motivo`). Archivo: `{ pathname, tamano, duracion?, ancho?, alto?, nombre? }`.

- [ ] **Paso 1: prueba que falla**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { nuevoId, nuevoPedido, aplicarCambios, erroresParaEnviar, archivos, borradorVencido, prefijo } from "./pedido.js";

const P = () => nuevoPedido("c_20261021_ab12", "2026-10-21T18:30:00.000Z");
const arch = (n, extra = {}) => ({ pathname: `cantados/c_20261021_ab12/${n}`, tamano: 100, ...extra });

test("id con fecha y azar", () => assert.equal(nuevoId(new Date("2026-10-21T18:30:00Z"), "ab12"), "c_20261021_ab12"));

test("pedido nuevo en subiendo con estilo por defecto", () => {
  const p = P();
  assert.equal(p.estado, "subiendo");
  assert.equal(p.estilo, "Salsa, merengue");
  assert.deepEqual(p.pantallazos, []);
});

test("aplica cambios válidos y valida tramos contra la duración del original", () => {
  let { pedido, errores } = aplicarCambios(P(), { original: arch("original.mp4", { duracion: 28 }), titulo: "  hola  " });
  assert.deepEqual(errores, []);
  assert.equal(pedido.titulo, "hola");
  ({ pedido, errores } = aplicarCambios(pedido, { tramos: [[0, 4], [7, 13]] }));
  assert.deepEqual(pedido.tramos, [[0, 4], [7, 13]]);
  assert.match(aplicarCambios(pedido, { tramos: [[20, 40]] }).errores[0], /dura/);
});

test("rechaza archivos de otro pedido, estilos raros y cambios fuera de subiendo", () => {
  assert.match(aplicarCambios(P(), { gancho: { pathname: "cantados/otro/g.mov", tamano: 1 } }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { pantallazos: [{ pathname: "../x", tamano: 1 }] }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { estilo: "Reguetón" }).errores[0], /estilo/i);
  assert.match(aplicarCambios({ ...P(), estado: "listo" }, { titulo: "x" }).errores[0], /ya se envió/);
});

test("para enviar hace falta original, tramo, gancho y un pantallazo", () => {
  assert.equal(erroresParaEnviar(P()).length, 4);
  const p = { ...P(), original: arch("original.mp4", { duracion: 28 }), tramos: [[0, 4]], gancho: arch("gancho.mov"), pantallazos: [arch("p01.jpg")] };
  assert.deepEqual(erroresParaEnviar(p), []);
  assert.deepEqual(archivos(p), [p.original.pathname, p.gancho.pathname, p.pantallazos[0].pathname]);
  assert.equal(erroresParaEnviar({ ...p, gancho: { ...p.gancho, tamano: 0 } }).length, 1);
});

test("borrador de más de 48 h vence; uno listo nunca", () => {
  const t = Date.parse("2026-10-21T18:30:00.000Z");
  assert.equal(borradorVencido(P(), t + 49 * 3600e3), true);
  assert.equal(borradorVencido(P(), t + 47 * 3600e3), false);
  assert.equal(borradorVencido({ ...P(), estado: "listo" }, t + 99 * 3600e3), false);
  assert.equal(prefijo("x"), "cantados/x/");
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/pedido.test.js` → FALLA.
- [ ] **Paso 3: implementación**

```js
// Pedido de cantados armado en /admin. Spec admin §5.
import { validarTramos } from "./tramos.js";

export const ESTILOS = ["Salsa, merengue", "Salsa", "Merengue"];
export const HORAS_BORRADOR = 48;
const MAX_PANTALLAZOS = 40;

export const prefijo = (id) => `cantados/${id}/`;
export function nuevoId(fecha, azar) {
  const d = fecha.toISOString().slice(0, 10).replaceAll("-", "");
  return `c_${d}_${azar}`;
}
export const nuevoPedido = (id, creado) => ({
  id, creado, estado: "subiendo", titulo: null, estilo: ESTILOS[0], tramos: [],
  original: null, gancho: null, pantallazos: [], motivo: null,
});

function archivoValido(id, a) {
  if (!a || typeof a.pathname !== "string" || !a.pathname.startsWith(prefijo(id)) || a.pathname.includes("..")) return null;
  const n = (x) => (Number.isFinite(Number(x)) ? Number(x) : undefined);
  return { pathname: a.pathname, tamano: n(a.tamano) ?? 0, duracion: n(a.duracion), ancho: n(a.ancho), alto: n(a.alto),
           nombre: typeof a.nombre === "string" ? a.nombre.slice(0, 120) : undefined };
}

export function aplicarCambios(p, c) {
  if (p.estado !== "subiendo") return { pedido: p, errores: ["Este pedido ya se envió; cancélalo y súbelo de nuevo."] };
  const out = { ...p }, errores = [];
  if ("titulo" in c) out.titulo = typeof c.titulo === "string" && c.titulo.trim() ? c.titulo.trim().slice(0, 200) : null;
  if ("estilo" in c) ESTILOS.includes(c.estilo) ? (out.estilo = c.estilo) : errores.push("Estilo no válido.");
  for (const campo of ["original", "gancho"]) {
    if (campo in c) {
      const a = archivoValido(p.id, c[campo]);
      a ? (out[campo] = a) : errores.push(`El archivo de ${campo} no es de este pedido.`);
    }
  }
  if ("pantallazos" in c) {
    const lista = Array.isArray(c.pantallazos) ? c.pantallazos.slice(0, MAX_PANTALLAZOS).map((a) => archivoValido(p.id, a)) : [null];
    lista.every(Boolean) ? (out.pantallazos = lista) : errores.push("Hay un archivo de pantallazo que no es de este pedido.");
  }
  if ("tramos" in c) {
    const r = validarTramos(c.tramos, out.original?.duracion);
    r.errores.length ? errores.push(...r.errores) : (out.tramos = r.tramos);
  }
  return { pedido: errores.length ? p : out, errores };
}

export function erroresParaEnviar(p) {
  const e = [];
  if (!(p.original?.tamano > 0)) e.push("Falta el video original.");
  if (!p.tramos?.length) e.push("Falta marcar el bucle.");
  if (!(p.gancho?.tamano > 0)) e.push("Falta tu gancho.");
  if (!p.pantallazos?.length || !p.pantallazos.every((a) => a.tamano > 0)) e.push("Faltan los pantallazos.");
  return e;
}
export const archivos = (p) => [p.original, p.gancho, ...(p.pantallazos || [])].filter(Boolean).map((a) => a.pathname);
export const borradorVencido = (p, ahoraMs) =>
  p.estado === "subiendo" && ahoraMs - Date.parse(p.creado) > HORAS_BORRADOR * 3600e3;
export const nombreVisible = (p) => p.titulo || p.original?.nombre || p.id;
```

- [ ] **Paso 4:** `node --test src/app/admin/lib/pedido.test.js` → PASA.
- [ ] **Paso 5:** commit "Admin: modelo del pedido de cantados".

### Task 4: Almacén (Redis + versión en memoria para pruebas)

**Files:**
- Create: `src/app/admin/lib/almacen.js` (Redis real), `src/app/admin/lib/almacen-memoria.js`
- Test: `src/app/admin/lib/almacen-memoria.test.js`

**Interfaces:**
- Produces (las dos implementaciones, misma forma): `leer(id) → Promise<Pedido|null>`, `guardar(p) → Promise<void>`, `borrar(id) → Promise<void>`, `listar() → Promise<Pedido[]>` (más nuevos primero), `contador(clave) → Promise<number>`, `sumar(clave, ttlS) → Promise<number>`, `borrarClave(clave) → Promise<void>`.
- `almacenRedis(url) → { ...métodos, cerrar() }`; `almacenMemoria() → { ...métodos }`.
- Claves: `admin:cantados:ids` (set), `admin:cantados:<id>` (JSON).

- [ ] **Paso 1: prueba que falla**

```js
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
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/almacen-memoria.test.js` → FALLA.
- [ ] **Paso 3: implementación**

```js
// almacen-memoria.js — misma forma que almacen.js, para pruebas.
export function almacenMemoria() {
  const pedidos = new Map(), contadores = new Map();
  const copia = (x) => (x ? JSON.parse(JSON.stringify(x)) : null);
  return {
    leer: async (id) => copia(pedidos.get(id)),
    guardar: async (p) => void pedidos.set(p.id, copia(p)),
    borrar: async (id) => void pedidos.delete(id),
    listar: async () => [...pedidos.values()].map(copia).sort((x, y) => y.creado.localeCompare(x.creado)),
    contador: async (k) => contadores.get(k) || 0,
    sumar: async (k) => { const n = (contadores.get(k) || 0) + 1; contadores.set(k, n); return n; },
    borrarClave: async (k) => void contadores.delete(k),
  };
}
```

```js
// almacen.js — pedidos del admin en el Redis de la cuenta (misma conexión que /api/lead).
import { createClient } from "redis";

const IDS = "admin:cantados:ids";
const clave = (id) => `admin:cantados:${id}`;

export async function almacenRedis(url) {
  const c = createClient({ url });
  await c.connect();
  return {
    leer: async (id) => { const v = await c.get(clave(id)); return v ? JSON.parse(v) : null; },
    guardar: async (p) => { await c.set(clave(p.id), JSON.stringify(p)); await c.sAdd(IDS, p.id); },
    borrar: async (id) => { await c.del(clave(id)); await c.sRem(IDS, id); },
    listar: async () => {
      const ids = await c.sMembers(IDS);
      const vals = ids.length ? await c.mGet(ids.map(clave)) : [];
      return vals.filter(Boolean).map((v) => JSON.parse(v)).sort((x, y) => y.creado.localeCompare(x.creado));
    },
    contador: async (k) => Number((await c.get(k)) || 0),
    sumar: async (k, ttlS) => { const n = await c.incr(k); if (n === 1) await c.expire(k, ttlS); return n; },
    borrarClave: async (k) => void (await c.del(k)),
    cerrar: () => c.quit().catch(() => {}),
  };
}
```

- [ ] **Paso 4:** `node --test src/app/admin/lib/` → PASA (incluye intentos de la Task 2).
- [ ] **Paso 5:** commit "Admin: almacén de pedidos en Redis".

### Task 5: Lógica de las API (con dependencias inyectadas)

**Files:**
- Create: `src/app/admin/lib/api.js`
- Test: `src/app/admin/lib/api.test.js`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: `crearApi(deps)` con `deps = { almacen, blob: { tamano(pathname) → Promise<number|null>, borrar(pathnames[]) → Promise<void>, enlace(pathname) → Promise<string> }, avisar(texto) → Promise<void>, env: { ADMIN_CLAVE, ADMIN_PC_TOKEN }, ahora: () => number, azar: () => string }` → objeto con métodos que reciben `(req, id?)` y devuelven `Response`: `entrar, salir, crear, cambiar, enviar, cancelar, autorizarSubida(req, pathname, clientPayload) → Promise<void> (lanza si no)`, `pcPedidos, pcBajado, pcFallido, pcEntregado`, y `sesionDe(req) → boolean`.
- Respuesta de `pcPedidos`: `[{ id, creado, titulo, estilo, tramos, original: {...archivo, url}, gancho: {..., url}, pantallazos: [{..., url}] }]`.

- [ ] **Paso 1: pruebas que fallan**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearApi } from "./api.js";
import { almacenMemoria } from "./almacen-memoria.js";
import { firmarSesion } from "./sesion.js";

const T = Date.parse("2026-10-21T18:30:00Z");
function montar() {
  const almacen = almacenMemoria(), borrados = [], avisos = [], tamanos = new Map();
  const api = crearApi({
    almacen, env: { ADMIN_CLAVE: "secreta", ADMIN_PC_TOKEN: "pc-tok" }, ahora: () => T, azar: () => "ab12",
    blob: { tamano: async (p) => tamanos.get(p) ?? null, borrar: async (ps) => void borrados.push(...ps), enlace: async (p) => `https://firmado/${p}` },
    avisar: async (t) => void avisos.push(t),
  });
  return { api, almacen, borrados, avisos, tamanos };
}
const conSesion = (cuerpo, metodo = "POST") => new Request("https://x/admin/api", {
  method: metodo, headers: { cookie: `admin_sesion=${firmarSesion("secreta", T)}`, "x-forwarded-for": "1.1.1.1" },
  body: cuerpo ? JSON.stringify(cuerpo) : undefined,
});
const sinSesion = (cuerpo) => new Request("https://x/admin/api", { method: "POST", body: JSON.stringify(cuerpo || {}), headers: { "x-forwarded-for": "2.2.2.2" } });
const pc = (tok = "pc-tok") => new Request("https://x/admin/api/pc", { method: "POST", headers: { authorization: `Bearer ${tok}` } });

test("ninguna API de sesión responde sin cookie, y el token del PC no sirve ahí", async () => {
  const { api } = montar();
  for (const f of ["crear", "cambiar", "enviar", "cancelar", "salir"]) assert.equal((await api[f](sinSesion(), "c_20261021_ab12")).status, 401, f);
  assert.equal((await api.crear(pc())).status, 401);
});
test("las API del PC exigen su token", async () => {
  const { api } = montar();
  for (const f of ["pcPedidos", "pcBajado", "pcFallido", "pcEntregado"]) {
    assert.equal((await api[f](conSesion(), "x")).status, 401, f);
    assert.equal((await api[f](pc("malo"), "x")).status, 401, f);
  }
});
test("entrar: clave buena pone cookie; 5 malas bloquean", async () => {
  const { api } = montar();
  const ok = await api.entrar(sinSesion({ clave: "secreta" }));
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("set-cookie"), /admin_sesion=/);
  for (let k = 0; k < 5; k++) assert.equal((await api.entrar(sinSesion({ clave: "mala" }))).status, 401);
  assert.equal((await api.entrar(sinSesion({ clave: "secreta" }))).status, 429);
});
test("flujo completo: crear, subir, cambiar, enviar avisa, el PC lo baja y se borran los blobs", async () => {
  const { api, almacen, borrados, avisos, tamanos } = montar();
  const { id } = await (await api.crear(conSesion())).json();
  assert.equal(id, "c_20261021_ab12");
  const base = `cantados/${id}/`;
  for (const [n, t] of [["original.mp4", 500], ["gancho.mov", 300], ["p01.jpg", 10]]) tamanos.set(base + n, t);
  let r = await api.cambiar(conSesion({ original: { pathname: base + "original.mp4", tamano: 500, duracion: 28 }, tramos: [[0, 4], [7, 13]],
    gancho: { pathname: base + "gancho.mov", tamano: 300 }, pantallazos: [{ pathname: base + "p01.jpg", tamano: 10 }] }, "PATCH"), id);
  assert.equal(r.status, 200);
  assert.equal((await api.pcPedidos(pc())).status, 200);
  assert.deepEqual(await (await api.pcPedidos(pc())).json(), []);           // todavía no está listo
  r = await api.enviar(conSesion(), id);
  assert.equal(r.status, 200);
  assert.match(avisos[0], /Recibí/);
  const lista = await (await api.pcPedidos(pc())).json();
  assert.equal(lista[0].original.url, `https://firmado/${base}original.mp4`);
  assert.equal((await api.cancelar(conSesion(null, "DELETE"), id)).status, 200);   // un pedido listo sí se cancela
  assert.equal(await almacen.leer(id), null);
});
test("el tamaño declarado debe coincidir con el blob real", async () => {
  const { api, tamanos } = montar();
  const { id } = await (await api.crear(conSesion())).json();
  tamanos.set(`cantados/${id}/gancho.mov`, 299);
  const r = await api.cambiar(conSesion({ gancho: { pathname: `cantados/${id}/gancho.mov`, tamano: 300 } }, "PATCH"), id);
  assert.equal(r.status, 400);
});
test("bajado: en_pc y borra los blobs; cancelar en_pc = 409; entregado borra el registro", async () => {
  const { api, almacen, borrados } = montar();
  const id = "c_20261021_ab12", base = `cantados/${id}/`;
  await almacen.guardar({ id, creado: new Date(T).toISOString(), estado: "listo", titulo: null, estilo: "Salsa", tramos: [[0, 4]],
    original: { pathname: base + "original.mp4", tamano: 5 }, gancho: { pathname: base + "g.mov", tamano: 5 }, pantallazos: [{ pathname: base + "p01.jpg", tamano: 5 }] });
  assert.equal((await api.pcBajado(pc(), id)).status, 200);
  assert.equal((await almacen.leer(id)).estado, "en_pc");
  assert.deepEqual(borrados.sort(), [base + "g.mov", base + "original.mp4", base + "p01.jpg"]);
  assert.equal((await api.cancelar(conSesion(null, "DELETE"), id)).status, 409);
  assert.equal((await api.pcEntregado(pc(), id)).status, 200);
  assert.equal(await almacen.leer(id), null);
  assert.equal((await api.pcBajado(pc(), id)).status, 404);
});
test("pcPedidos borra borradores de más de 48 h con sus archivos", async () => {
  const { api, almacen, borrados } = montar();
  await almacen.guardar({ id: "viejo", creado: new Date(T - 50 * 3600e3).toISOString(), estado: "subiendo", pantallazos: [], original: { pathname: "cantados/viejo/original.mp4", tamano: 1 }, gancho: null });
  await api.pcPedidos(pc());
  assert.equal(await almacen.leer("viejo"), null);
  assert.deepEqual(borrados, ["cantados/viejo/original.mp4"]);
});
test("autorizarSubida: solo con sesión, en su carpeta y con el pedido en subiendo", async () => {
  const { api } = montar();
  const { id } = await (await api.crear(conSesion())).json();
  await api.autorizarSubida(conSesion(), `cantados/${id}/p01.jpg`, id);
  await assert.rejects(api.autorizarSubida(sinSesion(), `cantados/${id}/p01.jpg`, id));
  await assert.rejects(api.autorizarSubida(conSesion(), `cantados/otro/p01.jpg`, id));
  await assert.rejects(api.autorizarSubida(conSesion(), `cantados/${id}/p01.jpg`, "noexiste"));
});
test("fallido guarda el motivo", async () => {
  const { api, almacen } = montar();
  await almacen.guardar({ id: "c", creado: new Date(T).toISOString(), estado: "en_pc" });
  const r = await api.pcFallido(new Request("https://x", { method: "POST", headers: { authorization: "Bearer pc-tok" }, body: JSON.stringify({ motivo: "sin comentarios" }) }), "c");
  assert.equal(r.status, 200);
  assert.deepEqual([(await almacen.leer("c")).estado, (await almacen.leer("c")).motivo], ["fallido", "sin comentarios"]);
});
```
- [ ] **Paso 2:** `node --test src/app/admin/lib/api.test.js` → FALLA.
- [ ] **Paso 3: implementación**

```js
// Lógica de las API de /admin con dependencias inyectadas (las rutas pasan Redis, Blob y Telegram reales). Spec admin §6.
import { COOKIE, claveCorrecta, cookieBorrada, cookieSesion, firmarSesion, leerCookie, sesionValida, tokenPcValido } from "./sesion.js";
import { estaBloqueado, limpiarIntentos, registrarFallo } from "./intentos.js";
import { aplicarCambios, archivos, borradorVencido, erroresParaEnviar, nombreVisible, nuevoId, nuevoPedido, prefijo } from "./pedido.js";

const json = (d, status = 200, headers = {}) => Response.json(d, { status, headers });
const NO = () => json({ error: "No autorizado." }, 401);
const ip = (req) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sin-ip";
const cuerpo = async (req) => { try { return await req.json(); } catch { return {}; } };

export function crearApi({ almacen, blob, avisar, env, ahora, azar }) {
  const sesionDe = (req) => sesionValida(leerCookie(req.headers.get("cookie"), COOKIE), env.ADMIN_CLAVE, ahora());
  const esPc = (req) => tokenPcValido(req.headers.get("authorization"), env.ADMIN_PC_TOKEN);
  const conSesion = (f) => async (req, id) => (sesionDe(req) ? f(req, id) : NO());
  const delPc = (f) => async (req, id) => (esPc(req) ? f(req, id) : NO());

  async function verificarArchivos(c) {
    const lista = [c.original, c.gancho, ...(Array.isArray(c.pantallazos) ? c.pantallazos : [])].filter(Boolean);
    for (const a of lista) if ((await blob.tamano(a.pathname)) !== Number(a.tamano)) return `El archivo ${a.pathname.split("/").pop()} no terminó de subir.`;
    return null;
  }

  return {
    sesionDe,
    entrar: async (req) => {
      if (await estaBloqueado(almacen, ip(req))) return json({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
      const { clave } = await cuerpo(req);
      if (!claveCorrecta(clave, env.ADMIN_CLAVE)) { await registrarFallo(almacen, ip(req)); return json({ error: "Clave incorrecta." }, 401); }
      await limpiarIntentos(almacen, ip(req));
      return json({ ok: true }, 200, { "set-cookie": cookieSesion(firmarSesion(env.ADMIN_CLAVE, ahora())) });
    },
    salir: conSesion(async () => json({ ok: true }, 200, { "set-cookie": cookieBorrada() })),
    crear: conSesion(async () => {
      const p = nuevoPedido(nuevoId(new Date(ahora()), azar()), new Date(ahora()).toISOString());
      await almacen.guardar(p);
      return json({ id: p.id });
    }),
    cambiar: conSesion(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      const c = await cuerpo(req);
      const { pedido, errores } = aplicarCambios(p, c);
      if (errores.length) return json({ error: errores.join(" ") }, 400);
      const malo = await verificarArchivos(c);
      if (malo) return json({ error: malo }, 400);
      await almacen.guardar(pedido);
      return json(pedido);
    }),
    enviar: conSesion(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      if (p.estado !== "subiendo") return json({ error: "Ya estaba enviado." }, 409);
      const e = erroresParaEnviar(p);
      if (e.length) return json({ error: e.join(" ") }, 400);
      await almacen.guardar({ ...p, estado: "listo" });
      await avisar(`📥 Recibí: ${nombreVisible(p)} — sale a las 2 p. m.`).catch(() => {});
      return json({ ok: true });
    }),
    cancelar: conSesion(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ ok: true });
      if (p.estado === "en_pc") return json({ error: "El PC lo está haciendo; ya no se puede cancelar." }, 409);
      await blob.borrar(archivos(p));
      await almacen.borrar(id);
      return json({ ok: true });
    }),
    autorizarSubida: async (req, pathname, id) => {
      if (!sesionDe(req)) throw new Error("No autorizado.");
      const p = await almacen.leer(String(id || ""));
      if (!p || p.estado !== "subiendo" || !pathname.startsWith(prefijo(p.id)) || pathname.includes("..")) throw new Error("Subida no permitida.");
    },
    pcPedidos: delPc(async () => {
      const todos = await almacen.listar();
      for (const p of todos.filter((x) => borradorVencido(x, ahora()))) { await blob.borrar(archivos(p)); await almacen.borrar(p.id); }
      const firmar = async (a) => ({ ...a, url: await blob.enlace(a.pathname) });
      const listos = todos.filter((p) => p.estado === "listo");
      return json(await Promise.all(listos.map(async (p) => ({
        id: p.id, creado: p.creado, titulo: p.titulo, estilo: p.estilo, tramos: p.tramos,
        original: await firmar(p.original), gancho: await firmar(p.gancho), pantallazos: await Promise.all(p.pantallazos.map(firmar)),
      }))));
    }),
    pcBajado: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      await blob.borrar(archivos(p));
      await almacen.guardar({ ...p, estado: "en_pc", original: null, gancho: null, pantallazos: [] });
      return json({ ok: true });
    }),
    pcFallido: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      const { motivo } = await cuerpo(req);
      await almacen.guardar({ ...p, estado: "fallido", motivo: String(motivo || "sin detalle").slice(0, 300) });
      return json({ ok: true });
    }),
    pcEntregado: delPc(async (req, id) => { await almacen.borrar(id); return json({ ok: true }); }),
  };
}
```

- [ ] **Paso 4:** `node --test src/app/admin/lib/` → PASA.
- [ ] **Paso 5:** commit "Admin: lógica de las API con sesión y token del PC".

### Task 6: Dependencias reales y rutas

**Files:**
- Modify: `package.json`, `package-lock.json` (`npm install @vercel/blob`)
- Create: `src/app/admin/lib/deps.js`
- Create rutas (todas `export const runtime = "nodejs"`):
  - `src/app/admin/api/entrar/route.js` (POST), `src/app/admin/api/salir/route.js` (POST)
  - `src/app/admin/api/cantados/route.js` (POST crear)
  - `src/app/admin/api/cantados/[id]/route.js` (PATCH cambiar, DELETE cancelar)
  - `src/app/admin/api/cantados/[id]/enviar/route.js` (POST)
  - `src/app/admin/api/cantados/subir/route.js` (POST, `handleUpload`)
  - `src/app/admin/api/pc/pedidos/route.js` (GET), `src/app/admin/api/pc/pedidos/[id]/route.js` (DELETE entregado)
  - `src/app/admin/api/pc/pedidos/[id]/bajado/route.js` (POST), `.../[id]/fallido/route.js` (POST)

**Interfaces:**
- Consumes: `crearApi` (Task 5), `almacenRedis` (Task 4), `urlRedisDirecta` de `src/app/api/lead/config.js`.
- Produces: `conApi(fn) → (req, ctx) => Promise<Response>` en `deps.js`: arma `crearApi` con Redis/Blob/Telegram reales, llama `fn(api, req, id)` (con `id = (await ctx?.params)?.id`) y cierra Redis.

- [ ] **Paso 1:** `npm install @vercel/blob` y comprobar en `node_modules/@vercel/blob` (README o tipos) los nombres exactos `head`, `del`, `issueSignedToken`, `presignUrl` y `handleUpload`/`upload`, y si `head`/`del` aceptan `pathname` en un almacén privado. Si `head` exige URL completa, construirla desde el resultado de `upload()` y guardar `url` en el archivo del pedido (ajustar `archivoValido` en Task 3 para conservarla). Anotar lo verificado en `docs/admin.md`.
- [ ] **Paso 2: `deps.js`**

```js
// Dependencias reales de las API de /admin: Redis de la cuenta, Vercel Blob privado y el bot central de Telegram.
import { randomBytes } from "node:crypto";
import { del, head, issueSignedToken, presignUrl } from "@vercel/blob";
import { urlRedisDirecta } from "../../api/lead/config.js";
import { almacenRedis } from "./almacen.js";
import { crearApi } from "./api.js";

const blob = {
  tamano: async (pathname) => { try { return (await head(pathname)).size; } catch { return null; } },
  borrar: async (pathnames) => { if (pathnames.length) await del(pathnames); },
  enlace: async (pathname) => {
    const token = await issueSignedToken({ pathname, operations: ["get"], validUntil: Date.now() + 3600e3 });
    return (await presignUrl(token, { operation: "get", pathname, access: "private" })).presignedUrl;
  },
};
async function avisar(texto) {
  const { TELEGRAM_BOT_TOKEN: t, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!t || !chat) return;
  await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text: texto.slice(0, 4000) }),
  });
}
export function conApi(fn) {
  return async (req, ctx) => {
    const almacen = await almacenRedis(urlRedisDirecta(process.env));
    try {
      const api = crearApi({ almacen, blob, avisar, env: process.env, ahora: Date.now, azar: () => randomBytes(2).toString("hex") });
      return await fn(api, req, (await ctx?.params)?.id);
    } finally {
      almacen.cerrar();
    }
  };
}
```

- [ ] **Paso 3: rutas** (ejemplos; las demás siguen el mismo patrón de una línea)

```js
// src/app/admin/api/cantados/[id]/route.js
import { conApi } from "../../../lib/deps.js";
export const runtime = "nodejs";
export const PATCH = conApi((api, req, id) => api.cambiar(req, id));
export const DELETE = conApi((api, req, id) => api.cancelar(req, id));
```
```js
// src/app/admin/api/entrar/route.js
import { conApi } from "../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req) => api.entrar(req));
```
```js
// src/app/admin/api/pc/pedidos/route.js
import { conApi } from "../../../lib/deps.js";
export const runtime = "nodejs";
export const GET = conApi((api, req) => api.pcPedidos(req));
```
```js
// src/app/admin/api/cantados/subir/route.js — subida directa del navegador a Blob privado (spec §5).
import { handleUpload } from "@vercel/blob/client";
import { conApi } from "../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi(async (api, req) => {
  const body = await req.json();
  try {
    const r = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await api.autorizarSubida(req, pathname, clientPayload);
        return { allowedContentTypes: ["video/*", "image/*"], addRandomSuffix: false, allowOverwrite: true };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(r);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
});
```
Mapa completo: `entrar`→`api.entrar`; `salir`→`api.salir`; `cantados` POST→`api.crear`; `cantados/[id]` PATCH/DELETE; `cantados/[id]/enviar` POST→`api.enviar`; `pc/pedidos` GET→`api.pcPedidos`; `pc/pedidos/[id]` DELETE→`api.pcEntregado`; `pc/pedidos/[id]/bajado` POST→`api.pcBajado`; `pc/pedidos/[id]/fallido` POST→`api.pcFallido`.

- [ ] **Paso 4:** `npm test && npx eslint --ignore-pattern ".claude/**" && npm run build` → sin errores. En la salida del build deben aparecer las rutas `/admin/api/...` como dinámicas (ƒ).
- [ ] **Paso 5:** commit "Admin: rutas de la API con Redis, Blob y Telegram".

### Task 7: Pantallas (layout privado, entrada, lista, nuevo pedido)

**Files:**
- Create: `src/app/admin/layout.jsx`, `src/app/admin/page.jsx`, `src/app/admin/Entrar.jsx` (cliente), `src/app/admin/ListaPedidos.jsx` (cliente), `src/app/admin/cantados/nuevo/page.jsx`, `src/app/admin/cantados/nuevo/NuevoPedido.jsx` (cliente), `src/app/admin/cantados/nuevo/EditorTramos.jsx` (cliente), `src/app/admin/lib/editor.js`
- Test: `src/app/admin/lib/editor.test.js`

**Interfaces:**
- Consumes: `sesionValida`, `COOKIE` (Task 2); `almacenRedis` (Task 4); `validarTramos`, `totalContexto`, `avisoLargo`, `MAX_TRAMOS` (Task 1); `ESTILOS`, `nombreVisible` (Task 3).
- Produces (`editor.js`, puro): `ajustar(tramos, indice, extremo: "inicio"|"fin", delta, duracion) → number[][]`, `marcar(tramos, pendiente: number|null, t) → { tramos, pendiente }` (primer toque guarda inicio, segundo crea el tramo [min, max]), `mover(lista, indice, -1|1) → lista`, `extension(nombreArchivo) → ".mp4"`.

- [ ] **Paso 1: prueba que falla (`editor.test.js`)**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { ajustar, marcar, mover, extension } from "./editor.js";

test("marcar inicio y fin crea el tramo, aunque se marquen al revés", () => {
  let s = marcar([], null, 7);
  assert.deepEqual(s, { tramos: [], pendiente: 7 });
  s = marcar(s.tramos, s.pendiente, 4);
  assert.deepEqual(s, { tramos: [[4, 7]], pendiente: null });
});
test("ajustar respeta 0, la duración y no deja fin <= inicio", () => {
  assert.deepEqual(ajustar([[0, 4]], 0, "inicio", -1, 28), [[0, 4]]);
  assert.deepEqual(ajustar([[0, 4]], 0, "fin", 0.1, 28), [[0, 4.1]]);
  assert.deepEqual(ajustar([[20, 28]], 0, "fin", 1, 28), [[20, 28]]);
  assert.deepEqual(ajustar([[3, 3.1]], 0, "fin", -0.1, 28), [[3, 3.1]]);
});
test("mover reordena sin salirse", () => {
  assert.deepEqual(mover(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
  assert.deepEqual(mover(["a", "b"], 0, -1), ["a", "b"]);
});
test("extensión en minúscula, con defecto", () => {
  assert.equal(extension("IMG_0652.MOV"), ".mov");
  assert.equal(extension("sin"), ".bin");
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/editor.test.js` → FALLA.
- [ ] **Paso 3: `editor.js`**

```js
// Editor de tramos y orden de pantallazos (lógica pura de la pantalla de nuevo pedido).
const d = (x) => Math.round(x * 10) / 10;
export function marcar(tramos, pendiente, t) {
  if (pendiente === null) return { tramos, pendiente: d(t) };
  const [a, z] = [Math.min(pendiente, t), Math.max(pendiente, t)];
  return { tramos: z > a ? [...tramos, [d(a), d(z)]].sort((x, y) => x[0] - y[0]) : tramos, pendiente: null };
}
export function ajustar(tramos, i, extremo, delta, duracion) {
  return tramos.map((t, k) => {
    if (k !== i) return t;
    let [a, z] = t;
    if (extremo === "inicio") a = Math.min(Math.max(0, d(a + delta)), d(z - 0.1));
    else z = Math.max(Math.min(duracion ?? Infinity, d(z + delta)), d(a + 0.1));
    return [d(a), d(z)];
  });
}
export function mover(lista, i, paso) {
  const j = i + paso;
  if (j < 0 || j >= lista.length) return lista;
  const out = [...lista];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
export const extension = (nombre) => (/\.[a-z0-9]+$/i.exec(nombre || "")?.[0] || ".bin").toLowerCase();
```

- [ ] **Paso 4:** `node --test src/app/admin/lib/editor.test.js` → PASA.
- [ ] **Paso 5: layout privado** (`layout.jsx`, servidor): `export const metadata = { title: "Admin", robots: { index: false, follow: false } }`; lee `(await cookies()).get(COOKIE)?.value` (de `next/headers`), y si `!sesionValida(valor, process.env.ADMIN_CLAVE, Date.now())` devuelve `<main className="mx-auto max-w-md p-4"><Entrar /></main>` en lugar de `children`. `Entrar.jsx`: campo de clave + botón "Entrar" → `POST /admin/api/entrar` → si 200, `location.reload()`; muestra el error que devuelva la API.
- [ ] **Paso 6: lista** (`page.jsx`, servidor, `export const dynamic = "force-dynamic"`): abre `almacenRedis`, `listar()`, cierra; pasa a `ListaPedidos` (cliente) los pedidos `{ id, nombre: nombreVisible(p), creado, estado, motivo }`. Botón grande rojo "Nuevo video" → `/admin/cantados/nuevo`. Etiquetas de estado: `subiendo` "Sin enviar", `listo` "Listo para las 2 p. m.", `en_pc` "El PC lo está haciendo", `fallido` "Falló: <motivo>". "Cancelar" (si no es `en_pc`) → `DELETE /admin/api/cantados/<id>` → recarga. "Salir" → `POST /admin/api/salir`.
- [ ] **Paso 7: nuevo pedido** (`NuevoPedido.jsx`, cliente; `page.jsx` solo lo monta):
  - Al montar: `POST /admin/api/cantados` → `id`.
  - `subir(file, nombre)`: `upload(\`cantados/${id}/${nombre}\`, file, { access: "private", handleUploadUrl: "/admin/api/cantados/subir", clientPayload: id, multipart: file.size > 20e6, onUploadProgress: ({ percentage }) => … })` (de `@vercel/blob/client`); al terminar devuelve `{ pathname, tamano: file.size, nombre: file.name }`. Si falla: barra roja + botón "Reintentar".
  - Original: `<input type="file" accept="video/*">` → `URL.createObjectURL` en el `<video>`; con `loadedmetadata` toma `duration`, `videoWidth`, `videoHeight`; sube como `original${extension(file.name)}` y luego `PATCH { original: {..., duracion, ancho, alto} }`.
  - `EditorTramos`: recibe `duracion`, `tramos`, `onCambio`. Botones "Marca inicio"/"Marca fin" (`marcar` con `video.currentTime`), −1/−0,1/+0,1/+1 sobre el extremo elegido (`ajustar`), ▶ por tramo (pone `currentTime = a`, `play()`, y en `timeupdate` pausa al pasar `z`), 🗑. Barra con los tramos coloreados (`left = a/duracion`, `width = (z−a)/duracion`). Muestra `Contexto: ${totalContexto(tramos)} s` y, si `avisoLargo`, aviso amarillo "Más de 25 s: más riesgo de reclamo por contenido reutilizado". No agrega más de `MAX_TRAMOS`; muestra el error de `validarTramos`. Cada cambio válido → `PATCH { tramos }`.
  - Gancho: input video; lee `videoWidth/videoHeight` con un `<video>` oculto; si `Math.min(w, h) < 1080` aviso "Tu gancho no está en 1080p"; sube como `gancho${ext}` → `PATCH { gancho }`. Campo "Título (opcional)" → `PATCH { titulo }` al salir del campo.
  - Pantallazos: `<input type="file" accept="image/*" multiple>`; sube uno por uno como `p01.jpg`, `p02.jpg`… (numeración continua aunque se agreguen después); miniaturas con ↑↓ (`mover`) y ✕; cada cambio de lista → `PATCH { pantallazos }`.
  - Estilo: tres botones con `ESTILOS` → `PATCH { estilo }`.
  - "Enviar pedido": deshabilitado mientras haya subidas en curso o falte algo (original, tramo, gancho, ≥ 1 pantallazo). `POST /admin/api/cantados/<id>/enviar` → si 200, mensaje "Listo: sale a las 2 p. m." y vuelve a `/admin`.
  - Estilo visual mínimo: fondo papel, botones grandes rojos #E10600, una columna de ancho máximo 480 px.
- [ ] **Paso 8:** `npm test && npx eslint --ignore-pattern ".claude/**" && npm run build` sin errores.
- [ ] **Paso 9:** commit "Admin: pantallas de entrada, lista y nuevo pedido".

### Task 8: Documentación y PR 1

**Files:**
- Create: `docs/admin.md`

- [ ] **Paso 1:** escribir `docs/admin.md`: qué es; cómo se usa desde el celular; variables (`ADMIN_CLAVE`, `ADMIN_PC_TOKEN`, Blob, Redis, Telegram) y dónde se pegan; cómo crear el almacén Blob privado; cómo cambiar la clave (cambiar `ADMIN_CLAVE` en Vercel y redeploy: todas las sesiones caen); qué hace el PC; lo verificado de `@vercel/blob` en la Task 6; que nada queda en la nube.
- [ ] **Paso 2:** `npm test && npx eslint --ignore-pattern ".claude/**" && npm run build`.
- [ ] **Paso 3:** commit "Docs: admin de cantados", `git push -u origin feat/admin-cantados`, `gh pr create` (título "Admin privado para pedidos de cantados", cuerpo en español con resumen, archivos compartidos tocados —`package.json`, `package-lock.json` por `@vercel/blob`— y las variables que debe pegar Oscar).
- [ ] **Paso 4:** `git diff --name-only main...HEAD` → como incluye `package*.json`, **no fusionar**: pasar el enlace a Oscar y esperar su aprobación. Mientras tanto, con la vista previa del PR (login de Vercel) y las variables puestas en Preview: probar `/admin` sin sesión (pide clave), entrar, crear un pedido con un video corto, marcar 2 tramos, gancho y 2 pantallazos, enviar, y revisar en vista de teléfono (375 px).

### Task 9: robots.js (PR 2)

**Files:**
- Modify: `src/app/robots.js`

- [ ] **Paso 1:** rama `chore/robots-admin` desde `main`; cambiar `rules` a `{ userAgent: "*", allow: "/", disallow: "/admin" }`.
- [ ] **Paso 2:** `npm run build`; comprobar en `.next` o con `npm start` + `curl localhost:3000/robots.txt` que sale `Disallow: /admin`.
- [ ] **Paso 3:** commit, push, PR; pasar el enlace a Oscar (archivo compartido: lo aprueba él).

---

## Parte B · PC (`D:\METACHO CLAUDE\PREMIERE-CLAUDE\cantados`, sin git; pruebas con `python -m pytest -q`)

### Task 10: Tramos sin tope para pedidos web

**Files:**
- Modify: `herramientas/proyecto.py` (`_errores_bucle`), `herramientas/pantallazos.py` (`armar_proyecto`, junto a `bucle_largo`)
- Test: `tests/test_tramos.py`

**Interfaces:**
- Produces: un proyecto con `"bucle_sin_tope": true` no tiene tope de duración total (sí valida orden, solape e inicio < fin). `armar_proyecto` copia `datos["bucle_sin_tope"]` al proyecto.

- [ ] **Paso 1: prueba que falla**

```python
def test_bucle_sin_tope_acepta_mas_de_25_s():
    p = {"bucle": {"tramos": [[0.0, 20.0], [21.0, 40.0]]}, "bucle_largo": True}
    assert any("no puede durar" in e for e in proyecto._errores_bucle(p))
    p["bucle_sin_tope"] = True
    assert proyecto._errores_bucle(p) == []
    p["bucle"]["tramos"] = [[0.0, 20.0], [10.0, 40.0]]
    assert proyecto._errores_bucle(p) == ["bucle: los tramos se solapan"]
```
(importar `proyecto` desde `herramientas` si el archivo no lo hace ya).

- [ ] **Paso 2:** `python -m pytest -q tests/test_tramos.py` → FALLA.
- [ ] **Paso 3:** en `_errores_bucle`, cambiar la condición del tope a `if not errs and not p.get("bucle_sin_tope") and sum(...) > maximo + 1e-9:`. En `armar_proyecto`, después de `if datos.get("bucle_largo"): p["bucle_largo"] = True` agregar `if datos.get("bucle_sin_tope"): p["bucle_sin_tope"] = True`.
- [ ] **Paso 4:** `python -m pytest -q` → todas PASAN (240 + 1).

### Task 11: Cliente de la web y su integración en la pasada

**Files:**
- Create: `herramientas/web.py`
- Modify: `herramientas/pasada.py` (`leer`, `main` fase `revisado`, `entregar`, `nuevos_pedidos`/`_nuevo_por_pantallazos` para repetidos)
- Test: `tests/test_web.py`

**Interfaces:**
- `web.py`: `BASE = "https://www.elmetacho.com"`; `class ErrorWeb(Exception)`; `pedidos(llamar=None) → list[dict]`; `bajar(pedido, destino: Path, descargar=None) → {"original": Path, "gancho": Path, "pantallazos": [Path]}` (lanza `ErrorWeb` si un tamaño no coincide; borra lo bajado a medias); `bajado(id)`, `fallido(id, motivo)`, `entregado(id)`; `normalizar_titulo(t) → str`.
- `pasada.py`: `leer_web(P, informe)` (antes de `_leer_bot` en `leer`), `ganchos_web(P, informe)` (después de `nuevos_pedidos`), `avisar_fallidos_web(P, informe)` (al final de `leer`), `revisado(carpeta, informe)` (reemplaza `marcar(carpeta, revisado=True)` en `main`), `_repetido_de_web(P, url, titulo, dur) → str|None`.
- Pedido web en `pedidos.json`: clave `web:<id>`; campos `modo="pantallazos"`, `origen="web"`, `web_id`, `original` (ruta), `fotos=[{"archivo": ruta}]`, `gancho_web` (ruta), `tramos`, `bucle_largo` (total > 7), `bucle_sin_tope=True`, `titulo`, `estilo`, `duracion` (del original).

- [ ] **Paso 1: pruebas que fallan (`tests/test_web.py`)**

```python
"""Pedidos desde elmetacho.com/admin (spec web 2026-10-21-admin-design §7)."""
import json
from pathlib import Path

import pytest

from herramientas import pasada, proyecto, web
from tests.test_pasada import entorno  # noqa: F401  (fixture)


def _pedido(n_fotos=2, tam=5):
    base = "cantados/c_1/"
    arch = lambda nombre: {"pathname": base + nombre, "tamano": tam, "url": f"https://firmado/{nombre}"}
    return {"id": "c_1", "creado": "2026-10-21T18:30:00Z", "titulo": "lo grabaron paseando al perro", "estilo": "Salsa",
            "tramos": [[0, 4], [7, 33]], "original": {**arch("original.mp4"), "duracion": 40}, "gancho": arch("gancho.mov"),
            "pantallazos": [arch(f"p0{k}.jpg") for k in range(1, n_fotos + 1)]}


def test_bajar_verifica_tamanos_y_respeta_el_orden(tmp_path):
    escritos = []
    def descargar(url, destino):
        destino.write_bytes(b"x" * 5); escritos.append(destino.name)
    r = web.bajar(_pedido(), tmp_path, descargar=descargar)
    assert [p.name for p in r["pantallazos"]] == ["p01.jpg", "p02.jpg"]
    assert r["original"].name == "original.mp4" and r["gancho"].name == "gancho.mov"


def test_bajar_incompleto_falla_y_limpia(tmp_path):
    def descargar(url, destino):
        destino.write_bytes(b"x" * (3 if "gancho" in url else 5))
    with pytest.raises(web.ErrorWeb):
        web.bajar(_pedido(), tmp_path, descargar=descargar)
    assert not any(tmp_path.rglob("*.*"))


def test_normalizar_titulo():
    assert web.normalizar_titulo("Lo grabaron paseando al PERRO y los comentarios se salieron de control") == "lo grabaron paseando al perro"
    assert web.normalizar_titulo("Pingüino, ¡qué susto!") == "pinguino que susto"
    assert web.normalizar_titulo(None) == ""


@pytest.fixture
def web_falsa(monkeypatch, tmp_path):
    estado = {"pedidos": [_pedido()], "bajados": [], "entregados": [], "fallidos": []}
    monkeypatch.setattr(web, "pedidos", lambda: estado["pedidos"])
    def bajar(p, destino, descargar=None):
        destino.mkdir(parents=True, exist_ok=True)
        rutas = {"original": destino / "original.mp4", "gancho": destino / "gancho.mov",
                 "pantallazos": [destino / f"p0{k}.jpg" for k in (1, 2)]}
        for r in [rutas["original"], rutas["gancho"], *rutas["pantallazos"]]:
            r.write_bytes(b"x")
        return rutas
    monkeypatch.setattr(web, "bajar", bajar)
    monkeypatch.setattr(web, "bajado", lambda i: estado["bajados"].append(i))
    monkeypatch.setattr(web, "entregado", lambda i: estado["entregados"].append(i))
    monkeypatch.setattr(web, "fallido", lambda i, m: estado["fallidos"].append((i, m)))
    monkeypatch.setattr(pasada, "_duracion", lambda f: 40.0)
    return estado


def test_leer_web_registra_una_sola_vez_y_marca_bajado(entorno, web_falsa):
    inf = []
    pasada.leer_web(pasada._P(), inf)
    pasada.leer_web(pasada._P(), inf)          # la web todavía lo lista (pasada cortada): no se duplica
    d = pasada._P().get("web:c_1")
    assert d["estado"] == "recibido" and d["modo"] == "pantallazos" and d["origen"] == "web"
    assert d["tramos"] == [[0, 4], [7, 33]] and d["bucle_largo"] and d["bucle_sin_tope"]
    assert [Path(f["archivo"]).name for f in d["fotos"]] == ["p01.jpg", "p02.jpg"]
    assert web_falsa["bajados"] == ["c_1", "c_1"] and len([u for u in pasada._P().d if u.startswith("web:")]) == 1


def test_web_caida_no_tumba_la_pasada(entorno, monkeypatch):
    def caida():
        raise web.ErrorWeb("sin conexión")
    monkeypatch.setattr(web, "pedidos", caida)
    inf = []
    pasada.leer_web(pasada._P(), inf)
    assert any("web" in x.lower() for x in inf) and entorno["enviados"]


def test_revisado_de_un_pedido_web_lo_aprueba_sin_letra(entorno):
    d = entorno["nuevo"]("2026-10-21-perro", "web:c_1", "por_revisar", origen="web", web_id="c_1")
    inf = []
    pasada.revisado(d.name, inf)
    assert pasada._P().get("web:c_1")["estado"] == "aprobado"
    assert proyecto.cargar(d)["estado"] == "listo_suno"
    entorno["nuevo"]("2026-10-21-otro", "https://vt.tiktok.com/X/", "por_revisar")
    pasada.revisado("2026-10-21-otro", inf)
    assert pasada._P().get("https://vt.tiktok.com/X/")["revisado"] is True
    assert pasada._P().get("https://vt.tiktok.com/X/")["estado"] == "por_revisar"


def test_entregar_avisa_a_la_web(entorno, web_falsa, monkeypatch, tmp_path):
    entorno["nuevo"]("2026-10-21-perro", "web:c_1", "renderizado", hoja_ok=True, listo=str(tmp_path / "a.mp4"),
                     origen="web", web_id="c_1")
    monkeypatch.setattr(pasada.bot, "enviar_video", lambda *a, **k: None)
    pasada.entregar([])
    assert web_falsa["entregados"] == ["c_1"] and pasada._P().get("web:c_1")["estado"] == "enviado"


def test_fallido_web_se_avisa_una_vez(entorno, web_falsa):
    P = pasada._P()
    P.nuevo("web:c_9", {"tramos": [[0, 4]]}, msg=None)
    P.poner("web:c_9", estado="fallido", motivo="sin comentarios", origen="web", web_id="c_9")
    pasada.avisar_fallidos_web(pasada._P(), [])
    pasada.avisar_fallidos_web(pasada._P(), [])
    assert web_falsa["fallidos"] == [("c_9", "sin comentarios")]


def test_telegram_repetido_de_la_web(entorno):
    P = pasada._P()
    P.nuevo("web:c_1", {"tramos": [[0, 4]], "titulo": "lo grabaron paseando al perro"}, msg=None)
    P.poner("web:c_1", origen="web", duracion=28.0, estado="aprobado")
    assert pasada._repetido_de_web(pasada._P(), "adjunto:5", "Lo grabaron paseando al perro y los comentarios se salieron de control", 28.3) == "web:c_1"
    assert pasada._repetido_de_web(pasada._P(), "adjunto:5", "lo grabaron paseando al perro", 29.0) is None
    assert pasada._repetido_de_web(pasada._P(), "adjunto:5", None, 28.0) is None
```

- [ ] **Paso 2:** `python -m pytest -q tests/test_web.py` → FALLA.
- [ ] **Paso 3: `herramientas/web.py`**

```python
"""Pedidos de cantados desde elmetacho.com/admin (spec web docs/superpowers/specs/2026-10-21-admin-design.md §7).
La web guarda el pedido; el PC lo baja con enlaces firmados, avisa «bajado» (la web borra los archivos) y al entregar
avisa «entregado» (la web borra el registro). La clave ADMIN_PC_TOKEN vive en PREMIERE-CLAUDE/.env (la lee telegram_envio)."""
import json
import re
import shutil
import unicodedata
import urllib.request
from pathlib import Path

from . import bot

BASE = "https://www.elmetacho.com"
_COLETILLA = re.compile(r"\s*y\s+los\s+comentarios\s+se\s+salieron\s+de\s+control.*$", re.IGNORECASE)


class ErrorWeb(Exception):
    pass


def _token():
    t = bot._T().env().get("ADMIN_PC_TOKEN")
    if not t:
        raise ErrorWeb("falta ADMIN_PC_TOKEN en el .env de PREMIERE-CLAUDE")
    return t


def _llamar(metodo, ruta, cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo,
                                 headers={"Authorization": f"Bearer {_token()}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read() or b"null")
    except Exception as e:  # la web caída no debe tumbar la pasada
        raise ErrorWeb(f"{metodo} {ruta}: {e}") from e


def pedidos():
    return _llamar("GET", "/admin/api/pc/pedidos") or []


def _descargar(url, destino):
    with urllib.request.urlopen(url, timeout=600) as r, open(destino, "wb") as fh:
        shutil.copyfileobj(r, fh)


def bajar(pedido, destino, descargar=None):
    descargar = descargar or _descargar
    destino = Path(destino)
    destino.mkdir(parents=True, exist_ok=True)
    rutas = {"pantallazos": []}
    try:
        for clave, arch in [("original", pedido["original"]), ("gancho", pedido["gancho"])] + \
                           [("pantallazos", a) for a in pedido["pantallazos"]]:
            f = destino / Path(arch["pathname"]).name
            descargar(arch["url"], f)
            if f.stat().st_size != int(arch["tamano"]):
                raise ErrorWeb(f"{f.name} bajó incompleto ({f.stat().st_size} de {arch['tamano']} bytes)")
            rutas["pantallazos"].append(f) if clave == "pantallazos" else rutas.__setitem__(clave, f)
    except BaseException:
        shutil.rmtree(destino, ignore_errors=True)
        raise
    return rutas


def bajado(id_):
    _llamar("POST", f"/admin/api/pc/pedidos/{id_}/bajado", {})


def fallido(id_, motivo):
    _llamar("POST", f"/admin/api/pc/pedidos/{id_}/fallido", {"motivo": motivo})


def entregado(id_):
    _llamar("DELETE", f"/admin/api/pc/pedidos/{id_}")


def normalizar_titulo(t):
    t = _COLETILLA.sub("", t or "")
    t = "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", t).split())
```

- [ ] **Paso 4: integración en `pasada.py`** (importar `web` junto a los demás módulos: `from . import bot, config, pedidos, proyecto, respuestas, revisor, web`)

```python
LARGO_S = 7.0   # más de esto, el contexto lleva zooms cada 3 s (bucle_largo)


def leer_web(P, informe):
    """Pedidos de elmetacho.com/admin: se bajan, se verifica el tamaño, la web borra los archivos y quedan como
    pedidos con pantallazos (modo «pantallazos», en el orden de Oscar). Un id ya registrado no se duplica."""
    try:
        lista = web.pedidos()
    except web.ErrorWeb as e:
        informe.append(f"La web no respondió: {e}")
        bot.enviar_texto(f"⚠️ No pude leer los pedidos de elmetacho.com/admin ({e}). Sigo con los de Telegram.")
        return
    for ped in lista:
        url = f"web:{ped['id']}"
        try:
            if not P.get(url):
                rutas = web.bajar(ped, LOGS / "web" / ped["id"])
                tramos = [list(map(float, t)) for t in ped["tramos"]]
                total = sum(z - a for a, z in tramos)
                P.nuevo(url, {"tramos": tramos, "titulo": ped.get("titulo"), "estilo": ped.get("estilo")}, msg=None)
                P.poner(url, modo="pantallazos", origen="web", web_id=ped["id"], original=str(rutas["original"]),
                        gancho_web=str(rutas["gancho"]), fotos=[{"archivo": str(f)} for f in rutas["pantallazos"]],
                        bucle_largo=total > LARGO_S, bucle_sin_tope=True, duracion=_duracion(rutas["original"]))
                informe.append(f"Pedido de la web: {ped.get('titulo') or ped['id']}")
            web.bajado(ped["id"])
        except Exception as e:
            informe.append(f"No pude bajar el pedido web {ped.get('id')}: {e} (se reintenta mañana)")


def ganchos_web(P, informe):
    from . import gancho
    for url, d in list(P.d.items()):
        if d.get("origen") == "web" and d.get("carpeta") and not d.get("gancho") and d.get("estado") not in ("fallido", "enviado"):
            try:
                gancho.procesar(_carpeta(P, url), Path(d["gancho_web"]))
                P.poner(url, gancho=True, gancho_comprimido=False, gancho_archivo=d["gancho_web"])
                informe.append(f"Gancho asignado: {d['carpeta']}")
            except Exception as e:
                informe.append(f"Error con el gancho de {d['carpeta']}: {e}")


def avisar_fallidos_web(P, informe):
    for url, d in P.d.items():
        if d.get("origen") == "web" and d.get("estado") == "fallido" and not d.get("web_avisado"):
            try:
                web.fallido(d["web_id"], d.get("motivo") or "sin detalle")
                P.poner(url, web_avisado=True)
            except web.ErrorWeb as e:
                informe.append(f"No pude marcar en la web el fallo de {url}: {e}")


def _repetido_de_web(P, url, titulo, dur):
    """Un pedido de Telegram igual a uno de la web (título normalizado y duración ±0,5 s) no se hace."""
    t = web.normalizar_titulo(titulo)
    if not t or dur is None:
        return None
    for u, v in P.d.items():
        if (u != url and v.get("origen") == "web" and v.get("duracion") is not None
                and web.normalizar_titulo(v.get("titulo")) == t and abs(v["duracion"] - dur) <= 0.5):
            return u
    return None


def revisado(carpeta, informe):
    """Claude terminó de revisar. Los pedidos web no llevan aprobación de letra (Oscar 2026-10-21): pasan a Suno."""
    P = _P()
    url = _url_de_carpeta(P, carpeta)
    if P.get(url).get("origen") != "web":
        P.poner(url, revisado=True)
        return
    c = _carpeta(P, url)
    p = proyecto.cargar(c)
    p["estado"] = "listo_suno"
    proyecto.guardar(c, p)
    lineas = [x["linea_letra"] for x in _lineas(p)[0]]
    revisor.registrar(c.name, lineas, lineas, "(pedido web: sin aprobación)", automatico=False)
    P.poner(url, revisado=True, estado="aprobado", aprobado_en=_ahora(), automatico=False, hoja_ok=False)
    informe.append(f"Aprobado (pedido web): {c.name}")
```
  - `leer`: `leer_web(P, informe)` antes de `_leer_bot(P, informe)`; en la tupla de fases agregar `lambda: ganchos_web(P, informe)` después de `asignar_ganchos` y `lambda: avisar_fallidos_web(P, informe)` al final.
  - `main`: `elif fase == "revisado": revisado(sys.argv[2], informe)`.
  - `entregar`: después de `P.poner(url, estado="enviado", enviado_en=_ahora())` agregar:
    ```python
            if d.get("origen") == "web":
                try:
                    web.entregado(d["web_id"])
                except web.ErrorWeb as e:
                    informe.append(f"No pude borrar el pedido {url} de la web: {e}")
    ```
  - Repetidos, en `_nuevo_por_pantallazos` justo después de `dur = _duracion(carpeta / "original.mp4")`, y en la rama de sondeo de `nuevos_pedidos` después de su `dur = _duracion(...)`, solo para pedidos que no son de la web:
    ```python
    if d.get("origen") != "web":
        rep = _repetido_de_web(P, url, d.get("titulo"), dur)
        if rep:
            P.poner(url, estado="fallido", motivo=f"repetido de {rep}", avisado=True)
            informe.append(f"{url} es el mismo video que {rep} (web): no se hace")
            return   # en nuevos_pedidos: continue
    ```
  - `asignar_ganchos` no debe tomar pedidos web como candidatos para ganchos sueltos de Telegram: en `candidatos` agregar `and v.get("origen") != "web"`.

- [ ] **Paso 5:** `python -m pytest -q` → todas PASAN.
- [ ] **Paso 6:** prueba en seco con la web real cuando esté publicada (Task 13).

### Task 12: Runbook y bitácoras

**Files:**
- Modify: `docs/runbook-pasada.md`, `BITACORA-CANTADOS.md` (§0 y §0.3)

- [ ] **Paso 1:** runbook §1: "Primero `leer` baja los pedidos de elmetacho.com/admin (`web:<id>`, modo pantallazos, sin aprobación de letra): en §2 se revisan como pantallazos y se cierra con `python -m herramientas.pasada revisado <carpeta>`, que los aprueba directo (NO van a `enviar-letras`)." §5: "Al entregar un pedido web se borra en la web."
- [ ] **Paso 2:** bitácora §0: entrada "Pedidos por la web (2026-10-21)" con el resumen y la ruta de la spec; §0.3: pendientes que queden (prueba de punta a punta, fases siguientes de la spec §10). Anotar que el cambio se hizo desde esta sesión, no desde "Construir pedidos de cantados por Telegram".

### Task 13: Publicación y prueba de punta a punta

- [ ] **Paso 1:** con PR 1 y PR 2 aprobados por Oscar, `gh pr merge --squash --delete-branch` de cada uno; esperar el despliegue de Vercel (`gh pr checks` / estado del deployment).
- [ ] **Paso 2:** en vivo: `https://www.elmetacho.com/admin` sin sesión pide clave; con sesión muestra la lista; `https://www.elmetacho.com`, `https://mlabs.elmetacho.com` y `https://www.elmetacho.com/robots.txt` (con `Disallow: /admin`) responden bien.
- [ ] **Paso 3:** Oscar pega `ADMIN_PC_TOKEN` en `PREMIERE-CLAUDE/.env`. Oscar sube un pedido real desde el celular.
- [ ] **Paso 4:** correr a mano `PYTHONIOENCODING=utf-8 python -m herramientas.pasada leer` → "Pedido de la web: …"; luego §2 (revisión de pantallazos) → `revisado` → Suno → `producir` → hoja → `entregar`.
- [ ] **Paso 5:** comprobar: los dos cortes llegan por Telegram; en Vercel → Storage → Blob no queda ningún archivo `cantados/<id>/`; el pedido ya no aparece en `/admin`.
- [ ] **Paso 6:** actualizar `docs/BRIEF.md` (Resumen de sesiones) en un PR aparte para Oscar.
