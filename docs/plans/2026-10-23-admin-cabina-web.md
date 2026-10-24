# Admin · Cabina en la web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que los candidatos del sondeo del PC lleguen a `elmetacho.com/admin` → «Cabina (N)», que Oscar los revise desde el celular (video, comentarios con imagen/GIF, arrastre, tramos, gancho, destino) y los apruebe o descarte, que lo no revisado en el plazo (72 h − 2 h de holgura) quede `automatico`, y que el PC los baje y la web borre todo de Blob y Redis.

**Architecture:** igual que las fases anteriores: lógica pura en `src/app/admin/lib/` probada con `node:test` (`cabina.js` nuevo para el candidato, `arrastre.js` nuevo para ordenar arrastrando; `pedido.js` y `revision.js` ganan las reglas de la Cabina), API con dependencias inyectadas (`api-cabina.js` nuevo, que `api.js` mezcla en su objeto) y rutas delgadas `conApi((api, req, id) => api.metodo(req, id))`. Un candidato es un pedido de Redis con `tipo: "cabina"`; reutiliza la propuesta, la revisión, el PATCH, `aprobar` y `DELETE` de los pedidos por link. La interfaz reutiliza `EditorTramos`, `subidas.js`, `cola.js` y un componente común de arrastre con eventos de puntero.

**Tech Stack:** Next.js 16.4.1 (App Router, JSX), React 19.2.4, Tailwind v4, `redis` 6, `@vercel/blob` 2.8.2 (`generateClientTokenFromReadWriteToken` en `@vercel/blob/client`, verificado en `node_modules/@vercel/blob/dist/client.d.ts` y `client.js`: lee `BLOB_READ_WRITE_TOKEN` si no se le pasa `token`), `node:test` (Node 24.11.1).

**Spec:** `docs/superpowers/specs/2026-10-23-admin-cabina-design.md` (solo la parte web: §1, §2, §3, §4, §7 y §8 «Web»; el PC tiene su propio plan con el mismo contrato de API).

**Línea base medida (2026-10-23, rama `docs/admin-cabina-spec`):** `node --test "src/**/*.test.js"` → 155 pasan, 0 fallan.

## Decisiones del plan

1. **Un candidato es un pedido** con `tipo: "cabina"`, `origen: "sondeo"`, `destino` (`reel` por defecto), `link`, `vista_previa`, y mientras está `subiendo`, los comentarios en el campo provisional `comentarios_cabina` (pasan a `propuesta.comentarios` al publicar). `TIPOS_DISPONIBLES` **no** incluye `cabina`: con sesión no se crea ni se envía uno.
2. **Rutas en Blob:** `cantados/<id>/vista.mp4` y `cantados/<id>/m<NN>.<ext>`, con `NN` = posición del comentario en la lista que manda el PC (1-based, dos dígitos), cuente o no con medio. `ext` se exige exacta y en minúscula (`jpg`, `jpeg`, `png`, `webp`, `gif`, `mp4`), porque el PC calcula la ruta por su cuenta.
3. **Topes:** vista ≤ 50 MiB (`50 * 1024 ** 2`), medio ≤ 20 MiB. El tamaño que manda el PC al pedir el token se guarda y `publicar` lo compara con `blob.tamano`.
4. **Vencimiento de la Cabina con la misma holgura del flujo por link** (ajuste del contrato, 2026-10-23): `propuesta.vence` = publicada + 72 h, y se da por vencido cuando `ahora ≥ vence − HOLGURA_FRANJA_H` (2 h), es decir a las **70 h**, con la misma constante y la misma función `vencida` de `revision.js`. Así la franja de las 2 p. m. del día 3 lo recoge. «Sale solo en N días» cuenta hasta ese límite.
5. **El flujo por link no ve la Cabina:** `GET /admin/api/pc/aprobados` filtra los `tipo: "cabina"` (si no, listaría los aprobados de la Cabina y a las 70 h «aprobaría solos» los vencidos como si fueran pedidos por link).
6. **Purga antes de vencer** en `GET /admin/api/pc/cabina`: primero se borran los `subiendo` de más de 24 h (desde `creado`) y los `en_revision` de más de 7 días (desde `propuesta.publicada`), después se pasan a `automatico` los vencidos. Con el orden inverso la purga de 7 días nunca aplicaría (ver «Puntos para Oscar» al final de este plan). **`vivos`** = los ids de **todos** los registros `tipo: "cabina"` que existen después de la purga, en cualquier estado (`subiendo`, `en_revision`, `aprobado`, `automatico`, `en_pc`, y cualquier otro).
6b. **Conteos y medios** (ajuste del contrato, 2026-10-23): `likes: null` y `respuestas: 0` (o `null`) son válidos cuando no se sabe. Los GIF llegan como archivo `.gif`; la página muestra cada medio **según su extensión**: `<img>` para `jpg`/`jpeg`/`png`/`webp`/`gif` y `<video muted autoplay loop playsinline>` solo para `.mp4`.
7. **Ids sin choques:** `nuevoId` usa 4 hex; al crear un candidato se prueba hasta 5 ids y se responde 503 si todos existen. Nunca se pisa un registro.
8. **Regla limpia del PATCH de un candidato:** en `aplicarCambios`, un `tipo: "cabina"` solo acepta `tramos`, `destino` y `gancho`, y solo en `en_revision`; los tramos se validan contra `vista_previa.duracion`. La API además responde 409 si el plazo ya venció (`noEditable`). `destino` en un pedido normal → 400 «El destino se escoge al crear el pedido.».
9. **Aprobar** reutiliza `POST /admin/api/cantados/<id>/aprobar`: en la Cabina exige gancho y ≥ 1 tramo (después de comprobar la versión) y responde **400** con «Falta: …» (no 409, para que la página no lo confunda con «la propuesta cambió»). «Trae más» no existe en la Cabina.
10. **Descartar** reutiliza `DELETE /admin/api/cantados/<id>`: un candidato se borra (prefijo + registro) en `subiendo` o `en_revision`; en `aprobado`, `automatico` o `en_pc` → 409.
11. **Subida del gancho:** `subidaPermitida` solo deja subir `gancho.<ext>` a un candidato `en_revision`; nunca la vista ni los medios (esos los sube el PC con su token).
12. **Una sola fila de guardado** en la página del candidato para `PATCH …/revision` y `PATCH …/<id>`: el servidor lee y reescribe el registro entero.
13. **Respuestas que el contrato no fija y este plan fija** (el plan del PC debe usarlas): `publicar` con archivos que faltan → 409 `{error, faltan: [pathnames]}`; `publicar` en un estado distinto de `subiendo` sin propuesta → 409 `{error, estado}`; `publicar` repetido → 200 `{ok, version, vence}`; `bajado` repetido (ya `en_pc`) → 200; `bajado` sin decidir → 409 `{error, estado}`; `DELETE` de un id que no es de la Cabina → 404 y no borra nada; crear sin id libre → 503; `likes`/`respuestas` deben ser enteros ≥ 0 o `null` (un texto como `"1,2 K"` → 400).
14. **Avisos:** uno por candidato publicado: «🎬 Cabina: candidato nuevo (N comentarios): <origen>/admin/cabina/<id>».

## Global Constraints

- Código web solo en `src/app/admin/**`; docs en `docs/admin.md` y este plan. No tocar `package.json`, `package-lock.json` ni archivos compartidos; no hay dependencias nuevas.
- **Contrato de la API del PC fijo** (no se cambia): `POST /admin/api/pc/cabina` → `{id}`; `POST /admin/api/pc/cabina/<id>/subida` `{pathname, tamano}` → `{token}` (400 ruta ajena, 409 si no está `subiendo`); `POST /admin/api/pc/cabina/<id>/publicar` `{}`; `GET /admin/api/pc/cabina` → `{decididos:[{id, estado, link, destino, titulo, tramos, gancho, orden:[{id, linea}], fuera}], vivos:[ids]}`; `POST /admin/api/pc/cabina/<id>/bajado`; `DELETE /admin/api/pc/cabina/<id>`. Todas con `Authorization: Bearer ADMIN_PC_TOKEN`, 401 sin él.
- Token de subida: `generateClientTokenFromReadWriteToken({pathname, maximumSizeInBytes: tamano, allowedContentTypes: ["video/mp4"] | ["image/*","video/mp4"], allowOverwrite: true, addRandomSuffix: false, validUntil: ahora + 1 h})`.
- Toda API nueva verifica sesión (cookie `admin_sesion`) o token del PC **antes** de leer nada, y tiene su prueba de 401. La cookie no sirve en las del PC ni el token en las de sesión.
- Redis, solo texto. Archivos solo en Blob bajo `cantados/<id>/`; se borran por prefijo al descartar, al bajar, al entregar y en las purgas.
- Plazos: `vence` = publicada + **72 h**, vencido a las **70 h** (`vence − HOLGURA_FRANJA_H`, la misma constante del flujo por link); purga a las **24 h** sin publicar y a los **7 días** en revisión; URLs firmadas de lectura **12 h** (`blob.enlace`); token de subida **1 h**.
- Ganchos del navegador: **se deja la subida actual** (multipart desde 20 MB). La spec decisión 9 era para no gastar cuota en Hobby; la cuenta es **Pro** y el multipart aguanta mejor una caída de señal en el celular. **En la Task 8 NO se hace la parte de `MULTIPART_DESDE`/`usarMultipart`** (solo pantallazos grandes con arrastre).
- La lista de pedidos normales **no** muestra candidatos; el bloque «Cabina (N)» solo muestra `tipo: "cabina"` en `en_revision`.
- Textos en español, tuteo colombiano, sin voseo. Teléfono primero (columna de 480 px, botones ≥ 44 px), clases `adm-*` de `admin.css`.
- Verificación antes de cada commit: `npm test` (= `node --test "src/**/*.test.js"`) sin fallos; en las tareas de interfaz además `npx eslint --ignore-pattern ".claude/**" src/app/admin` sin salida y `npm run build` OK.
- Nunca abrir `.env*` ni credenciales. **No fusionar a `main` sin el visto bueno de Oscar:** fusionar publica en elmetacho.com.

## Review Focus

1. **El flujo por link se lleva candidatos de la Cabina:** `GET /admin/api/pc/aprobados` hoy lista todo pedido `aprobado` con propuesta y «aprueba solo» los `en_revision` a las 22 h de su `vence` −2 h; un candidato aprobado no debe salir ahí ni uno sin revisar volverse `aprobado` → prueba: Task 5, `el flujo por link no ve la Cabina: pcAprobados no lista ni aprueba candidatos`.
2. **Choque de ids con 15–20 candidatos por franja** (`nuevoId` = 4 hex): un `POST` del PC no debe pisar un candidato o pedido que ya existe → pruebas: Task 4, `crear: si el id ya existe prueba otro y nunca pisa un candidato` y `crear: sin id libre tras 5 intentos = 503`.
3. **Oscar arrastra un comentario y enseguida marca un tramo:** dos `PATCH` a rutas distintas que reescriben el mismo registro no deben pisarse → prueba: Task 10, `dos rutas distintas en la misma fila no se pisan: la segunda espera a la primera` (y la página usa una sola fila).
4. **Página vieja abierta después del plazo (70 h):** cambiar tramos, orden, aprobar o «trae más» debe responder 409 sin tocar el candidato → prueba: Task 6, `vencido el plazo, la página vieja no cambia nada: 409 en tramos, revisión, aprobar y trae más`.
5. **El nuevo campo `destino` del PATCH en un pedido normal:** no debe convertir un reel en story después de creado → prueba: Task 3, `un pedido normal no cambia de destino después de creado (reel ↔ story)`.

---

### Task 1: Lógica pura del arrastre

**Files:**
- Create: `src/app/admin/lib/arrastre.js`
- Modify: `src/app/admin/lib/revision.js` (import y `moverAEn` junto a `moverEn`, línea ~122)
- Test: `src/app/admin/lib/arrastre.test.js`

**Interfaces:**
- Consumes: `mover(lista, i, paso)` de `lib/editor.js` (ya existe).
- Produces:
  - `moverA(lista: any[], de: number, a: number): any[]` — devuelve **la misma lista** si `de === a`, fuera de rango o no enteros.
  - `huecoEn(centros: number[], y: number): number` — 0…n.
  - `destinoDeHueco(de: number, hueco: number): number`.
  - `marcaDe(i: number, n: number, de: number|null, hueco: number|null): "" | "cae-antes" | "cae-despues"`.
  - `velocidadBorde(y: number, alto: number, margen = 80, max = 18): number` — px por cuadro, negativo = hacia arriba.
  - `moverAEn(rev: {orden, fuera, lineas}, de, a)` en `revision.js` — devuelve `rev` (mismo objeto) si no hay cambio.

- [ ] **Step 1: Preparar la rama**

```bash
cd C:/Users/delga/Documents/elmetacho-web-spec-cabina
git checkout -b feat/admin-cabina
npm ci
npm test
```
Expected: `npm ci` instala (esta copia no tiene `node_modules`); `npm test` → `ℹ pass 155`, `ℹ fail 0`.

- [ ] **Step 2: Write the failing test**

`src/app/admin/lib/arrastre.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { destinoDeHueco, huecoEn, marcaDe, moverA, velocidadBorde } from "./arrastre.js";
import { moverAEn } from "./revision.js";

test("moverA lleva el elemento a su posición final, hacia abajo y hacia arriba", () => {
  assert.deepEqual(moverA(["a", "b", "c", "d"], 0, 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moverA(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moverA(["a", "b", "c", "d"], 1, 3), ["a", "c", "d", "b"]);
});

test("moverA fuera de rango, sin cambio o con basura devuelve la misma lista", () => {
  const l = ["a", "b"];
  for (const [de, a] of [[0, 0], [-1, 1], [0, 2], [2, 0], [0.5, 1], [null, 1], [0, undefined]]) assert.equal(moverA(l, de, a), l, `${de}→${a}`);
});

test("huecoEn y destinoDeHueco: soltar entre tarjetas", () => {
  const centros = [100, 200, 300];
  assert.equal(huecoEn(centros, 50), 0);
  assert.equal(huecoEn(centros, 150), 1);
  assert.equal(huecoEn(centros, 999), 3);
  assert.equal(destinoDeHueco(0, 3), 2);   // la primera, al final
  assert.equal(destinoDeHueco(2, 0), 0);   // la última, arriba de todo
  assert.equal(destinoDeHueco(1, 1), 1);   // donde estaba
  assert.equal(destinoDeHueco(1, 2), 1);   // justo debajo de sí misma = no se mueve
});

test("marcaDe: raya arriba de la tarjeta destino o abajo de la última; nada si no se mueve", () => {
  assert.equal(marcaDe(0, 3, 2, 0), "cae-antes");
  assert.equal(marcaDe(1, 3, 2, 0), "");
  assert.equal(marcaDe(2, 3, 0, 3), "cae-despues");
  assert.equal(marcaDe(1, 3, 1, 1), "");
  assert.equal(marcaDe(2, 3, 1, 2), "");
  assert.equal(marcaDe(0, 3, null, null), "");
});

test("velocidadBorde: sube cerca de arriba, baja cerca de abajo, quieta en el medio", () => {
  assert.equal(velocidadBorde(400, 800), 0);
  assert.equal(velocidadBorde(80, 800), 0);
  assert.ok(velocidadBorde(10, 800) < 0);
  assert.ok(velocidadBorde(790, 800) > 0);
  assert.equal(velocidadBorde(0, 800), -18);
  assert.equal(velocidadBorde(-30, 800), -18);
  assert.equal(velocidadBorde(800, 800), 18);
});

test("moverAEn cambia el orden de la revisión; sin cambio devuelve la misma revisión", () => {
  const rev = { orden: ["a", "b", "c"], fuera: ["z"], lineas: { a: "x," } };
  assert.deepEqual(moverAEn(rev, 2, 0), { orden: ["c", "a", "b"], fuera: ["z"], lineas: { a: "x," } });
  assert.equal(moverAEn(rev, 1, 1), rev);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test src/app/admin/lib/arrastre.test.js`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` («Cannot find module …/lib/arrastre.js»).

- [ ] **Step 4: Write minimal implementation**

`src/app/admin/lib/arrastre.js`:
```js
// Lógica pura del arrastre para ordenar (spec cabina §4 «Arrastre»): sin DOM, probada con node:test.

// Lleva el elemento de `de` a la posición final `a`. Sin cambio, fuera de rango o con basura: la misma lista.
export function moverA(lista, de, a) {
  const n = lista.length;
  if (![de, a].every(Number.isInteger) || de < 0 || a < 0 || de >= n || a >= n || de === a) return lista;
  const out = [...lista];
  const [x] = out.splice(de, 1);
  out.splice(a, 0, x);
  return out;
}

// Hueco donde caería el puntero: 0 = antes de la primera tarjeta, n = después de la última. `centros` = centro vertical de cada una.
export function huecoEn(centros, y) {
  let k = 0;
  while (k < centros.length && y > centros[k]) k += 1;
  return k;
}

// El hueco cuenta la tarjeta que se arrastra; el índice final no.
export const destinoDeHueco = (de, hueco) => (hueco > de ? hueco - 1 : hueco);

// Raya que marca dónde cae: arriba de la tarjeta i («cae-antes») o, si es la última, abajo («cae-despues»).
export function marcaDe(i, n, de, hueco) {
  if (de === null || hueco === null || destinoDeHueco(de, hueco) === de) return "";
  if (hueco === i) return "cae-antes";
  if (hueco === n && i === n - 1) return "cae-despues";
  return "";
}

// Desplazamiento por cuadro cuando el dedo está cerca de un borde de la pantalla (negativo = hacia arriba).
export function velocidadBorde(y, alto, margen = 80, max = 18) {
  if (y < margen) return -Math.ceil(((margen - Math.max(0, y)) / margen) * max);
  if (y > alto - margen) return Math.ceil(((Math.min(alto, y) - (alto - margen)) / margen) * max);
  return 0;
}
```

En `src/app/admin/lib/revision.js`, cambia la línea 2:
```js
import { mover } from "./editor.js";
```
por:
```js
import { mover } from "./editor.js";
import { moverA } from "./arrastre.js";
```
y debajo de `export const moverEn = …` (línea ~122) agrega:
```js
export function moverAEn(rev, de, a) {
  const orden = moverA(rev.orden, de, a);
  return orden === rev.orden ? rev : { ...rev, orden };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test src/app/admin/lib/arrastre.test.js && npm test`
Expected: 6 pruebas nuevas pasan; total `ℹ pass 161`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/lib/arrastre.js src/app/admin/lib/arrastre.test.js src/app/admin/lib/revision.js
git commit -m "feat(admin): lógica pura del arrastre para ordenar (moverA, hueco, raya, auto-scroll)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Modelo del candidato de la Cabina (`lib/cabina.js`)

**Files:**
- Create: `src/app/admin/lib/cabina.js`
- Modify: `src/app/admin/lib/pedido.js` (agregar `esCabina` después de `tipoDe`, línea ~26)
- Modify: `src/app/admin/lib/revision.js` (`publicarPropuesta` con `horas`; `vencida` y `limite` **no** cambian: la Cabina usa la misma holgura de 2 h)
- Test: `src/app/admin/lib/cabina.test.js`

**Interfaces:**
- Consumes: `linkValido`, `nuevoPedido`, `prefijo`, `destinoDe` (`pedido.js`); `validarPropuesta`, `publicarPropuesta`, `listaFinal`, `vencida` (`revision.js`).
- Produces:
  - `esCabina(p): boolean` en `pedido.js` (seguro con `null`).
  - `publicarPropuesta(p, comentarios, ahoraMs, horas = HORAS_REVISION)` en `revision.js`. `vencida(p, ahoraMs)` sin cambios (vencido a `vence − HOLGURA_FRANJA_H`).
  - En `cabina.js`: constantes `HORAS_CABINA = 72`, `HORAS_SIN_PUBLICAR = 24`, `DIAS_EN_REVISION = 7`, `MAX_VISTA = 50 * 1024 ** 2`, `MAX_MEDIO = 20 * 1024 ** 2`, `EXT_MEDIO`, `CONTENIDO_VISTA = ["video/mp4"]`, `CONTENIDO_MEDIO = ["image/*", "video/mp4"]`;
    `rutaVista(id): string`; `rutaMedio(id, posicion1, ext): string`;
    `validarCandidato(id, cuerpo): {link, vista:{duracion, ancho, alto}, comentarios:[{id, usuario, texto, linea, likes, respuestas, dentro, medio:{pathname, tipo, tamano:null}|null}], errores: []} | {errores: [string]}`;
    `nuevoCandidato(id, creadoIso, datos): pedido`;
    `reglaDeSubida(p, pathname): {max, tipos} | null`;
    `anotarTamano(p, pathname, tamano): pedido`;
    `archivosDelCandidato(p): [{pathname, tamano, …}]`;
    `publicarCandidato(p, ahoraMs): pedido` (sin `comentarios_cabina`);
    `yaPublicado(p): boolean`;
    `paraElPc(p): {id, estado, link, destino, titulo, tramos, orden, fuera}`;
    `vencerCandidato(p, ahoraMs): pedido` (el mismo objeto si no vence);
    `aPurgar(p, ahoraMs): boolean`;
    `diasRestantes(p, ahoraMs): number`; `textoDias(dias): string`;
    `nombreCabina(p): string`;
    `separarCabina(lista, ahoraMs): {cabina: [{id, nombre, comentarios, dias}], pedidos: pedido[]}`.

- [ ] **Step 1: Write the failing test**

`src/app/admin/lib/cabina.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_MEDIO, MAX_VISTA, aPurgar, anotarTamano, archivosDelCandidato, diasRestantes, nuevoCandidato, paraElPc, publicarCandidato,
  reglaDeSubida, rutaMedio, rutaVista, separarCabina, textoDias, validarCandidato, vencerCandidato, yaPublicado } from "./cabina.js";
import { aplicarRevision, vencida } from "./revision.js";

const T = Date.parse("2026-10-23T19:10:00Z");
const H = 3600e3;
const ID = "c_20261023_ab12", B = `cantados/${ID}/`;
const iso = (ms) => new Date(ms).toISOString();
const COMS = () => [
  { id: "c1", usuario: "ana", texto: "jajaja", linea: "jajaja,", likes: 120, respuestas: 4, dentro: true, medio: { ext: "jpg", tipo: "imagen" } },
  { id: "c2", usuario: "beto", texto: "uy no", linea: "uy no,", likes: null, respuestas: null, dentro: true },
  { id: "c3", usuario: "caro", texto: "qué es eso", linea: "qué es eso,", likes: 3, respuestas: 0, dentro: false, medio: { ext: "mp4", tipo: "gif" } },
];
const CAND = () => ({ link: "https://www.tiktok.com/@x/video/7", comentarios: COMS(), vista: { duracion: 31.5, ancho: 480, alto: 854 } });
function nuevo(id = ID) {
  const d = validarCandidato(id, CAND());
  assert.deepEqual(d.errores, []);
  return nuevoCandidato(id, iso(T), d);
}
const publicado = (t = T) => publicarCandidato(nuevo(), t);

test("valida el candidato y asigna rutas a la vista y a cada medio por su posición", () => {
  const d = validarCandidato(ID, CAND());
  assert.deepEqual(d.errores, []);
  assert.equal(d.link, "https://www.tiktok.com/@x/video/7");
  assert.deepEqual(d.vista, { duracion: 31.5, ancho: 480, alto: 854 });
  assert.deepEqual(d.comentarios.map((c) => c.medio), [
    { pathname: B + "m01.jpg", tipo: "imagen", tamano: null }, null, { pathname: B + "m03.mp4", tipo: "gif", tamano: null }]);
  assert.deepEqual(d.comentarios.map((c) => [c.likes, c.respuestas]), [[120, 4], [null, null], [3, 0]]);
  const sinDatos = validarCandidato(ID, { ...CAND(), comentarios: [{ ...COMS()[0], likes: null, respuestas: 0, medio: { ext: "gif", tipo: "gif" } }] });
  assert.deepEqual(sinDatos.errores, []);   // likes desconocidos = null; respuestas desconocidas = 0; el GIF llega como .gif
  assert.deepEqual([sinDatos.comentarios[0].likes, sinDatos.comentarios[0].respuestas, sinDatos.comentarios[0].medio.pathname], [null, 0, B + "m01.gif"]);
  assert.equal(rutaVista(ID), B + "vista.mp4");
  assert.equal(rutaMedio(ID, 12, "png"), B + "m12.png");
});

test("rechaza link, vista, likes, respuestas o medios malos", () => {
  const con = (cambio) => ({ ...CAND(), ...cambio });
  const com = (cambio) => con({ comentarios: [{ ...COMS()[0], ...cambio }] });
  const malos = [
    null, [], con({ link: "http://tiktok.com/x" }), con({ vista: undefined }), con({ vista: { duracion: 0, ancho: 480, alto: 854 } }),
    con({ vista: { duracion: 31.5, ancho: 480.5, alto: 854 } }), con({ comentarios: [] }), con({ comentarios: Array.from({ length: 81 }, (_, k) => ({ ...COMS()[1], id: `x${k}` })) }),
    com({ likes: "120" }), com({ likes: 1.5 }), com({ respuestas: -1 }), com({ medio: { ext: "JPG", tipo: "imagen" } }),
    com({ medio: { ext: "exe", tipo: "imagen" } }), com({ medio: { ext: "jpg", tipo: "video" } }), com({ medio: "m01.jpg" }),
  ];
  for (const c of malos) assert.equal(validarCandidato(ID, c).errores.length, 1, JSON.stringify(c)?.slice(0, 80));
});

test("candidato nuevo: tipo cabina, origen sondeo, reel, subiendo, sin propuesta y con los comentarios aparte", () => {
  const p = nuevo();
  assert.deepEqual([p.id, p.tipo, p.origen, p.destino, p.estado, p.propuesta, p.link, p.tramos, p.gancho],
    [ID, "cabina", "sondeo", "reel", "subiendo", null, "https://www.tiktok.com/@x/video/7", [], null]);
  assert.deepEqual(p.vista_previa, { pathname: B + "vista.mp4", tamano: null, duracion: 31.5, ancho: 480, alto: 854 });
  assert.equal(p.comentarios_cabina.length, 3);
  assert.equal(yaPublicado(p), false);
});

test("reglaDeSubida: solo la vista y los medios de ESTE candidato, cada uno con su tope y sus tipos", () => {
  const p = nuevo();
  assert.deepEqual(reglaDeSubida(p, B + "vista.mp4"), { max: MAX_VISTA, tipos: ["video/mp4"] });
  assert.deepEqual(reglaDeSubida(p, B + "m01.jpg"), { max: MAX_MEDIO, tipos: ["image/*", "video/mp4"] });
  assert.deepEqual(reglaDeSubida(p, B + "m03.mp4"), { max: MAX_MEDIO, tipos: ["image/*", "video/mp4"] });
  for (const r of [B + "m02.jpg", B + "m01.png", B + "gancho.mp4", "cantados/otro/vista.mp4", `${B}../otro/vista.mp4`, undefined, 3])
    assert.equal(reglaDeSubida(p, r), null, String(r));
  assert.equal(MAX_VISTA, 50 * 1024 ** 2);
  assert.equal(MAX_MEDIO, 20 * 1024 ** 2);
});

test("anotarTamano guarda el tamaño esperado; archivosDelCandidato lista la vista y los medios", () => {
  let p = anotarTamano(nuevo(), B + "vista.mp4", 4_000_000);
  p = anotarTamano(p, B + "m01.jpg", 1000);
  assert.deepEqual(archivosDelCandidato(p).map((a) => [a.pathname, a.tamano]),
    [[B + "vista.mp4", 4_000_000], [B + "m01.jpg", 1000], [B + "m03.mp4", null]]);
});

test("publicar: en_revision, vence a las 72 h, revisión con los dentro y sin el campo provisional", () => {
  const p = publicado();
  assert.deepEqual([p.estado, p.propuesta.version, p.propuesta.publicada, p.propuesta.vence], ["en_revision", 1, iso(T), iso(T + 72 * H)]);
  assert.deepEqual([p.revision.orden, p.revision.fuera, p.revision.trae_mas], [["c1", "c2"], ["c3"], false]);
  assert.equal("comentarios_cabina" in p, false);
  assert.deepEqual([p.propuesta.comentarios[0].respuestas, p.propuesta.comentarios[0].medio.pathname], [4, B + "m01.jpg"]);
  assert.equal(yaPublicado(p), true);
});

test("vence con la holgura de la franja: a las 70 h menos 1 ms sigue en revisión; a las 70 h (72 − 2) pasa a automatico", () => {
  const p = publicado();
  assert.equal(p.propuesta.vence, iso(T + 72 * H));          // lo guardado sigue siendo publicada + 72 h
  assert.equal(vencerCandidato(p, T + 70 * H - 1), p);
  assert.equal(vencerCandidato(p, T + 70 * H).estado, "automatico");
  assert.equal(vencerCandidato({ ...p, estado: "aprobado" }, T + 99 * H).estado, "aprobado");
  const link = { tipo: "link", estado: "en_revision", revision: { trae_mas: false }, propuesta: { vence: iso(T + 24 * H) } };
  assert.equal(vencida(link, T + 22 * H), true);              // el de link sigue venciendo 2 h antes
  assert.equal(vencerCandidato(link, T + 99 * H), link);      // y vencerCandidato no lo toca
});

test("paraElPc: el aprobado lleva la lista de Oscar; el automatico, el orden propuesto de los dentro", () => {
  const p = publicado();
  const r = aplicarRevision(p, { orden: ["c2", "c3"], fuera: ["c1"], lineas: { c3: "otra cosa," }, version: 1 }, T);
  assert.deepEqual(r.errores, []);
  const aprobado = { ...r.pedido, estado: "aprobado", destino: "story", tramos: [[2, 9]] };
  assert.deepEqual(paraElPc(aprobado), {
    id: ID, estado: "aprobado", link: "https://www.tiktok.com/@x/video/7", destino: "story", titulo: null, tramos: [[2, 9]],
    orden: [{ id: "c2", linea: "uy no," }, { id: "c3", linea: "otra cosa," }], fuera: ["c1"],
  });
  const auto = vencerCandidato(r.pedido, T + 70 * H);
  assert.deepEqual([paraElPc(auto).orden, paraElPc(auto).fuera], [[{ id: "c1", linea: "jajaja," }, { id: "c2", linea: "uy no," }], ["c3"]]);
});

test("purga: sin publicar a las 24 h; en revisión a los 7 días; lo demás no", () => {
  assert.equal(aPurgar(nuevo(), T + 24 * H), false);
  assert.equal(aPurgar(nuevo(), T + 24 * H + 1), true);
  assert.equal(aPurgar(publicado(), T + 7 * 24 * H), false);
  assert.equal(aPurgar(publicado(), T + 7 * 24 * H + 1), true);
  for (const estado of ["aprobado", "automatico", "en_pc"]) assert.equal(aPurgar({ ...publicado(), estado }, T + 99 * 24 * H), false, estado);
  assert.equal(aPurgar({ tipo: "link", estado: "subiendo", creado: iso(T) }, T + 99 * H), false);
});

test("días que faltan, texto de la lista y separación de la Cabina y los pedidos", () => {
  const p = publicado();
  // cuenta hasta el límite real (70 h): 70 h → 3 días; 21 h → 1; 1 h → 1; vencido → 0
  assert.deepEqual([diasRestantes(p, T), diasRestantes(p, T + 49 * H), diasRestantes(p, T + 69 * H), diasRestantes(p, T + 70 * H), diasRestantes({}, T)], [3, 1, 1, 0, 0]);
  assert.deepEqual([textoDias(3), textoDias(1), textoDias(0)], ["sale solo en 3 días", "sale solo en 1 día", "sale solo en la próxima franja"]);
  const a = publicarCandidato(nuevo("c_a"), T);
  const b = publicarCandidato(nuevo("c_b"), T - 10 * H);      // vence antes: va primero
  const link = { id: "c_l", tipo: "link", estado: "en_revision", creado: iso(T) };
  const { cabina, pedidos } = separarCabina([link, nuevo("c_s"), a, { ...publicado(), id: "c_ap", estado: "aprobado" }, b], T);
  assert.deepEqual(cabina, [
    { id: "c_b", nombre: "tiktok.com/@x/video/7", comentarios: 2, dias: 3 },
    { id: "c_a", nombre: "tiktok.com/@x/video/7", comentarios: 2, dias: 3 },
  ]);
  assert.deepEqual(pedidos.map((x) => x.id), ["c_l"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/app/admin/lib/cabina.test.js`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` («Cannot find module …/lib/cabina.js»).

- [ ] **Step 3: Write minimal implementation**

En `src/app/admin/lib/pedido.js`, debajo de `export const tipoDe = …` (línea 26) agrega:
```js
export const esCabina = (p) => Boolean(p) && tipoDe(p) === "cabina";   // candidatos del sondeo (spec cabina §4)
```

En `src/app/admin/lib/revision.js`, reemplaza `publicarPropuesta` por:
```js
export function publicarPropuesta(p, comentarios, ahoraMs, horas = HORAS_REVISION) {
  return {
    ...p, estado: "en_revision", automatico: false,
    propuesta: { publicada: iso(ahoraMs), vence: iso(ahoraMs + horas * 3600e3), version: (p.propuesta?.version || 0) + 1, comentarios },
    revision: { orden: comentarios.filter((c) => c.dentro).map((c) => c.id), fuera: comentarios.filter((c) => !c.dentro).map((c) => c.id),
                lineas: {}, trae_mas: false, aprobada_en: null },
  };
}
```
`vencida` y `limite` no se tocan: la Cabina vence `HOLGURA_FRANJA_H` (2 h) antes de su `vence`, igual que los pedidos por link.

`src/app/admin/lib/cabina.js`:
```js
// Candidatos de la Cabina: el sondeo del PC los crea y sube; Oscar los revisa en /admin. Spec 2026-10-23-admin-cabina-design §4.
import { destinoDe, esCabina, linkValido, nuevoPedido, prefijo } from "./pedido.js";
import { HOLGURA_FRANJA_H, listaFinal, publicarPropuesta, validarPropuesta, vencida } from "./revision.js";

export const HORAS_CABINA = 72;   // vence = publicada + 72 h; se da por vencido HOLGURA_FRANJA_H antes (70 h), como los pedidos por link
export const HORAS_SIN_PUBLICAR = 24;
export const DIAS_EN_REVISION = 7;
export const MAX_VISTA = 50 * 1024 ** 2;
export const MAX_MEDIO = 20 * 1024 ** 2;
export const EXT_MEDIO = ["jpg", "jpeg", "png", "webp", "gif", "mp4"];
const TIPOS_MEDIO = ["imagen", "gif"];
export const CONTENIDO_VISTA = ["video/mp4"];
export const CONTENIDO_MEDIO = ["image/*", "video/mp4"];

export const rutaVista = (id) => `${prefijo(id)}vista.mp4`;
// posicion: 1-based, la del comentario en la lista que manda el PC (tenga o no medio).
export const rutaMedio = (id, posicion, ext) => `${prefijo(id)}m${String(posicion).padStart(2, "0")}.${ext}`;

const conteo = (x) => (x === undefined || x === null ? null : Number.isInteger(x) && x >= 0 ? x : undefined);
const positivo = (x) => typeof x === "number" && Number.isFinite(x) && x > 0;
const entero = (x) => Number.isInteger(x) && x > 0;

export function validarCandidato(id, c) {
  const mal = (e) => ({ errores: [e] });
  if (!c || typeof c !== "object" || Array.isArray(c)) return mal("Datos inválidos.");
  if (!linkValido(c.link)) return mal("El link debe ser de TikTok: https://www.tiktok.com/…, https://vm.tiktok.com/… o https://vt.tiktok.com/…");
  const v = c.vista;
  if (!v || typeof v !== "object" || !positivo(v.duracion) || !entero(v.ancho) || !entero(v.alto))
    return mal("La vista previa necesita duracion (s), ancho y alto (px).");
  const { comentarios, errores } = validarPropuesta(c.comentarios);
  if (errores.length) return { errores };
  const salida = [];
  for (const [k, base] of comentarios.entries()) {
    const crudo = c.comentarios[k];
    const likes = conteo(crudo.likes), respuestas = conteo(crudo.respuestas);
    if (likes === undefined || respuestas === undefined) return mal(`El comentario ${base.id} trae likes o respuestas que no son números enteros.`);
    let medio = null;
    if (crudo.medio !== undefined && crudo.medio !== null) {
      const m = crudo.medio;
      if (typeof m !== "object" || !EXT_MEDIO.includes(m.ext) || !TIPOS_MEDIO.includes(m.tipo))
        return mal(`El medio del comentario ${base.id} no es válido (ext: ${EXT_MEDIO.join(", ")}; tipo: imagen o gif).`);
      medio = { pathname: rutaMedio(id, k + 1, m.ext), tipo: m.tipo, tamano: null };
    }
    salida.push({ ...base, likes, respuestas, medio });
  }
  return { link: c.link.trim(), vista: { duracion: v.duracion, ancho: v.ancho, alto: v.alto }, comentarios: salida, errores: [] };
}

export const nuevoCandidato = (id, creado, d) => ({
  ...nuevoPedido(id, creado, "cabina", "reel"),
  origen: "sondeo", link: d.link, propuesta: null,
  vista_previa: { pathname: rutaVista(id), tamano: null, ...d.vista },
  comentarios_cabina: d.comentarios,   // provisional: pasan a propuesta.comentarios al publicar
});

// ¿Qué puede subir el PC a esta ruta? Tope y tipos de contenido; null si la ruta no es de este candidato.
export function reglaDeSubida(p, pathname) {
  if (typeof pathname !== "string") return null;
  if (pathname === p.vista_previa?.pathname) return { max: MAX_VISTA, tipos: CONTENIDO_VISTA };
  if ((p.comentarios_cabina || []).some((c) => c.medio?.pathname === pathname)) return { max: MAX_MEDIO, tipos: CONTENIDO_MEDIO };
  return null;
}

// Tamaño que anunció el PC al pedir el token: «publicar» lo compara con el blob real.
export function anotarTamano(p, pathname, tamano) {
  if (p.vista_previa?.pathname === pathname) return { ...p, vista_previa: { ...p.vista_previa, tamano } };
  return { ...p, comentarios_cabina: (p.comentarios_cabina || []).map((c) => (c.medio?.pathname === pathname ? { ...c, medio: { ...c.medio, tamano } } : c)) };
}

export const archivosDelCandidato = (p) => [p.vista_previa, ...(p.comentarios_cabina || []).map((c) => c.medio)].filter(Boolean);

export function publicarCandidato(p, ahoraMs) {
  const { comentarios_cabina: comentarios, ...resto } = p;
  return publicarPropuesta(resto, comentarios, ahoraMs, HORAS_CABINA);
}
export const yaPublicado = (p) => esCabina(p) && p.estado !== "subiendo" && Boolean(p.propuesta);

// Lo que recibe el PC en GET /admin/api/pc/cabina (sin el gancho, que se firma en la API).
export function paraElPc(p) {
  const auto = p.estado === "automatico";
  const coms = p.propuesta.comentarios;
  return {
    id: p.id, estado: p.estado, link: p.link, destino: destinoDe(p), titulo: p.titulo ?? null, tramos: p.tramos ?? [],
    orden: auto ? coms.filter((c) => c.dentro).map(({ id, linea }) => ({ id, linea })) : listaFinal(p),
    fuera: auto ? coms.filter((c) => !c.dentro).map((c) => c.id) : [...p.revision.fuera],
  };
}

export const vencerCandidato = (p, ahoraMs) => (esCabina(p) && vencida(p, ahoraMs) ? { ...p, estado: "automatico" } : p);

export function aPurgar(p, ahoraMs) {
  if (!esCabina(p)) return false;
  if (p.estado === "subiendo") return ahoraMs - Date.parse(p.creado) > HORAS_SIN_PUBLICAR * 3600e3;
  if (p.estado === "en_revision") return ahoraMs - Date.parse(p.propuesta?.publicada) > DIAS_EN_REVISION * 864e5;
  return false;
}

// Días hasta que sale solo: cuenta hasta el límite real (vence − holgura de la franja), el mismo que usa `vencida`.
export const diasRestantes = (p, ahoraMs) =>
  Math.max(0, Math.ceil((Date.parse(p.propuesta?.vence) - HOLGURA_FRANJA_H * 3600e3 - ahoraMs) / 864e5)) || 0;
export const textoDias = (dias) => (dias <= 0 ? "sale solo en la próxima franja" : dias === 1 ? "sale solo en 1 día" : `sale solo en ${dias} días`);
export const nombreCabina = (p) => String(p.link || p.id).replace(/^https:\/\/(www\.)?/, "");

// Lista de /admin: el bloque «Cabina (N)» (solo en revisión, el que vence antes primero) y los pedidos normales.
export function separarCabina(lista, ahoraMs) {
  const cabina = lista
    .filter((p) => esCabina(p) && p.estado === "en_revision" && p.propuesta && p.revision)
    .sort((x, y) => Date.parse(x.propuesta.vence) - Date.parse(y.propuesta.vence))
    .map((p) => ({ id: p.id, nombre: nombreCabina(p), comentarios: p.revision.orden.length, dias: diasRestantes(p, ahoraMs) }));
  return { cabina, pedidos: lista.filter((p) => !esCabina(p)) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/app/admin/lib/cabina.test.js && npm test`
Expected: las 10 pruebas de `cabina.test.js` pasan; `ℹ pass 171`, `ℹ fail 0` (las de `revision.test.js` siguen igual: sus pedidos son `tipo: "link"`).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/lib/cabina.js src/app/admin/lib/cabina.test.js src/app/admin/lib/pedido.js src/app/admin/lib/revision.js
git commit -m "feat(admin): modelo del candidato de la Cabina (validación, rutas, publicar, vencer a las 70 h, purga)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Reglas del pedido y de la revisión para la Cabina

**Files:**
- Modify: `src/app/admin/lib/pedido.js` (`aplicarCambios` líneas 59-97, `subidaPermitida` líneas 120-124, nuevo `sePuedeCancelar`)
- Modify: `src/app/admin/lib/revision.js` (`noEditable`, `aprobarRevision`, `pedirMas`, nuevo `faltaParaAprobar`)
- Test: `src/app/admin/lib/cabina-reglas.test.js`

**Interfaces:**
- Consumes: `esCabina` (Task 2); `nuevoCandidato`, `publicarCandidato`, `validarCandidato` (Task 2, solo en la prueba).
- Produces:
  - `aplicarCambios(p, c)`: en un candidato `en_revision` acepta solo `tramos` (contra `vista_previa.duracion`), `destino` (`"reel"|"story"`) y `gancho`; en otro estado → «Este candidato ya no está en la Cabina.». En un pedido normal, `destino` → «El destino se escoge al crear el pedido.».
  - `subidaPermitida(p, pathname)`: candidato → solo `gancho.<ext>` en `en_revision`.
  - `sePuedeCancelar(p): boolean`.
  - `faltaParaAprobar(p): string[]` (vacío si no es candidato).
  - `aprobarRevision(p, ahoraMs, version)` → además `{pedido, errores: ["Falta: …."], faltan: true}` en un candidato sin gancho o sin tramos.
  - `pedirMas` en un candidato → error «La Cabina no tiene «Trae más».».
  - `noEditable` en un candidato vencido → «Se venció el plazo: sale solo como story corta.».

- [ ] **Step 1: Write the failing test**

`src/app/admin/lib/cabina-reglas.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarCambios, nuevoPedido, sePuedeCancelar, subidaPermitida } from "./pedido.js";
import { aprobarRevision, faltaParaAprobar, noEditable, pedirMas } from "./revision.js";
import { nuevoCandidato, publicarCandidato, validarCandidato } from "./cabina.js";

const T = Date.parse("2026-10-23T19:10:00Z");
const H = 3600e3;
const ID = "c_20261023_ab12", B = `cantados/${ID}/`;
function candidato(estado = "en_revision") {
  const d = validarCandidato(ID, { link: "https://vt.tiktok.com/ZS9/", vista: { duracion: 31.5, ancho: 480, alto: 854 },
    comentarios: [{ id: "c1", usuario: "u", texto: "t", linea: "l,", dentro: true }] });
  assert.deepEqual(d.errores, []);
  return { ...publicarCandidato(nuevoCandidato(ID, new Date(T).toISOString(), d), T), estado };
}
const GANCHO = { pathname: B + "gancho.mov", tamano: 300, duracion: 4, ancho: 1080, alto: 1920 };

test("subidaPermitida: en la Cabina el navegador solo sube el gancho, y solo en revisión", () => {
  assert.equal(subidaPermitida(candidato(), B + "gancho.mov"), true);
  for (const r of ["vista.mp4", "m01.jpg", "p01.jpg", "original.mp4"]) assert.equal(subidaPermitida(candidato(), B + r), false, r);
  for (const e of ["subiendo", "aprobado", "automatico", "en_pc"]) assert.equal(subidaPermitida(candidato(e), B + "gancho.mov"), false, e);
  assert.equal(subidaPermitida(nuevoPedido(ID, new Date(T).toISOString()), B + "p01.jpg"), true);   // los pedidos normales siguen igual
});

test("aplicarCambios en un candidato en revisión: tramos contra la vista, destino y gancho; nada más", () => {
  const { pedido, errores } = aplicarCambios(candidato(), { tramos: [[2, 9]], destino: "story", gancho: GANCHO });
  assert.deepEqual(errores, []);
  assert.deepEqual([pedido.tramos, pedido.destino, pedido.gancho.pathname], [[[2, 9]], "story", B + "gancho.mov"]);
  assert.match(aplicarCambios(candidato(), { tramos: [[30, 33]] }).errores[0], /dura 31.5 s/);
  for (const c of [{ destino: "Story" }, { destino: 1 }, { titulo: "x" }, { estilo: "Salsa" }, { link: "https://vt.tiktok.com/ZS9/" },
                   { pantallazos: [] }, { gancho: { ...GANCHO, pathname: "cantados/otro/gancho.mov" } }])
    assert.equal(aplicarCambios(candidato(), c).errores.length, 1, JSON.stringify(c));
  for (const e of ["subiendo", "aprobado", "automatico", "en_pc"])
    assert.match(aplicarCambios(candidato(e), { destino: "story" }).errores[0], /ya no está en la Cabina/, e);
});

test("un pedido normal no cambia de destino después de creado (reel ↔ story)", () => {
  const p = nuevoPedido(ID, new Date(T).toISOString(), "pantallazos", "reel");
  const r = aplicarCambios(p, { destino: "story" });
  assert.deepEqual([r.errores, r.pedido.destino], [["El destino se escoge al crear el pedido."], "reel"]);
});

test("sePuedeCancelar: un candidato se descarta mientras espera a Oscar; decidido, no; los pedidos siguen igual", () => {
  for (const e of ["subiendo", "en_revision"]) assert.equal(sePuedeCancelar(candidato(e)), true, e);
  for (const e of ["aprobado", "automatico", "en_pc"]) assert.equal(sePuedeCancelar(candidato(e)), false, e);
  for (const e of ["en_pc", "en_revision", "aprobado"]) assert.equal(sePuedeCancelar({ tipo: "link", estado: e }), false, e);
  for (const e of ["subiendo", "listo", "fallido", "necesita_pantallazos"]) assert.equal(sePuedeCancelar({ tipo: "link", estado: e }), true, e);
});

test("aprobar un candidato exige gancho y un tramo (después de la versión); «trae más» no existe en la Cabina", () => {
  const p = candidato();
  assert.deepEqual(faltaParaAprobar(p), ["tu gancho", "marcar al menos un tramo"]);
  assert.deepEqual(faltaParaAprobar({ tipo: "link" }), []);
  assert.deepEqual(aprobarRevision(p, T, 1), { pedido: p, errores: ["Falta: tu gancho, marcar al menos un tramo."], faltan: true });
  assert.equal(aprobarRevision(p, T, 2).conflicto, true);
  const r = aprobarRevision({ ...p, gancho: GANCHO, tramos: [[2, 9]] }, T, 1);
  assert.deepEqual([r.errores, r.pedido.estado, r.pedido.automatico], [[], "aprobado", false]);
  assert.match(pedirMas(p, T, 1).errores[0], /no tiene «Trae más»/);
});

test("noEditable: el candidato vencido sale solo como story corta", () => {
  assert.equal(noEditable(candidato(), T + 70 * H - 1), null);
  assert.match(noEditable(candidato(), T + 70 * H), /story corta/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/app/admin/lib/cabina-reglas.test.js`
Expected: FAIL con `SyntaxError: The requested module './pedido.js' does not provide an export named 'sePuedeCancelar'`.

- [ ] **Step 3: Write minimal implementation**

En `src/app/admin/lib/pedido.js`:

a) Reemplaza el inicio de `aplicarCambios` (líneas 59-65):
```js
export function aplicarCambios(p, c) {
  if (!c || typeof c !== "object" || Array.isArray(c)) return { pedido: p, errores: ["Datos inválidos."] };
  if (p.estado === "necesita_pantallazos") {
    if (p.pantallazos_listos) return { pedido: p, errores: ["Ya enviaste los pantallazos."] };
    if (Object.keys(c).some((k) => k !== "pantallazos")) return { pedido: p, errores: ["En este pedido solo se pueden subir pantallazos."] };
  } else if (p.estado !== "subiendo") return { pedido: p, errores: ["Este pedido ya se envió; cancélalo y súbelo de nuevo."] };
  const out = { ...p }, errores = [];
```
por:
```js
const CAMPOS_CABINA = ["tramos", "destino", "gancho"];

export function aplicarCambios(p, c) {
  if (!c || typeof c !== "object" || Array.isArray(c)) return { pedido: p, errores: ["Datos inválidos."] };
  if (esCabina(p)) {
    // Spec cabina §4: Oscar solo marca tramos, escoge destino y sube su gancho, y solo mientras está en revisión.
    if (p.estado !== "en_revision") return { pedido: p, errores: ["Este candidato ya no está en la Cabina."] };
    if (Object.keys(c).some((k) => !CAMPOS_CABINA.includes(k)))
      return { pedido: p, errores: ["En la Cabina solo se cambian los tramos, el destino y el gancho."] };
  } else if (p.estado === "necesita_pantallazos") {
    if (p.pantallazos_listos) return { pedido: p, errores: ["Ya enviaste los pantallazos."] };
    if (Object.keys(c).some((k) => k !== "pantallazos")) return { pedido: p, errores: ["En este pedido solo se pueden subir pantallazos."] };
  } else if (p.estado !== "subiendo") return { pedido: p, errores: ["Este pedido ya se envió; cancélalo y súbelo de nuevo."] };
  const out = { ...p }, errores = [];
  if ("destino" in c) {
    if (!esCabina(p)) errores.push("El destino se escoge al crear el pedido.");
    else if (DESTINOS.includes(c.destino)) out.destino = c.destino;
    else errores.push("Destino no válido.");
  }
```
b) En el mismo `aplicarCambios`, reemplaza:
```js
    const r = validarTramos(c.tramos, out.original?.duracion);
```
por:
```js
    const r = validarTramos(c.tramos, esCabina(p) ? p.vista_previa?.duracion : out.original?.duracion);
```
c) Reemplaza `subidaPermitida` (líneas 119-124) por:
```js
// ¿Puede el navegador subir este archivo? En subiendo, cualquiera de su carpeta; en necesita_pantallazos, solo pNN;
// en un candidato de la Cabina, solo su gancho y solo en revisión (la vista y los medios los sube el PC con su token).
export function subidaPermitida(p, pathname) {
  if (!p || typeof pathname !== "string" || pathname.includes("..") || !pathname.startsWith(prefijo(p.id))) return false;
  const resto = pathname.slice(prefijo(p.id).length);
  if (esCabina(p)) return p.estado === "en_revision" && PATRON.gancho.test(resto);
  if (p.estado === "subiendo") return true;
  return p.estado === "necesita_pantallazos" && !p.pantallazos_listos && PATRON.pantallazo.test(resto);
}

// Cancelar (o «Descartar» en la Cabina): no cuando el PC ya tiene el trabajo. Un candidato se descarta mientras espera a Oscar.
export const sePuedeCancelar = (p) => (esCabina(p) ? ["subiendo", "en_revision"].includes(p.estado) : !EN_EL_PC.includes(p.estado));
```

En `src/app/admin/lib/revision.js`:

0) Agrega `esCabina` a los imports de arriba (quedan así):
```js
import { mover } from "./editor.js";
import { moverA } from "./arrastre.js";
import { esCabina } from "./pedido.js";
```

a) Reemplaza `noEditable`:
```js
export function noEditable(p, ahoraMs) {
  if (p.estado !== "en_revision" || !p.propuesta || !p.revision) return "Este pedido no está en revisión.";
  if (p.revision.trae_mas) return "Ya pediste más comentarios: llegan en la franja de las 2 p. m.";
  if (vencida(p, ahoraMs))
    return esCabina(p) ? "Se venció el plazo: sale solo como story corta." : "Se venció el plazo: se aprueba solo con la lista como está.";
  return null;
}
```
b) Reemplaza `aprobarRevision` y `pedirMas`:
```js
// Spec cabina §4: un candidato se aprueba con su gancho subido y al menos un tramo.
export const faltaParaAprobar = (p) =>
  (esCabina(p) ? [!(p.gancho?.tamano > 0) && "tu gancho", !p.tramos?.length && "marcar al menos un tramo"].filter(Boolean) : []);

// version: la de la propuesta que vio el navegador (obligatoria; si no coincide, error).
export function aprobarRevision(p, ahoraMs, version) {
  const no = noEditable(p, ahoraMs);
  if (no) return { pedido: p, errores: [no] };
  if (versionVieja(p, version)) return { pedido: p, errores: [VIEJA], conflicto: true };
  const falta = faltaParaAprobar(p);
  if (falta.length) return { pedido: p, errores: [`Falta: ${falta.join(", ")}.`], faltan: true };
  return { pedido: { ...p, estado: "aprobado", automatico: false, revision: { ...p.revision, aprobada_en: iso(ahoraMs) } }, errores: [] };
}
export function pedirMas(p, ahoraMs, version) {
  if (esCabina(p)) return { pedido: p, errores: ["La Cabina no tiene «Trae más»."] };
  const no = noEditable(p, ahoraMs);
  if (no) return { pedido: p, errores: [no] };
  if (versionVieja(p, version)) return { pedido: p, errores: [VIEJA], conflicto: true };
  return { pedido: { ...p, revision: { ...p.revision, trae_mas: true } }, errores: [] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/app/admin/lib/cabina-reglas.test.js && npm test`
Expected: 6 pruebas nuevas pasan; `ℹ pass 177`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/lib/pedido.js src/app/admin/lib/revision.js src/app/admin/lib/cabina-reglas.test.js
git commit -m "feat(admin): reglas de la Cabina en el pedido y la revisión (PATCH, gancho, descartar, aprobar)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: API del PC — crear el candidato y pedir tokens de subida

**Files:**
- Create: `src/app/admin/lib/api-cabina.js`
- Modify: `src/app/admin/lib/api.js` (import y spread de `rutasCabina` en el objeto que devuelve `crearApi`, línea ~37)
- Modify: `src/app/admin/lib/deps.js` (import de `@vercel/blob/client` y `blob.tokenSubida`)
- Create: `src/app/admin/api/pc/cabina/route.js`
- Create: `src/app/admin/api/pc/cabina/[id]/subida/route.js`
- Test: `src/app/admin/lib/api-cabina.test.js`

**Interfaces:**
- Consumes: `esCabina`, `nuevoId`, `prefijo` (`pedido.js`); `validarCandidato`, `nuevoCandidato`, `reglaDeSubida`, `anotarTamano` (Task 2).
- Produces:
  - `rutasCabina({ almacen, blob, avisar, ahora, azar, json, cuerpo, conSesion, delPc }): object` — `api.js` la mezcla en `crearApi`.
  - `api.pcCabinaCrear(req)` → 200 `{id}` | 400 | 401 | 503.
  - `api.pcCabinaSubida(req, id)` → 200 `{token}` | 400 | 401 | 404 | 409.
  - `blob.tokenSubida(pathname: string, tamano: number, tipos: string[]): Promise<string>` en `deps.js`.

- [ ] **Step 1: Write the failing test**

`src/app/admin/lib/api-cabina.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearApi } from "./api.js";
import { almacenMemoria } from "./almacen-memoria.js";
import { firmarSesion } from "./sesion.js";

const T = Date.parse("2026-10-23T19:10:00Z");
const H = 3600e3;
function montar(reloj = { t: T }, azares = []) {
  const almacen = almacenMemoria(), borrados = [], avisos = [], tamanos = new Map(), tokens = [];
  let n = 0;
  const api = crearApi({
    almacen, env: { ADMIN_CLAVE: "secreta", ADMIN_PC_TOKEN: "pc-tok" }, ahora: () => reloj.t,
    azar: () => (azares.length ? azares.shift() : (n++).toString(16).padStart(4, "0")),
    blob: {
      tamano: async (p) => tamanos.get(p) ?? null,
      borrarPrefijo: async (pre) => void borrados.push(pre),
      enlace: async (p) => `https://firmado/${p}`,
      tokenSubida: async (pathname, tamano, tipos) => { tokens.push({ pathname, tamano, tipos }); return `tok:${pathname}`; },
    },
    avisar: async (t) => void avisos.push(t),
  });
  return { api, almacen, borrados, avisos, tamanos, tokens };
}
const pc = (cuerpo, metodo = "POST", tok = "pc-tok") => new Request("https://x/admin/api/pc/cabina", {
  method: metodo, headers: { authorization: `Bearer ${tok}` }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
});
const sesion = (cuerpo, metodo = "POST") => new Request("https://x/admin/api", {
  method: metodo, headers: { cookie: `admin_sesion=${firmarSesion("secreta", T)}` }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
});
const sinSesion = () => new Request("https://x/admin/api", { method: "POST", body: "{}" });
const COMS = () => [
  { id: "c1", usuario: "ana", texto: "jajaja", linea: "jajaja,", likes: 120, respuestas: 4, dentro: true, medio: { ext: "jpg", tipo: "imagen" } },
  { id: "c2", usuario: "beto", texto: "uy no", linea: "uy no,", likes: null, respuestas: null, dentro: true },
  { id: "c3", usuario: "caro", texto: "qué es eso", linea: "qué es eso,", likes: 3, respuestas: 0, dentro: false, medio: { ext: "mp4", tipo: "gif" } },
];
const CAND = () => ({ link: "https://www.tiktok.com/@x/video/7", comentarios: COMS(), vista: { duracion: 31.5, ancho: 480, alto: 854 } });
async function crear(m, cand = CAND()) {
  const r = await m.api.pcCabinaCrear(pc(cand));
  assert.equal(r.status, 200);
  return (await r.json()).id;
}
const SUBIDAS = { "vista.mp4": 4_000_000, "m01.jpg": 1000, "m03.mp4": 2000 };
// Crea el candidato, pide un token por archivo (de a uno, como el PC) y deja los blobs «subidos» con ese tamaño.
async function subido(m) {
  const id = await crear(m);
  for (const [n, t] of Object.entries(SUBIDAS)) {
    const r = await m.api.pcCabinaSubida(pc({ pathname: `cantados/${id}/${n}`, tamano: t }), id);
    assert.equal(r.status, 200, n);
    m.tamanos.set(`cantados/${id}/${n}`, t);
  }
  return id;
}

test("crear y subida exigen el token del PC; la cookie no sirve", async () => {
  const m = montar();
  for (const f of ["pcCabinaCrear", "pcCabinaSubida"]) {
    assert.equal((await m.api[f](sesion(CAND()), "c_x")).status, 401, f);
    assert.equal((await m.api[f](pc(CAND(), "POST", "malo"), "c_x")).status, 401, f);
    assert.equal((await m.api[f](sinSesion(), "c_x")).status, 401, f);
  }
  assert.deepEqual(await m.almacen.listar(), []);
});

test("crear: el candidato queda en subiendo, tipo cabina, con rutas para la vista y cada medio", async () => {
  const m = montar();
  const id = await crear(m);
  assert.match(id, /^c_20261023_[0-9a-f]{4}$/);
  const p = await m.almacen.leer(id);
  assert.deepEqual([p.tipo, p.origen, p.destino, p.estado, p.link, p.propuesta], ["cabina", "sondeo", "reel", "subiendo", "https://www.tiktok.com/@x/video/7", null]);
  assert.deepEqual(p.vista_previa, { pathname: `cantados/${id}/vista.mp4`, tamano: null, duracion: 31.5, ancho: 480, alto: 854 });
  assert.deepEqual(p.comentarios_cabina.map((c) => c.medio?.pathname ?? null), [`cantados/${id}/m01.jpg`, null, `cantados/${id}/m03.mp4`]);
  assert.equal(m.avisos.length, 0);
});

test("crear: datos malos = 400 y no guarda nada", async () => {
  const m = montar();
  const malos = [
    { ...CAND(), link: "http://tiktok.com/x" },
    { ...CAND(), vista: { duracion: 0, ancho: 480, alto: 854 } },
    { ...CAND(), comentarios: [] },
    { ...CAND(), comentarios: [{ ...COMS()[0], likes: "120" }] },
    { ...CAND(), comentarios: [{ ...COMS()[0], medio: { ext: "exe", tipo: "imagen" } }] },
  ];
  for (const c of malos) assert.equal((await m.api.pcCabinaCrear(pc(c))).status, 400, JSON.stringify(c).slice(0, 80));
  assert.equal((await m.api.pcCabinaCrear(new Request("https://x", { method: "POST", headers: { authorization: "Bearer pc-tok" }, body: "null" }))).status, 400);
  assert.deepEqual(await m.almacen.listar(), []);
});

test("crear: si el id ya existe prueba otro y nunca pisa un candidato", async () => {
  const m = montar({ t: T }, ["aaaa", "aaaa", "bbbb"]);
  const a = await crear(m);
  const b = await crear(m, { ...CAND(), link: "https://vt.tiktok.com/ZS9/" });
  assert.deepEqual([a, b], ["c_20261023_aaaa", "c_20261023_bbbb"]);
  assert.equal((await m.almacen.leer(a)).link, "https://www.tiktok.com/@x/video/7");
});

test("crear: sin id libre tras 5 intentos = 503", async () => {
  const m = montar({ t: T }, Array(6).fill("aaaa"));
  await crear(m);
  assert.equal((await m.api.pcCabinaCrear(pc(CAND()))).status, 503);
  assert.equal((await m.almacen.listar()).length, 1);
});

test("subida: token solo para la vista o un medio de ESE candidato, con su tope; guarda el tamaño", async () => {
  const m = montar();
  const id = await crear(m), otro = await crear(m), base = `cantados/${id}/`;
  const sube = (pathname, tamano) => m.api.pcCabinaSubida(pc({ pathname, tamano }), id);
  let r = await sube(base + "vista.mp4", 4_000_000);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { token: `tok:${base}vista.mp4` });
  r = await sube(base + "m01.jpg", 1000);
  assert.equal(r.status, 200);
  assert.deepEqual(m.tokens, [
    { pathname: base + "vista.mp4", tamano: 4_000_000, tipos: ["video/mp4"] },
    { pathname: base + "m01.jpg", tamano: 1000, tipos: ["image/*", "video/mp4"] },
  ]);
  const p = await m.almacen.leer(id);
  assert.deepEqual([p.vista_previa.tamano, p.comentarios_cabina[0].medio.tamano, p.comentarios_cabina[2].medio.tamano], [4_000_000, 1000, null]);
  const malas = [[base + "m02.jpg", 10], [`cantados/${otro}/vista.mp4`, 10], [base + "gancho.mp4", 10], [`${base}../${otro}/vista.mp4`, 10],
    [base + "vista.mp4", 50 * 1024 ** 2 + 1], [base + "m01.jpg", 20 * 1024 ** 2 + 1], [base + "m01.jpg", "1000"], [base + "m01.jpg", 0], [undefined, 10]];
  for (const [ruta, t] of malas) assert.equal((await sube(ruta, t)).status, 400, `${ruta} ${t}`);
  assert.equal(m.tokens.length, 2);
});

test("subida: 409 si ya no está subiendo; 404 si no existe o no es de la Cabina", async () => {
  const m = montar();
  const id = await crear(m);
  await m.almacen.guardar({ ...(await m.almacen.leer(id)), estado: "en_revision" });
  assert.equal((await m.api.pcCabinaSubida(pc({ pathname: `cantados/${id}/vista.mp4`, tamano: 10 }), id)).status, 409);
  assert.equal((await m.api.pcCabinaSubida(pc({ pathname: "cantados/no/vista.mp4", tamano: 10 }), "no")).status, 404);
  await m.almacen.guardar({ id: "c_link", creado: new Date(T).toISOString(), tipo: "link", estado: "subiendo", pantallazos: [] });
  assert.equal((await m.api.pcCabinaSubida(pc({ pathname: "cantados/c_link/vista.mp4", tamano: 10 }), "c_link")).status, 404);
  assert.equal(m.tokens.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/app/admin/lib/api-cabina.test.js`
Expected: FAIL con `TypeError: m.api[f] is not a function` (y `m.api.pcCabinaCrear is not a function`).

- [ ] **Step 3: Write minimal implementation**

`src/app/admin/lib/api-cabina.js`:
```js
// API de la Cabina (spec 2026-10-23-admin-cabina-design §4): el PC crea, sube y publica candidatos; Oscar los revisa con sesión.
// Contrato con el PC fijo: no cambiar rutas, cuerpos ni respuestas sin cambiar también el plan del PC.
import { esCabina, nuevoId } from "./pedido.js";
import { anotarTamano, nuevoCandidato, reglaDeSubida, validarCandidato } from "./cabina.js";

const INTENTOS_ID = 5;

export function rutasCabina({ almacen, blob, ahora, azar, json, cuerpo, delPc }) {
  const leerCandidato = async (id) => {
    const p = await almacen.leer(String(id || ""));
    return esCabina(p) ? p : null;
  };
  const noExiste = () => json({ error: "Ese candidato no existe." }, 404);

  return {
    pcCabinaCrear: delPc(async (req) => {
      const c = await cuerpo(req);
      let id = null;
      for (let k = 0; k < INTENTOS_ID && !id; k++) {
        const prueba = nuevoId(new Date(ahora()), azar());
        if (!(await almacen.leer(prueba))) id = prueba;   // nunca pisar un registro (4 hex por día)
      }
      if (!id) return json({ error: "No hubo un id libre; reintenta." }, 503);
      const d = validarCandidato(id, c);
      if (d.errores.length) return json({ error: d.errores.join(" ") }, 400);
      await almacen.guardar(nuevoCandidato(id, new Date(ahora()).toISOString(), d));
      return json({ id });
    }),
    // Token de cliente de Vercel Blob para UNA ruta del candidato; el PC sube con put(pathname, body, {access: "private", token}).
    pcCabinaSubida: delPc(async (req, id) => {
      const p = await leerCandidato(id);
      if (!p) return noExiste();
      if (p.estado !== "subiendo") return json({ error: "Ese candidato ya no está subiendo.", estado: p.estado }, 409);
      const { pathname, tamano } = await cuerpo(req);
      const regla = reglaDeSubida(p, pathname);
      if (!regla) return json({ error: "Esa ruta no es de este candidato." }, 400);
      if (!Number.isInteger(tamano) || tamano <= 0 || tamano > regla.max)
        return json({ error: `Tamaño no válido: máximo ${regla.max / 1024 ** 2} MB.` }, 400);
      const token = await blob.tokenSubida(pathname, tamano, regla.tipos);
      await almacen.guardar(anotarTamano(p, pathname, tamano));
      return json({ token });
    }),
  };
}
```

En `src/app/admin/lib/api.js`:
- Agrega el import (después de la línea 5):
```js
import { rutasCabina } from "./api-cabina.js";
```
- Cambia la línea `  return {` (línea 37, la que abre el objeto con `sesionDe,`) por:
```js
  return {
    ...rutasCabina({ almacen, blob, avisar, ahora, azar, json, cuerpo, conSesion, delPc }),
```

En `src/app/admin/lib/deps.js`:
- Debajo de `import { del, head, issueSignedToken, list, presignUrl } from "@vercel/blob";` agrega:
```js
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
```
- Dentro del objeto `blob`, después de `enlace: …,`, agrega:
```js
  // Token de subida para el PC (spec cabina §4): una sola ruta, sus tipos y su tamaño exacto como tope; vence en 1 h.
  // Usa BLOB_READ_WRITE_TOKEN (verificado en @vercel/blob 2.8.2, dist/client.js).
  tokenSubida: (pathname, tamano, tipos) => generateClientTokenFromReadWriteToken({
    pathname, maximumSizeInBytes: tamano, allowedContentTypes: tipos, allowOverwrite: true, addRandomSuffix: false,
    validUntil: Date.now() + 3600e3,
  }),
```

`src/app/admin/api/pc/cabina/route.js`:
```js
import { conApi } from "../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req) => api.pcCabinaCrear(req));
```

`src/app/admin/api/pc/cabina/[id]/subida/route.js`:
```js
import { conApi } from "../../../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req, id) => api.pcCabinaSubida(req, id));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/app/admin/lib/api-cabina.test.js && npm test && npx eslint --ignore-pattern ".claude/**" src/app/admin && npm run build`
Expected: 7 pruebas nuevas pasan; `ℹ pass 184`, `ℹ fail 0`; eslint sin salida; build OK con las rutas `/admin/api/pc/cabina` y `/admin/api/pc/cabina/[id]/subida` en la lista.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/lib/api-cabina.js src/app/admin/lib/api-cabina.test.js src/app/admin/lib/api.js src/app/admin/lib/deps.js src/app/admin/api/pc/cabina
git commit -m "feat(admin): API del PC para crear candidatos de la Cabina y pedir tokens de subida a Blob

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: API del PC — publicar, lista con vencidos y purga, bajado y entregado

**Files:**
- Modify: `src/app/admin/lib/api-cabina.js`
- Modify: `src/app/admin/lib/api.js` (`pcAprobados`, línea ~167: filtrar la Cabina)
- Modify: `src/app/admin/api/pc/cabina/route.js` (agregar `GET`)
- Create: `src/app/admin/api/pc/cabina/[id]/route.js`
- Create: `src/app/admin/api/pc/cabina/[id]/publicar/route.js`
- Create: `src/app/admin/api/pc/cabina/[id]/bajado/route.js`
- Test: `src/app/admin/lib/api-cabina.test.js` (agregar al final)

**Interfaces:**
- Consumes: `archivosDelCandidato`, `publicarCandidato`, `yaPublicado`, `paraElPc`, `vencerCandidato`, `aPurgar` (Task 2); `prefijo`, `esCabina` (`pedido.js`).
- Produces:
  - `api.pcCabinaPublicar(req, id)` → 200 `{ok, version, vence}` | 404 | 409 `{error, faltan}` | 409 `{error, estado}`.
  - `api.pcCabinaLista(req)` → 200 `{decididos, vivos}` (purga y vence antes de responder).
  - `api.pcCabinaBajado(req, id)` → 200 | 404 | 409 `{error, estado}`.
  - `api.pcCabinaEntregado(req, id)` → 200 | 404 (si el id no es de la Cabina).
  - `api.pcAprobados` ya no incluye ni vence candidatos.

- [ ] **Step 1: Write the failing test**

Agrega al final de `src/app/admin/lib/api-cabina.test.js`:
```js
async function publicado(m) {
  const id = await subido(m);
  const r = await m.api.pcCabinaPublicar(pc({}), id);
  assert.equal(r.status, 200);
  return id;
}
// Lo que Oscar deja con sesión (Task 6 lo prueba por la API): orden, línea, tramos, destino, gancho y aprobado.
async function aprobadoAMano(m, id) {
  const p = await m.almacen.leer(id);
  await m.almacen.guardar({ ...p, estado: "aprobado", tramos: [[2, 9]], destino: "story",
    gancho: { pathname: `cantados/${id}/gancho.mov`, tamano: 300, duracion: 4, ancho: 1080, alto: 1920, nombre: "g.mov" },
    revision: { ...p.revision, orden: ["c2", "c3"], fuera: ["c1"], lineas: { c3: "otra cosa," }, aprobada_en: new Date(T).toISOString() } });
}
const lista = async (m) => {
  const r = await m.api.pcCabinaLista(pc(undefined, "GET"));
  assert.equal(r.status, 200);
  return r.json();
};

test("publicar, lista, bajado y entregado exigen el token del PC", async () => {
  const m = montar();
  for (const f of ["pcCabinaPublicar", "pcCabinaLista", "pcCabinaBajado", "pcCabinaEntregado"]) {
    assert.equal((await m.api[f](sesion({}), "c_x")).status, 401, f);
    assert.equal((await m.api[f](pc({}, "POST", "malo"), "c_x")).status, 401, f);
  }
});

test("publicar: sin todos los archivos = 409 con lo que falta; sigue subiendo y no avisa", async () => {
  const m = montar();
  const id = await crear(m);
  await m.api.pcCabinaSubida(pc({ pathname: `cantados/${id}/vista.mp4`, tamano: 4_000_000 }), id);
  m.tamanos.set(`cantados/${id}/vista.mp4`, 4_000_000);
  m.tamanos.set(`cantados/${id}/m01.jpg`, 1000);   // existe en Blob pero nunca pidió token: no hay tamaño esperado
  const r = await m.api.pcCabinaPublicar(pc({}), id);
  assert.equal(r.status, 409);
  assert.deepEqual((await r.json()).faltan, [`cantados/${id}/m01.jpg`, `cantados/${id}/m03.mp4`]);
  assert.equal((await m.almacen.leer(id)).estado, "subiendo");
  assert.equal(m.avisos.length, 0);
});

test("publicar: un archivo con otro tamaño del anunciado = 409", async () => {
  const m = montar();
  const id = await subido(m);
  m.tamanos.set(`cantados/${id}/m03.mp4`, 1999);
  assert.equal((await m.api.pcCabinaPublicar(pc({}), id)).status, 409);
});

test("publicar: en_revision, vence a las 72 h, un aviso con el enlace; repetir = 200 igual sin otro aviso", async () => {
  const m = montar();
  const id = await subido(m);
  const r = await m.api.pcCabinaPublicar(pc({}), id);
  assert.deepEqual(await r.json(), { ok: true, version: 1, vence: new Date(T + 72 * H).toISOString() });
  const p = await m.almacen.leer(id);
  assert.deepEqual([p.estado, p.revision.orden, p.revision.fuera, "comentarios_cabina" in p], ["en_revision", ["c1", "c2"], ["c3"], false]);
  assert.match(m.avisos[0], new RegExp(`^🎬 Cabina: .*https://x/admin/cabina/${id}$`));
  const otra = await m.api.pcCabinaPublicar(pc({}), id);
  assert.deepEqual([otra.status, (await otra.json()).version, m.avisos.length], [200, 1, 1]);
  assert.equal((await m.api.pcCabinaPublicar(pc({}), "no_existe")).status, 404);
});

test("lista: aprobados con la lista de Oscar y el gancho firmado; vivos = todos los candidatos y nada más", async () => {
  const m = montar();
  const a = await publicado(m), b = await publicado(m), s = await crear(m);
  await aprobadoAMano(m, a);
  await m.almacen.guardar({ id: "c_link", creado: new Date(T).toISOString(), tipo: "link", estado: "listo", pantallazos: [] });
  const { decididos, vivos } = await lista(m);
  assert.deepEqual([...vivos].sort(), [a, b, s].sort());
  assert.deepEqual(decididos, [{
    id: a, estado: "aprobado", link: "https://www.tiktok.com/@x/video/7", destino: "story", titulo: null, tramos: [[2, 9]],
    orden: [{ id: "c2", linea: "uy no," }, { id: "c3", linea: "otra cosa," }], fuera: ["c1"],
    gancho: { pathname: `cantados/${a}/gancho.mov`, tamano: 300, ancho: 1080, alto: 1920, duracion: 4, url: `https://firmado/cantados/${a}/gancho.mov` },
  }]);
});

test("lista: a las 70 h (72 − 2 de holgura) sin revisar pasa a automatico con el orden propuesto; un instante antes no", async () => {
  const reloj = { t: T };
  const m = montar(reloj);
  const id = await publicado(m);
  reloj.t = T + 70 * H - 1;
  assert.deepEqual((await lista(m)).decididos, []);
  reloj.t = T + 70 * H;
  assert.deepEqual((await lista(m)).decididos.map((d) => [d.id, d.estado, d.orden, d.fuera, d.gancho]),
    [[id, "automatico", [{ id: "c1", linea: "jajaja," }, { id: "c2", linea: "uy no," }], ["c3"], null]]);
  assert.equal((await m.almacen.leer(id)).estado, "automatico");
});

test("lista: purga lo no publicado en 24 h y lo que lleva 7 días en revisión, con su Blob, antes de vencer", async () => {
  const reloj = { t: T };
  const m = montar(reloj);
  const sinPublicar = await crear(m);
  const olvidado = await publicado(m);
  reloj.t = T + 24 * H + 1000;
  assert.deepEqual((await lista(m)).vivos, [olvidado]);
  assert.equal(await m.almacen.leer(sinPublicar), null);
  reloj.t = T + 7 * 24 * H + 1000;   // el PC no consultó en una semana: se purga, no sale como story
  assert.deepEqual(await lista(m), { decididos: [], vivos: [] });
  assert.equal(await m.almacen.leer(olvidado), null);
  assert.deepEqual(m.borrados, [`cantados/${sinPublicar}/`, `cantados/${olvidado}/`]);
});

test("bajado: aprobado → en_pc, borra el Blob y deja los archivos en null; repetido = 200; sin decidir = 409", async () => {
  const m = montar();
  const id = await publicado(m);
  assert.equal((await m.api.pcCabinaBajado(pc({}), id)).status, 409);
  await aprobadoAMano(m, id);
  assert.equal((await m.api.pcCabinaBajado(pc({}), id)).status, 200);
  const p = await m.almacen.leer(id);
  assert.deepEqual([p.estado, p.gancho, p.vista_previa, p.propuesta.comentarios.every((c) => c.medio === null)], ["en_pc", null, null, true]);
  assert.deepEqual(m.borrados, [`cantados/${id}/`]);
  assert.equal((await m.api.pcCabinaBajado(pc({}), id)).status, 200);
  assert.equal(m.borrados.length, 1);
  assert.equal((await m.api.pcCabinaBajado(pc({}), "no_existe")).status, 404);
  assert.deepEqual(await lista(m), { decididos: [], vivos: [id] });
});

test("lista: vivos trae todos los candidatos que existen, en cualquier estado", async () => {
  const m = montar();
  const ids = [];
  for (const estado of ["subiendo", "en_revision", "aprobado", "automatico", "en_pc", "fallido"]) {
    const id = await publicado(m);
    await m.almacen.guardar({ ...(await m.almacen.leer(id)), estado });
    ids.push(id);
  }
  assert.deepEqual([...(await lista(m)).vivos].sort(), [...ids].sort());
});

test("bajado también para un automatico", async () => {
  const reloj = { t: T };
  const m = montar(reloj);
  const id = await publicado(m);
  reloj.t = T + 72 * H;
  await lista(m);
  assert.equal((await m.api.pcCabinaBajado(pc({}), id)).status, 200);
  assert.equal((await m.almacen.leer(id)).estado, "en_pc");
});

test("entregado: borra registro y prefijo; inexistente = 200; un pedido que no es de la Cabina = 404 y se queda", async () => {
  const m = montar();
  const id = await publicado(m);
  assert.equal((await m.api.pcCabinaEntregado(pc(undefined, "DELETE"), id)).status, 200);
  assert.deepEqual([await m.almacen.leer(id), m.borrados], [null, [`cantados/${id}/`]]);
  assert.equal((await m.api.pcCabinaEntregado(pc(undefined, "DELETE"), id)).status, 200);
  await m.almacen.guardar({ id: "c_link", creado: new Date(T).toISOString(), tipo: "link", estado: "en_pc", pantallazos: [] });
  assert.equal((await m.api.pcCabinaEntregado(pc(undefined, "DELETE"), "c_link")).status, 404);
  assert.equal((await m.almacen.leer("c_link")).estado, "en_pc");
  assert.equal(m.borrados.length, 1);
});

test("el flujo por link no ve la Cabina: pcAprobados no lista ni aprueba candidatos", async () => {
  const reloj = { t: T };
  const m = montar(reloj);
  const a = await publicado(m), b = await publicado(m);
  await aprobadoAMano(m, a);
  reloj.t = T + 71 * H;   // ya vencido (70 h): sin el filtro, pcAprobados lo «aprobaría solo» como pedido por link
  assert.deepEqual(await (await m.api.pcAprobados(pc(undefined, "GET"))).json(), []);
  assert.deepEqual([(await m.almacen.leer(a)).estado, (await m.almacen.leer(b)).estado], ["aprobado", "en_revision"]);
  reloj.t = T + 80 * H;
  assert.deepEqual(await (await m.api.pcAprobados(pc(undefined, "GET"))).json(), []);
  assert.equal((await m.almacen.leer(b)).estado, "en_revision");   // solo GET pc/cabina lo pasa a automatico
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/app/admin/lib/api-cabina.test.js`
Expected: FAIL: `TypeError: m.api.pcCabinaPublicar is not a function` y, en la última, `AssertionError` porque `pcAprobados` devuelve el candidato `a`.

- [ ] **Step 3: Write minimal implementation**

En `src/app/admin/lib/api-cabina.js`:
- Reemplaza los imports por:
```js
import { esCabina, nuevoId, prefijo } from "./pedido.js";
import { aPurgar, anotarTamano, archivosDelCandidato, nuevoCandidato, paraElPc, publicarCandidato, reglaDeSubida, validarCandidato,
  vencerCandidato, yaPublicado } from "./cabina.js";
```
- Cambia la firma de `rutasCabina` para recibir también `avisar`:
```js
export function rutasCabina({ almacen, blob, avisar, ahora, azar, json, cuerpo, delPc }) {
```
- Debajo de `const noExiste = …` agrega:
```js
  const enlaceCabina = (req, id) => `${new URL(req.url).origin}/admin/cabina/${id}`;
  const ganchoFirmado = async (g) =>
    (g ? { pathname: g.pathname, tamano: g.tamano, ancho: g.ancho ?? null, alto: g.alto ?? null, duracion: g.duracion ?? null, url: await blob.enlace(g.pathname) } : null);
```
- Dentro del objeto que devuelve, después de `pcCabinaSubida`, agrega:
```js
    pcCabinaPublicar: delPc(async (req, id) => {
      const p = await leerCandidato(id);
      if (!p) return noExiste();
      // Repetición (se perdió la respuesta): misma propuesta, sin aviso nuevo.
      if (yaPublicado(p)) return json({ ok: true, version: p.propuesta.version, vence: p.propuesta.vence });
      if (p.estado !== "subiendo") return json({ error: "Ese candidato no se puede publicar.", estado: p.estado }, 409);
      const faltan = [];
      for (const a of archivosDelCandidato(p)) if (!(a.tamano > 0) || (await blob.tamano(a.pathname)) !== a.tamano) faltan.push(a.pathname);
      if (faltan.length) return json({ error: `Faltan archivos: ${faltan.map((x) => x.split("/").pop()).join(", ")}.`, faltan }, 409);
      const nuevo = publicarCandidato(p, ahora());
      await almacen.guardar(nuevo);
      // Sin aviso por candidato: el PC manda un solo resumen por franja («🎬 Cabina: N candidatos nuevos»).
      return json({ ok: true, version: nuevo.propuesta.version, vence: nuevo.propuesta.vence });
    }),
    // Orden: purga (24 h sin publicar, 7 días en revisión) → vencer (70 h → automatico) → responder.
    // vivos = TODOS los ids de tipo cabina que siguen existiendo, en cualquier estado.
    pcCabinaLista: delPc(async () => {
      const t = ahora();
      const vivos = [], decididos = [];
      for (const leido of await almacen.listar()) {
        if (!esCabina(leido)) continue;
        if (aPurgar(leido, t)) {
          await blob.borrarPrefijo(prefijo(leido.id));
          await almacen.borrar(leido.id);
          continue;
        }
        const p = vencerCandidato(leido, t);
        if (p !== leido) await almacen.guardar(p);
        vivos.push(p.id);
        if (p.estado === "aprobado" || p.estado === "automatico") decididos.push(p);
      }
      return json({ decididos: await Promise.all(decididos.map(async (p) => ({ ...paraElPc(p), gancho: await ganchoFirmado(p.gancho) }))), vivos });
    }),
    pcCabinaBajado: delPc(async (req, id) => {
      const p = await leerCandidato(id);
      if (!p) return noExiste();
      if (p.estado === "en_pc") return json({ ok: true });   // repetido
      if (p.estado !== "aprobado" && p.estado !== "automatico") return json({ error: "Ese candidato no está decidido.", estado: p.estado }, 409);
      await blob.borrarPrefijo(prefijo(p.id));
      await almacen.guardar({ ...p, estado: "en_pc", gancho: null, vista_previa: null,
        propuesta: { ...p.propuesta, comentarios: p.propuesta.comentarios.map((c) => ({ ...c, medio: null })) } });
      return json({ ok: true });
    }),
    pcCabinaEntregado: delPc(async (req, id) => {
      const p = await almacen.leer(String(id || ""));
      if (p && !esCabina(p)) return noExiste();   // no borrar un pedido normal por error
      if (p) await blob.borrarPrefijo(prefijo(p.id));
      await almacen.borrar(String(id || ""));
      return json({ ok: true });
    }),
```

En `src/app/admin/lib/api.js`:
- En el import de `./pedido.js` agrega `esCabina` a la lista.
- En `pcAprobados`, reemplaza:
```js
      const todos = await almacen.listar();
```
por:
```js
      const todos = (await almacen.listar()).filter((p) => !esCabina(p));   // la Cabina tiene su ruta: GET /admin/api/pc/cabina
```
(Es la primera línea de `pcAprobados`; `pcPedidos` tiene una igual que **no** se toca.)

`src/app/admin/api/pc/cabina/route.js` (completo):
```js
import { conApi } from "../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req) => api.pcCabinaCrear(req));
export const GET = conApi((api, req) => api.pcCabinaLista(req));
```

`src/app/admin/api/pc/cabina/[id]/route.js`:
```js
import { conApi } from "../../../../lib/deps.js";
export const runtime = "nodejs";
export const DELETE = conApi((api, req, id) => api.pcCabinaEntregado(req, id));
```

`src/app/admin/api/pc/cabina/[id]/publicar/route.js`:
```js
import { conApi } from "../../../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req, id) => api.pcCabinaPublicar(req, id));
```

`src/app/admin/api/pc/cabina/[id]/bajado/route.js`:
```js
import { conApi } from "../../../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req, id) => api.pcCabinaBajado(req, id));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/app/admin/lib/api-cabina.test.js && npm test && npx eslint --ignore-pattern ".claude/**" src/app/admin && npm run build`
Expected: 12 pruebas nuevas pasan; `ℹ pass 196`, `ℹ fail 0` (incluida `aprobados: lista final…` de `api.test.js`); eslint sin salida; build OK.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/lib/api-cabina.js src/app/admin/lib/api-cabina.test.js src/app/admin/lib/api.js src/app/admin/api/pc/cabina
git commit -m "feat(admin): API del PC para publicar, listar (vencidos y purga), bajar y entregar candidatos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: API de sesión — medios firmados, descartar, cambios y aprobar en la Cabina

**Files:**
- Modify: `src/app/admin/lib/api-cabina.js` (nuevo `cabinaMedios`)
- Modify: `src/app/admin/lib/api.js` (`cambiar`, `cancelar`, `cerrarRevision`; imports)
- Create: `src/app/admin/api/cabina/[id]/medios/route.js`
- Test: `src/app/admin/lib/api-cabina.test.js` (agregar al final)

**Interfaces:**
- Consumes: `sePuedeCancelar`, `esCabina` (Task 3/2); `noEditable` (`revision.js`); `aprobarRevision` con `faltan` (Task 3).
- Produces:
  - `api.cabinaMedios(req, id)` → 200 `{vista: url, medios: {<idComentario>: url}}` | 401 | 404 | 409.
  - `api.cancelar` usa `sePuedeCancelar` (candidato en `en_revision` → borra prefijo y registro).
  - `api.cambiar` en un candidato: 409 si `noEditable`.
  - `api.aprobar` → 400 cuando falta gancho o tramo (`faltan`), 409 en los demás errores (igual que hoy).

- [ ] **Step 1: Write the failing test**

Agrega al final de `src/app/admin/lib/api-cabina.test.js`:
```js
test("medios: sesión obligatoria; URLs firmadas de la vista y de cada medio mientras está en revisión", async () => {
  const m = montar();
  const id = await publicado(m);
  assert.equal((await m.api.cabinaMedios(sinSesion(), id)).status, 401);
  assert.equal((await m.api.cabinaMedios(pc(undefined, "GET"), id)).status, 401);
  const r = await m.api.cabinaMedios(sesion(undefined, "GET"), id);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { vista: `https://firmado/cantados/${id}/vista.mp4`,
    medios: { c1: `https://firmado/cantados/${id}/m01.jpg`, c3: `https://firmado/cantados/${id}/m03.mp4` } });
  assert.equal((await m.api.cabinaMedios(sesion(undefined, "GET"), "no_existe")).status, 404);
  await aprobadoAMano(m, id);
  assert.equal((await m.api.cabinaMedios(sesion(undefined, "GET"), id)).status, 409);
});

test("Oscar ordena, marca tramos, cambia destino, sube el gancho y aprueba; el PC lo recibe así", async () => {
  const m = montar();
  const id = await publicado(m), base = `cantados/${id}/`;
  await m.api.autorizarSubida(sesion(), base + "gancho.mov", id);
  await assert.rejects(m.api.autorizarSubida(sesion(), base + "vista.mp4", id));
  assert.equal((await m.api.cambiar(sesion({ tramos: [[2, 9]], destino: "story" }, "PATCH"), id)).status, 200);
  assert.equal((await m.api.revision(sesion({ orden: ["c2", "c1"], fuera: ["c3"], lineas: { c1: "ja," }, version: 1 }, "PATCH"), id)).status, 200);
  const sinGancho = await m.api.aprobar(sesion({ version: 1 }), id);
  assert.equal(sinGancho.status, 400);
  assert.match((await sinGancho.json()).error, /^Falta: tu gancho\.$/);
  m.tamanos.set(base + "gancho.mov", 300);
  assert.equal((await m.api.cambiar(sesion({ gancho: { pathname: base + "gancho.mov", tamano: 300, duracion: 4, ancho: 1080, alto: 1920 } }, "PATCH"), id)).status, 200);
  assert.equal((await m.api.aprobar(sesion({ version: 1 }), id)).status, 200);
  const [d] = (await lista(m)).decididos;
  assert.deepEqual([d.estado, d.destino, d.tramos, d.orden, d.fuera, d.gancho.url],
    ["aprobado", "story", [[2, 9]], [{ id: "c2", linea: "uy no," }, { id: "c1", linea: "ja," }], ["c3"], `https://firmado/${base}gancho.mov`]);
});

test("descartar: en revisión borra Blob y registro y el PC deja de verlo; decidido = 409", async () => {
  const m = montar();
  const a = await publicado(m), b = await publicado(m);
  assert.equal((await m.api.cancelar(sesion(undefined, "DELETE"), a)).status, 200);
  assert.deepEqual([await m.almacen.leer(a), m.borrados], [null, [`cantados/${a}/`]]);
  await aprobadoAMano(m, b);
  assert.equal((await m.api.cancelar(sesion(undefined, "DELETE"), b)).status, 409);
  await m.almacen.guardar({ ...(await m.almacen.leer(b)), estado: "automatico" });
  assert.equal((await m.api.cancelar(sesion(undefined, "DELETE"), b)).status, 409);
  assert.deepEqual((await lista(m)).vivos, [b]);
});

test("vencido el plazo, la página vieja no cambia nada: 409 en tramos, revisión, aprobar y trae más", async () => {
  const reloj = { t: T };
  const m = montar(reloj);
  const id = await publicado(m);
  const antes = JSON.stringify(await m.almacen.leer(id));
  reloj.t = T + 72 * H;
  assert.equal((await m.api.cambiar(sesion({ tramos: [[0, 4]] }, "PATCH"), id)).status, 409);
  assert.equal((await m.api.revision(sesion({ orden: ["c2", "c1"], fuera: ["c3"], version: 1 }, "PATCH"), id)).status, 409);
  assert.equal((await m.api.aprobar(sesion({ version: 1 }), id)).status, 409);
  assert.equal((await m.api.traeMas(sesion({ version: 1 }), id)).status, 409);
  assert.equal(JSON.stringify(await m.almacen.leer(id)), antes);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/app/admin/lib/api-cabina.test.js`
Expected: FAIL: `TypeError: m.api.cabinaMedios is not a function`; `aprobar` sin gancho responde 409 (se espera 400); `cancelar` de un candidato en revisión responde 409 (se espera 200); el `PATCH` vencido responde 200 (se espera 409).

- [ ] **Step 3: Write minimal implementation**

En `src/app/admin/lib/api-cabina.js`:
- Cambia la firma para recibir `conSesion`:
```js
export function rutasCabina({ almacen, blob, avisar, ahora, azar, json, cuerpo, conSesion, delPc }) {
```
- Agrega al objeto (antes de `pcCabinaCrear`):
```js
    // Con sesión: URLs de lectura (12 h) de la vista previa y de las imágenes/GIF, para la página /admin/cabina/<id>.
    cabinaMedios: conSesion(async (req, id) => {
      const p = await leerCandidato(id);
      if (!p) return noExiste();
      if (p.estado !== "en_revision" || !p.vista_previa || !p.propuesta) return json({ error: "Este candidato ya no está en la Cabina." }, 409);
      const conMedio = p.propuesta.comentarios.filter((c) => c.medio?.pathname);
      const [vista, ...urls] = await Promise.all([blob.enlace(p.vista_previa.pathname), ...conMedio.map((c) => blob.enlace(c.medio.pathname))]);
      return json({ vista, medios: Object.fromEntries(conMedio.map((c, k) => [c.id, urls[k]])) });
    }),
```

En `src/app/admin/lib/api.js`:
- Import de `./pedido.js`: quita `EN_EL_PC` (deja de usarse) y agrega `sePuedeCancelar` (además de `esCabina`, que ya está desde la Task 5).
- En `cerrarRevision`, reemplaza:
```js
    const { pedido, errores } = paso(p, ahora(), version);
    if (errores.length) return json({ error: errores.join(" ") }, 409);
```
por:
```js
    const { pedido, errores, faltan } = paso(p, ahora(), version);
    if (errores.length) return json({ error: errores.join(" ") }, faltan ? 400 : 409);   // «Falta: …» no es un conflicto de versión
```
- En `cambiar`, debajo de `if (!p) return json({ error: "Ese pedido no existe." }, 404);` agrega:
```js
      if (esCabina(p)) {
        const no = noEditable(p, ahora());   // plazo vencido, aprobado o ya en el PC
        if (no) return json({ error: no }, 409);
      }
```
- En `cancelar`, reemplaza:
```js
      if (EN_EL_PC.includes(p.estado)) return json({ error: "El PC lo está haciendo; ya no se puede cancelar." }, 409);
```
por:
```js
      if (!sePuedeCancelar(p))
        return json({ error: esCabina(p) ? "Ese candidato ya está decidido: lo tiene el PC." : "El PC lo está haciendo; ya no se puede cancelar." }, 409);
```

`src/app/admin/api/cabina/[id]/medios/route.js`:
```js
import { conApi } from "../../../../lib/deps.js";
export const runtime = "nodejs";
export const GET = conApi((api, req, id) => api.cabinaMedios(req, id));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/app/admin/lib/api-cabina.test.js && npm test && npx eslint --ignore-pattern ".claude/**" src/app/admin && npm run build`
Expected: 4 pruebas nuevas pasan; `ℹ pass 200`, `ℹ fail 0` (incluidas `cancelar responde 409 mientras el PC tiene el pedido…` y `versión vieja o ausente = 409…` de `api.test.js`); eslint sin salida (sin `EN_EL_PC` sin usar); build OK.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/lib/api-cabina.js src/app/admin/lib/api-cabina.test.js src/app/admin/lib/api.js src/app/admin/api/cabina
git commit -m "feat(admin): API de sesión de la Cabina (medios firmados, descartar, cambios y aprobar con gancho)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Componente común de arrastre y lista de comentarios (Revisar)

**Files:**
- Create: `src/app/admin/cantados/useArrastre.js`
- Create: `src/app/admin/cantados/ListaComentarios.jsx`
- Modify: `src/app/admin/cantados/[id]/revisar/Revisar.jsx` (archivo completo abajo)
- Modify: `src/app/admin/admin.css` (agregar al final, dentro de `@layer components`, antes de la `}` final)

**Interfaces:**
- Consumes: `huecoEn`, `destinoDeHueco`, `velocidadBorde`, `marcaDe` (Task 1); `moverAEn` (Task 1); `lineaValida`, `ponerComa`, `editarLinea`, `meter`, `moverEn`, `quitar` (`revision.js`).
- Produces:
  - `useArrastre(n: number, onSoltar: (de, a) => void, desactivado = false): { registrar: (i) => ref, asa: (i) => props, de: number|null, hueco: number|null }`.
  - `<ListaComentarios porId rev bloqueado medios? onMover(i, paso) onMoverA(de, a) onQuitar(cid) onMeter(cid) onLinea(cid, textoConComa) onError(msg) />` — tarjetas ✓ n con usuario, ♥ likes, ↩ respuestas, texto, imagen/GIF opcional, línea grande, asa ⠿, ↑↓, ✎, ✕, y «Fuera» con ↩.
  - Clases CSS: `adm-asa`, `adm-arrastrable` (+ `levantado`, `cae-antes`, `cae-despues`), `adm-pantallazo`, `adm-medio`, `adm-orden`.

Esta tarea es de interfaz: la lógica que se puede probar sin navegador ya está en `lib/arrastre.js` (Task 1). Aquí la verificación es `npm test` + eslint + build, y el arrastre real se mira en el celular en la Task 12.

- [ ] **Step 1: Escribir el hook de arrastre**

`src/app/admin/cantados/useArrastre.js`:
```js
// Arrastre con eventos de puntero (sirve con el dedo; el drag and drop nativo no). Spec cabina §4 «Arrastre».
// Se arrastra desde un asa (⠿) con touch-action: none, así el resto de la tarjeta sigue haciendo scroll.
import { useEffect, useRef, useState } from "react";
import { destinoDeHueco, huecoEn, velocidadBorde } from "../lib/arrastre.js";

export function useArrastre(n, onSoltar, desactivado = false) {
  const items = useRef([]);      // <li> por índice
  const vivo = useRef(null);     // { de, hueco, y, raf } mientras se arrastra
  const [estado, setEstado] = useState({ de: null, hueco: null });

  const registrar = (i) => (el) => {
    items.current[i] = el;
  };
  function recalcular() {
    const v = vivo.current;
    if (!v) return;
    const centros = items.current.slice(0, n).map((el) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    });
    const hueco = huecoEn(centros, v.y);
    if (hueco !== v.hueco) {
      v.hueco = hueco;
      setEstado({ de: v.de, hueco });
    }
  }
  function cuadro() {
    const v = vivo.current;
    if (!v) return;
    const paso = velocidadBorde(v.y, window.innerHeight);   // cerca del borde la página se desplaza sola
    if (paso) {
      window.scrollBy(0, paso);
      recalcular();
    }
    v.raf = requestAnimationFrame(cuadro);
  }
  function terminar(soltar) {
    const v = vivo.current;
    if (!v) return;
    cancelAnimationFrame(v.raf);
    vivo.current = null;
    setEstado({ de: null, hueco: null });
    const a = destinoDeHueco(v.de, v.hueco);
    if (soltar && a !== v.de) onSoltar(v.de, a);
  }
  useEffect(() => () => {
    if (vivo.current) cancelAnimationFrame(vivo.current.raf);
  }, []);

  const asa = (i) => ({
    style: { touchAction: "none" },
    onPointerDown: (e) => {
      if (desactivado || vivo.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      vivo.current = { de: i, hueco: i, y: e.clientY, raf: 0 };
      vivo.current.raf = requestAnimationFrame(cuadro);
      setEstado({ de: i, hueco: i });
    },
    onPointerMove: (e) => {
      if (!vivo.current) return;
      vivo.current.y = e.clientY;
      recalcular();
    },
    onPointerUp: () => terminar(true),
    onPointerCancel: () => terminar(false),
    onLostPointerCapture: () => terminar(false),   // tras pointerup ya no hay arrastre vivo: no hace nada
  });
  return { registrar, asa, de: estado.de, hueco: estado.hueco };
}
```

- [ ] **Step 2: Escribir la lista común de comentarios**

`src/app/admin/cantados/ListaComentarios.jsx`:
```jsx
"use client";
import { useState } from "react";
import { marcaDe } from "../lib/arrastre.js";
import { lineaValida, ponerComa } from "../lib/revision.js";
import { useArrastre } from "./useArrastre.js";

// Tarjetas de comentarios en orden (✓ n, asa ⠿ para arrastrar, ↑↓, ✎, ✕) y la sección «Fuera» con ↩.
// La usan Revisar (pedidos por link) y la Cabina. `medios`: { idComentario: url firmada } (solo la Cabina).
export default function ListaComentarios({ porId, rev, bloqueado, medios = {}, onMover, onMoverA, onQuitar, onMeter, onLinea, onError }) {
  const [editando, setEditando] = useState(null); // { id, texto }
  const { registrar, asa, de, hueco } = useArrastre(rev.orden.length, onMoverA, bloqueado);
  const linea = (cid) => rev.lineas[cid] ?? porId[cid].linea;

  function guardarLinea() {
    const t = ponerComa(editando.texto);
    if (!lineaValida(t)) return onError("La línea no puede quedar vacía.");
    onLinea(editando.id, t);
    setEditando(null);
  }

  return (
    <>
      <ol className="flex flex-col gap-3">
        {rev.orden.map((cid, i) => {
          const c = porId[cid];
          return (
            <li key={cid} ref={registrar(i)}
              className={`adm-tarjeta adm-arrastrable flex flex-col gap-2 ${de === i ? "levantado" : ""} ${marcaDe(i, rev.orden.length, de, hueco)}`}>
              <div className="flex items-start gap-2">
                <span className="adm-etq numero shrink-0" aria-label="Dentro">✓ {i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="adm-sub text-xs">
                    {c.usuario}
                    {c.likes != null ? ` · ${c.likes} ♥` : ""}
                    {c.respuestas != null ? ` · ${c.respuestas} ↩` : ""}
                  </p>
                  <p className="adm-sub text-sm">{c.texto}</p>
                </div>
              </div>
              <Medio comentario={c} url={medios[cid]} />
              {editando?.id === cid ? (
                <div className="flex flex-col gap-2">
                  <textarea value={editando.texto} rows={2} className="adm-campo" disabled={bloqueado}
                    onChange={(e) => setEditando({ id: cid, texto: e.target.value })} />
                  <div className="flex gap-2">
                    <button onClick={guardarLinea} disabled={bloqueado} className="adm-btn primario flex-1">Guardar</button>
                    <button onClick={() => setEditando(null)} className="adm-btn secundario flex-1">Cancelar</button>
                  </div>
                </div>
              ) : (
                <p className="text-lg font-bold leading-snug">{linea(cid)}</p>
              )}
              <div className="flex gap-2">
                <button aria-label="Arrastrar para ordenar" disabled={bloqueado} className="adm-icono adm-asa" {...asa(i)}>⠿</button>
                <button aria-label="Subir" disabled={bloqueado} className="adm-icono" onClick={() => onMover(i, -1)}>↑</button>
                <button aria-label="Bajar" disabled={bloqueado} className="adm-icono" onClick={() => onMover(i, 1)}>↓</button>
                <button aria-label="Corregir la línea" disabled={bloqueado} className="adm-icono" onClick={() => setEditando({ id: cid, texto: linea(cid) })}>✎</button>
                <button aria-label="Quitar" disabled={bloqueado} className="adm-icono peligro ml-auto" onClick={() => onQuitar(cid)}>✕</button>
              </div>
            </li>
          );
        })}
      </ol>
      {rev.fuera.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="adm-h2">Fuera</h2>
          <ul className="flex flex-col gap-2">
            {rev.fuera.map((cid) => (
              <li key={cid} className="adm-tarjeta tenue flex items-center gap-2 p-2">
                <span className="adm-sub min-w-0 flex-1 text-sm">{linea(cid)}</span>
                <button aria-label="Meter" disabled={bloqueado} className="adm-icono" onClick={() => onMeter(cid)}>↩</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// Imagen o GIF del comentario (la Cabina), según la extensión: jpg/jpeg/png/webp/gif → <img> (el GIF llega como .gif y se anima solo);
// solo .mp4 → video mudo en bucle.
function Medio({ comentario, url }) {
  if (!comentario.medio || !url) return null;
  if (comentario.medio.pathname.endsWith(".mp4"))
    return <video src={url} muted autoPlay loop playsInline className="adm-medio" aria-label={`GIF del comentario de ${comentario.usuario}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={`Imagen del comentario de ${comentario.usuario}`} className="adm-medio" />;
}
```

- [ ] **Step 3: Estilos del arrastre, pantallazos y medios**

En `src/app/admin/admin.css`, antes de la última `}` (la que cierra `@layer components`), agrega:
```css
/* Arrastre para ordenar (useArrastre): asa, tarjeta levantada y raya de dónde cae. Sin cambiar el alto de nada mientras se arrastra. */
.adm-asa { cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; }
.adm-asa:active { cursor: grabbing; }
.adm-arrastrable { position: relative; transition: opacity 0.15s, transform 0.15s; }
.adm-arrastrable.levantado { opacity: 0.55; transform: scale(0.98); }
.adm-arrastrable.cae-antes::before,
.adm-arrastrable.cae-despues::after {
  content: ""; position: absolute; left: 10px; right: 10px; height: 4px; border-radius: 999px; background: var(--verde-claro);
}
.adm-arrastrable.cae-antes::before { top: -8px; }
.adm-arrastrable.cae-despues::after { bottom: -8px; }

/* Pantallazos y medios a lo ancho de la tarjeta, legibles en el celular */
.adm-pantallazo { width: 100%; max-height: 60vh; object-fit: contain; border-radius: 14px; background: var(--suave); }
.adm-medio { width: 100%; max-height: 40vh; object-fit: contain; border-radius: 14px; background: var(--suave); }
.adm-orden { min-width: 2ch; font-size: 1.6rem; font-weight: 800; line-height: 1; color: var(--verde); }
```

- [ ] **Step 4: Revisar usa la lista común (y gana el arrastre)**

`src/app/admin/cantados/[id]/revisar/Revisar.jsx` (completo):
```jsx
"use client";
import { useRef, useState } from "react";
import { editarLinea, meter, moverAEn, moverEn, quitar } from "../../../lib/revision.js";
import { esperarGuardado, guardarEnFila } from "../../cola.js";
import ListaComentarios from "../../ListaComentarios.jsx";

const enlace = "adm-btn secundario chico shrink-0";

export default function Revisar({ id, nombre, comentarios, version, revisionInicial, horas, abierta, aviso }) {
  const porId = Object.fromEntries(comentarios.map((c) => [c.id, c]));
  const [rev, setRev] = useState({ orden: revisionInicial.orden, fuera: revisionInicial.fuera, lineas: revisionInicial.lineas });
  const [error, setError] = useState("");
  const [recargar, setRecargar] = useState(false); // un guardado falló o la propuesta cambió: la pantalla puede diferir del servidor
  const [vieja, setVieja] = useState(false);         // la propuesta cambió (409): se bloquea todo
  const viejaRef = useRef(false);
  const [cerrada, setCerrada] = useState(abierta ? "" : aviso);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);                 // aprobar/trae-más en camino: ningún cambio puede adelantarse
  const cola = useRef(Promise.resolve());
  const ultimo = useRef(null);

  function falla(e) {
    setRecargar(true);
    if (e.status === 409) {
      viejaRef.current = true;
      setVieja(true);
    }
    setError(e.message);
  }

  // Cada cambio se guarda enseguida, en fila (el servidor recibe el estado completo).
  function guardar(nueva) {
    if (nueva === rev || viejaRef.current || enviandoRef.current) return;
    setRev(nueva);
    setError("");
    guardarEnFila(cola, ultimo, `/admin/api/cantados/${id}/revision`, { ...nueva, version }, falla);
  }
  function quitarUno(cid) {
    if (rev.orden.length <= 1) return setError("Deja al menos un comentario.");
    guardar(quitar(rev, cid));
  }
  async function cerrar(ruta, mensaje) {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setError("");
    try {
      const g = await esperarGuardado(ultimo);   // decide por el resultado del último guardado, no por una bandera
      if (viejaRef.current) throw new Error("La propuesta cambió: recarga la página.");
      if (!g.ok) throw new Error(`${g.error.message} Recarga la página.`);
      const r = await fetch(`/admin/api/cantados/${id}/${ruta}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(d.error || "No se pudo."), { status: r.status });
      setCerrada(mensaje);
    } catch (e) {
      if (e.status === 409) {
        viejaRef.current = true;
        setVieja(true);
      }
      setRecargar(true);
      setError(e.message);
    }
    enviandoRef.current = false;
    setEnviando(false);
  }
  const bloqueado = enviando || vieja;

  if (cerrada)
    return (
      <div className="adm-tarjeta mt-10 flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-xl font-bold text-[var(--verde)]">{cerrada}</p>
        <a href="/admin" className={enlace}>Volver a la lista</a>
      </div>
    );

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="flex items-center justify-between gap-2">
        <h1 className="adm-titulo min-w-0 truncate">{nombre}</h1>
        <a href="/admin" className={enlace}>Volver</a>
      </div>
      <p className="adm-aviso">
        Se aprueba solo en {horas} h (en la franja de las 2 p. m.). Cada cambio se guarda solo. Arrastra desde ⠿ o usa las flechas.
      </p>
      {error && (
        <div className="adm-error flex flex-col gap-2">
          <p>{error}</p>
          {recargar && (
            <button onClick={() => location.reload()} className="adm-btn peligro">
              Recargar
            </button>
          )}
        </div>
      )}
      <ListaComentarios porId={porId} rev={rev} bloqueado={bloqueado}
        onMover={(i, paso) => guardar(moverEn(rev, i, paso))}
        onMoverA={(de, a) => guardar(moverAEn(rev, de, a))}
        onQuitar={quitarUno}
        onMeter={(cid) => guardar(meter(rev, cid))}
        onLinea={(cid, t) => guardar(editarLinea(rev, cid, t, porId[cid].linea))}
        onError={setError} />
      <div className="adm-pie fixed inset-x-0 bottom-0 mx-auto grid max-w-[480px] grid-cols-2 gap-2 p-4">
        <button disabled={bloqueado} className="adm-btn contorno grande"
          onClick={() => confirm("¿Pedir otros comentarios en lugar de los que quitaste? Llegan en la franja de las 2 p. m.")
            && cerrar("trae-mas", "Listo: en la franja de las 2 p. m. Claude pone otros en lugar de los que quitaste y te llega el enlace otra vez.")}>
          Trae más
        </button>
        <button disabled={bloqueado} className="adm-btn primario grande"
          onClick={() => cerrar("aprobar", "Aprobado: se edita en la franja de las 2 p. m.")}>
          Aprobar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar**

Run: `npm test && npx eslint --ignore-pattern ".claude/**" src/app/admin && npm run build`
Expected: `ℹ pass 200`, `ℹ fail 0`; eslint sin salida (si `react-hooks` marca algo en `useArrastre.js`, corregirlo sin leer refs durante el render); build OK.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/cantados/useArrastre.js src/app/admin/cantados/ListaComentarios.jsx "src/app/admin/cantados/[id]/revisar/Revisar.jsx" src/app/admin/admin.css
git commit -m "feat(admin): arrastre con el dedo (asa, raya y auto-scroll) y lista común de comentarios en Revisar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Pantallazos grandes con arrastre

> **Resolución (sesión principal, 2026-10-23):** se omite todo lo de `MULTIPART_DESDE`, `usarMultipart` y el cambio de multipart en `subidas.js` (ver Global Constraints). Lo demás de esta tarea va igual.

**Files:**
- Modify: `src/app/admin/lib/editor.js` (agregar `MULTIPART_DESDE` y `usarMultipart` al final)
- Modify: `src/app/admin/lib/editor.test.js` (import, línea 3, y prueba nueva)
- Modify: `src/app/admin/cantados/subidas.js` (multipart, `moverPantA`, `leerMeta`)
- Modify: `src/app/admin/cantados/ListaPantallazos.jsx` (archivo completo abajo)
- Modify: `src/app/admin/cantados/nuevo/NuevoPedido.jsx` (líneas 7, 32-42, 111 y 361)
- Modify: `src/app/admin/cantados/[id]/pantallazos/SubirPantallazos.jsx` (líneas 15 y 68)

**Interfaces:**
- Consumes: `moverA`, `marcaDe` (Task 1); `useArrastre` y clases `adm-pantallazo`, `adm-orden` (Task 7).
- Produces:
  - `MULTIPART_DESDE = 500 * 1024 ** 2`; `usarMultipart(bytes): boolean` en `lib/editor.js`.
  - `leerMeta(url): Promise<{duracion, ancho, alto}>` exportada desde `cantados/subidas.js` (la usa la Task 10).
  - `usePantallazos(...)` devuelve además `moverPantA(de, a)`.
  - `<ListaPantallazos pants onMover onMoverA onQuitar />`.

- [ ] **Step 1: Write the failing test**

En `src/app/admin/lib/editor.test.js`, cambia la línea 3:
```js
import { ajustar, marcar, mover, extension, extSegura } from "./editor.js";
```
por:
```js
import { ajustar, marcar, mover, extension, extSegura, usarMultipart, MULTIPART_DESDE } from "./editor.js";
```
y agrega al final:
```js
test("subida en una sola pieza hasta 500 MB; multipart desde ahí (spec cabina, decisión 9)", () => {
  assert.equal(MULTIPART_DESDE, 500 * 1024 ** 2);
  assert.equal(usarMultipart(21e6), false);   // antes se partía desde 20 MB
  assert.equal(usarMultipart(MULTIPART_DESDE - 1), false);
  assert.equal(usarMultipart(MULTIPART_DESDE), true);
  assert.equal(usarMultipart(2e9), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/app/admin/lib/editor.test.js`
Expected: FAIL con `SyntaxError: The requested module './editor.js' does not provide an export named 'usarMultipart'`.

- [ ] **Step 3: Write minimal implementation**

Al final de `src/app/admin/lib/editor.js`:
```js
// Subidas del navegador: una sola pieza hasta 500 MB (spec cabina, decisión 9: cada parte de un multipart es una operación avanzada).
// Vercel Blob permite archivos de hasta 5 TB y solo *recomienda* multipart desde 100 MB (docs «Vercel Blob Pricing», 2026-09-23).
export const MULTIPART_DESDE = 500 * 1024 ** 2;
export const usarMultipart = (bytes) => Number(bytes) >= MULTIPART_DESDE;
```

En `src/app/admin/cantados/subidas.js`:
- Reemplaza los imports de las líneas 3-6 por:
```js
import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { moverA } from "../lib/arrastre.js";
import { extSegura, mover, usarMultipart } from "../lib/editor.js";
import { MAX_PANTALLAZOS } from "../lib/pedido.js";

// Lee duración y tamaño en píxeles de un video local (Nuevo video y gancho de la Cabina).
export function leerMeta(url) {
  return new Promise((ok, mal) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => ok({ duracion: v.duration, ancho: v.videoWidth, alto: v.videoHeight });
    v.onerror = () => mal(new Error("No pude leer ese video. Prueba con otro."));
    v.src = url;
  });
}
```
- Reemplaza `multipart: file.size > 20e6,` por:
```js
        multipart: usarMultipart(file.size),
```
- En `usePantallazos`, debajo de `function moverPant(i, paso) { … }` agrega:
```js
  function moverPantA(de, a) {
    const lista = moverA(pantsRef.current, de, a);
    if (lista === pantsRef.current) return;
    fijarPants(lista);
    guardar(lista);
  }
```
y cambia `return { pants, elegir, moverPant, quitarPant };` por:
```js
  return { pants, elegir, moverPant, moverPantA, quitarPant };
```

`src/app/admin/cantados/ListaPantallazos.jsx` (completo):
```jsx
"use client";
import { marcaDe } from "../lib/arrastre.js";
import { useArrastre } from "./useArrastre.js";

// Pantallazos a lo ancho para poder leerlos y ordenarlos (spec cabina, decisión 10): número grande, nombre pequeño debajo.
export default function ListaPantallazos({ pants, onMover, onMoverA, onQuitar }) {
  const { registrar, asa, de, hueco } = useArrastre(pants.length, onMoverA);
  return (
    <ol className="flex flex-col gap-3">
      {pants.map((p, i) => (
        <li key={p.pathname} ref={registrar(i)}
          className={`adm-tarjeta adm-arrastrable flex flex-col gap-2 p-2 ${de === i ? "levantado" : ""} ${marcaDe(i, pants.length, de, hueco)}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt={`Pantallazo ${i + 1}`} className="adm-pantallazo" />
          <div className="flex items-center gap-2">
            <button aria-label="Arrastrar para ordenar" className="adm-icono adm-asa" {...asa(i)}>⠿</button>
            <span className="adm-orden">{i + 1}</span>
            <span className="adm-sub min-w-0 flex-1 truncate text-xs">{p.nombre}</span>
            <button aria-label="Subir" className="adm-icono" onClick={() => onMover(i, -1)}>↑</button>
            <button aria-label="Bajar" className="adm-icono" onClick={() => onMover(i, 1)}>↓</button>
            <button aria-label="Quitar" className="adm-icono peligro" onClick={() => onQuitar(i)}>✕</button>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

En `src/app/admin/cantados/nuevo/NuevoPedido.jsx`:
- Línea 7: `import { subirArchivo, usePantallazos, useTrabajos } from "../subidas.js";` → `import { leerMeta, subirArchivo, usePantallazos, useTrabajos } from "../subidas.js";`
- Borra la función local `leerMeta` (líneas 32-42, con su comentario «Lee duración y tamaño en píxeles de un video local.»).
- Línea 111: `const { pants, elegir: elegirPants, moverPant, quitarPant } = usePantallazos({` → `const { pants, elegir: elegirPants, moverPant, moverPantA, quitarPant } = usePantallazos({`
- Línea 361: `<ListaPantallazos pants={pants} onMover={moverPant} onQuitar={quitarPant} />` → `<ListaPantallazos pants={pants} onMover={moverPant} onMoverA={moverPantA} onQuitar={quitarPant} />`

En `src/app/admin/cantados/[id]/pantallazos/SubirPantallazos.jsx`:
- Línea 15: `const { pants, elegir, moverPant, quitarPant } = usePantallazos({` → `const { pants, elegir, moverPant, moverPantA, quitarPant } = usePantallazos({`
- Línea 68: `<ListaPantallazos pants={pants} onMover={moverPant} onQuitar={quitarPant} />` → `<ListaPantallazos pants={pants} onMover={moverPant} onMoverA={moverPantA} onQuitar={quitarPant} />`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test && npx eslint --ignore-pattern ".claude/**" src/app/admin && npm run build`
Expected: `ℹ pass 201`, `ℹ fail 0`; eslint sin salida; build OK.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/lib/editor.js src/app/admin/lib/editor.test.js src/app/admin/cantados/subidas.js src/app/admin/cantados/ListaPantallazos.jsx src/app/admin/cantados/nuevo/NuevoPedido.jsx "src/app/admin/cantados/[id]/pantallazos/SubirPantallazos.jsx"
git commit -m "feat(admin): pantallazos grandes con arrastre y ganchos en una sola pieza hasta 500 MB

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Bloque «Cabina (N)» en la lista

**Files:**
- Modify: `src/app/admin/page.jsx` (archivo completo abajo)
- Modify: `src/app/admin/ListaPedidos.jsx` (firma y bloque nuevo)

**Interfaces:**
- Consumes: `separarCabina(lista, ahoraMs)`, `textoDias(dias)` (Task 2).
- Produces: `<ListaPedidos pedidos cabina={[{id, nombre, comentarios, dias}]} error />`; enlaces a `/admin/cabina/<id>`.

La separación (solo candidatos `en_revision`, ordenados por vencimiento, y pedidos normales sin candidatos) ya está probada en `cabina.test.js` (Task 2, `días que faltan, texto de la lista y separación…`). Aquí se conecta.

- [ ] **Step 1: Leer la Cabina en la página**

`src/app/admin/page.jsx` (completo):
```jsx
import { cookies } from "next/headers";
import { almacenRedis } from "./lib/almacen.js";
import { urlRedisDirecta } from "../api/lead/config.js";
import { separarCabina } from "./lib/cabina.js";
import { destinoDe, nombreVisible, ordenarLista, tipoDe } from "./lib/pedido.js";
import { COOKIE, sesionValida } from "./lib/sesion.js";
import ListaPedidos from "./ListaPedidos.jsx";

const ahora = () => Date.now();
export const dynamic = "force-dynamic";

export default async function Admin() {
  // El layout ya muestra la entrada sin sesión, pero la página se ejecuta igual: no leer Redis sin sesión.
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!sesionValida(valor, process.env.ADMIN_CLAVE, ahora())) return null;

  let pedidos = [];
  let cabina = [];
  let error = "";
  let almacen;
  try {
    const url = urlRedisDirecta(process.env);
    if (!url) throw new Error("sin url");
    almacen = await almacenRedis(url);
    const separados = separarCabina(await almacen.listar(), ahora());   // los candidatos no salen entre los pedidos
    cabina = separados.cabina;
    pedidos = ordenarLista(separados.pedidos).map((p) => ({
      id: p.id, nombre: nombreVisible(p), creado: p.creado, estado: p.estado, motivo: p.motivo ?? null,
      tipo: tipoDe(p), listos: Boolean(p.pantallazos_listos), story: destinoDe(p) === "story",
    }));
  } catch {
    error = "No se pudo leer la lista de pedidos (Redis no responde).";
  } finally {
    await almacen?.cerrar();
  }
  return <ListaPedidos pedidos={pedidos} cabina={cabina} error={error} />;
}
```

- [ ] **Step 2: Mostrar el bloque**

En `src/app/admin/ListaPedidos.jsx`:
- Línea 3: `import { EN_EL_PC, tonoEstado } from "./lib/pedido.js";` → 
```js
import { textoDias } from "./lib/cabina.js";
import { EN_EL_PC, tonoEstado } from "./lib/pedido.js";
```
- Línea 19: `export default function ListaPedidos({ pedidos, error }) {` → `export default function ListaPedidos({ pedidos, cabina = [], error }) {`
- Justo después de `{msg && <p className="adm-error">{msg}</p>}` (línea 48) agrega:
```jsx
      {cabina.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="titulo-cabina">
          <h2 id="titulo-cabina" className="adm-h2">Cabina ({cabina.length})</h2>
          <ul className="flex flex-col gap-2">
            {cabina.map((c) => (
              <li key={c.id}>
                <a href={`/admin/cabina/${c.id}`} className="adm-tarjeta flex items-center gap-3 text-inherit no-underline">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.nombre}</p>
                    <p className="adm-sub text-xs">{c.comentarios} comentarios</p>
                  </div>
                  <span className={`adm-etq shrink-0 ${c.dias <= 1 ? "espera" : "camino"}`}>{textoDias(c.dias)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
```

- [ ] **Step 3: Verificar**

Run: `npm test && npx eslint --ignore-pattern ".claude/**" src/app/admin && npm run build`
Expected: `ℹ pass 201`, `ℹ fail 0`; eslint sin salida; build OK.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.jsx src/app/admin/ListaPedidos.jsx
git commit -m "feat(admin): bloque «Cabina (N)» arriba de los pedidos, con los días que faltan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Página del candidato `/admin/cabina/<id>`

**Files:**
- Create: `src/app/admin/cabina/[id]/page.jsx`
- Create: `src/app/admin/cabina/[id]/Cabina.jsx`
- Test: `src/app/admin/cantados/cola.test.js` (agregar al final)

**Interfaces:**
- Consumes: `pedidoDeSesion(id, ahoraMs)` (`cantados/[id]/pedidoDeSesion.js`); `esCabina`; `diasRestantes`, `nombreCabina`, `textoDias` (Task 2); `noEditable`, `editarLinea`, `meter`, `moverAEn`, `moverEn`, `quitar` (`revision.js`); `ListaComentarios` (Task 7); `EditorTramos`; `Barra`; `leerMeta`, `subirArchivo`, `useTrabajos` (Task 8 / existentes); `guardarEnFila`, `esperarGuardado` (`cola.js`); rutas `GET /admin/api/cabina/<id>/medios`, `PATCH /admin/api/cantados/<id>`, `PATCH /admin/api/cantados/<id>/revision`, `POST /admin/api/cantados/<id>/aprobar`, `DELETE /admin/api/cantados/<id>`, `POST /admin/api/cantados/subir` (Tasks 3 y 6).
- Produces: la página. `Cabina({ id, nombre, link, comentarios, version, revisionInicial, vista, tramosIniciales, destinoInicial, ganchoInicial, dias })`.

- [ ] **Step 1: Prueba que fija la fila única de guardado**

Agrega al final de `src/app/admin/cantados/cola.test.js`:
```js
test("dos rutas distintas en la misma fila no se pisan: la segunda espera a la primera", async () => {
  const { cola, ultimo } = refs();
  let enVuelo = 0, maximo = 0;
  const urls = [];
  globalThis.fetch = async (url) => {
    enVuelo += 1;
    maximo = Math.max(maximo, enVuelo);
    urls.push(url);
    await new Promise((s) => setTimeout(s, 5));
    enVuelo -= 1;
    return { ok: true, status: 200, json: async () => ({}) };
  };
  guardarEnFila(cola, ultimo, "/admin/api/cantados/c/revision", { orden: ["a"] });
  guardarEnFila(cola, ultimo, "/admin/api/cantados/c", { tramos: [[0, 4]] });
  assert.deepEqual(await esperarGuardado(ultimo), { ok: true });
  assert.equal(maximo, 1);
  assert.deepEqual(urls, ["/admin/api/cantados/c/revision", "/admin/api/cantados/c"]);
});
```

- [ ] **Step 2: Correr la prueba**

Run: `node --test src/app/admin/cantados/cola.test.js`
Expected: PASA desde ya (la fila de `cola.js` es genérica). Fija el contrato del que depende la página: una sola `cola` para `/revision` y `/<id>`. Si alguien separa las filas en `Cabina.jsx`, la revisión de la tarea debe rechazarlo.

- [ ] **Step 3: La página del servidor**

`src/app/admin/cabina/[id]/page.jsx`:
```jsx
import { diasRestantes, nombreCabina } from "../../lib/cabina.js";
import { esCabina } from "../../lib/pedido.js";
import { noEditable } from "../../lib/revision.js";
import { pedidoDeSesion } from "../../cantados/[id]/pedidoDeSesion.js";
import Cabina from "./Cabina.jsx";

const ahora = () => Date.now();
export const dynamic = "force-dynamic";

export default async function PaginaCabina({ params }) {
  const { id } = await params;
  const t = ahora();
  const { dentro, pedido: p, error } = await pedidoDeSesion(id, t);   // verifica la sesión antes de leer Redis
  if (!dentro) return null;
  if (error) return <p className="adm-error">{error}</p>;
  const aviso = !esCabina(p) || !p.propuesta || !p.vista_previa
    ? "Este candidato ya no está en la Cabina."
    : p.estado === "aprobado" ? "Ya está aprobado: sale en la franja de las 2 p. m." : noEditable(p, t);
  if (aviso)
    return (
      <div className="adm-tarjeta mt-10 flex flex-col items-center gap-4 p-6 text-center">
        <p>{aviso}</p>
        <a href="/admin" className="adm-btn secundario">Volver a la lista</a>
      </div>
    );
  return (
    <Cabina id={p.id} nombre={nombreCabina(p)} link={p.link} comentarios={p.propuesta.comentarios} version={p.propuesta.version}
      revisionInicial={{ orden: p.revision.orden, fuera: p.revision.fuera, lineas: p.revision.lineas ?? {} }}
      vista={{ duracion: p.vista_previa.duracion, ancho: p.vista_previa.ancho, alto: p.vista_previa.alto }}
      tramosIniciales={p.tramos ?? []} destinoInicial={p.destino === "story" ? "story" : "reel"}
      ganchoInicial={p.gancho ? { nombre: p.gancho.nombre || "tu gancho" } : null} dias={diasRestantes(p, t)} />
  );
}
```

- [ ] **Step 4: El componente de la página**

`src/app/admin/cabina/[id]/Cabina.jsx`:
```jsx
"use client";
import { useEffect, useRef, useState } from "react";
import Barra from "../../cantados/Barra.jsx";
import ListaComentarios from "../../cantados/ListaComentarios.jsx";
import EditorTramos from "../../cantados/nuevo/EditorTramos.jsx";
import { esperarGuardado, guardarEnFila } from "../../cantados/cola.js";
import { leerMeta, subirArchivo, useTrabajos } from "../../cantados/subidas.js";
import { textoDias } from "../../lib/cabina.js";
import { extSegura } from "../../lib/editor.js";
import { editarLinea, meter, moverAEn, moverEn, quitar } from "../../lib/revision.js";

const chico = "adm-btn secundario chico shrink-0";
const Seccion = ({ titulo, children }) => (
  <section className="adm-tarjeta flex flex-col gap-3">
    <h2 className="adm-h2">{titulo}</h2>
    {children}
  </section>
);

export default function Cabina({ id, nombre, link, comentarios, version, revisionInicial, vista, tramosIniciales, destinoInicial, ganchoInicial, dias }) {
  const porId = Object.fromEntries(comentarios.map((c) => [c.id, c]));
  const [rev, setRev] = useState(revisionInicial);
  const [tramos, setTramos] = useState(tramosIniciales);
  const [destino, setDestino] = useState(destinoInicial);
  const [gancho, setGancho] = useState(ganchoInicial);
  const [avisoGancho, setAvisoGancho] = useState("");
  const [urls, setUrls] = useState({ vista: null, medios: {} });
  const [error, setError] = useState("");
  const [recargar, setRecargar] = useState(false);
  const [vieja, setVieja] = useState(false);        // 409: venció, ya se decidió o cambió en otro lado; se bloquea todo
  const viejaRef = useRef(false);
  const [cerrada, setCerrada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const { trabajos, fijarTrabajo, conOcupado, subiendo } = useTrabajos();
  const videoRef = useRef(null);
  const cola = useRef(Promise.resolve());   // UNA sola fila para /revision y /<id>: el servidor reescribe el registro entero
  const ultimo = useRef(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/admin/api/cabina/${id}/medios`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "No se pudo cargar el video.");
        return d;
      })
      .then((d) => vivo && setUrls({ vista: d.vista, medios: d.medios || {} }))
      .catch((e) => vivo && setError(e.message));
    return () => {
      vivo = false;
    };
  }, [id]);

  function falla(e) {
    setRecargar(true);
    if (e.status === 409) {
      viejaRef.current = true;
      setVieja(true);
    }
    setError(e.message);
  }
  const bloqueado = enviando || vieja;
  const puedeGuardar = () => !viejaRef.current && !enviandoRef.current;

  function guardarRev(nueva) {
    if (nueva === rev || !puedeGuardar()) return;
    setRev(nueva);
    setError("");
    guardarEnFila(cola, ultimo, `/admin/api/cantados/${id}/revision`, { ...nueva, version }, falla);
  }
  function guardarCampos(cuerpo) {
    if (!puedeGuardar()) return Promise.resolve({ ok: false });
    setError("");
    return guardarEnFila(cola, ultimo, `/admin/api/cantados/${id}`, cuerpo, falla);
  }
  function quitarUno(cid) {
    if (rev.orden.length <= 1) return setError("Deja al menos un comentario.");
    guardarRev(quitar(rev, cid));
  }
  function cambioTramos(nuevos) {
    setTramos(nuevos);
    if (nuevos.length) guardarCampos({ tramos: nuevos });   // sin tramos no se guarda: «Aprobar» queda pidiendo uno
  }
  function elegirDestino(d) {
    if (d === destino || bloqueado) return;
    setDestino(d);
    guardarCampos({ destino: d });
  }
  async function elegirGancho(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || bloqueado) return;
    setError("");
    setAvisoGancho("");
    setGancho(null);
    await conOcupado(async () => {
      const url = URL.createObjectURL(file);
      let meta;
      try {
        meta = await leerMeta(url);
      } catch (err) {
        return setError(err.message);
      } finally {
        URL.revokeObjectURL(url);
      }
      if (Math.min(meta.ancho, meta.alto) < 1080) setAvisoGancho("Tu gancho no está en 1080p");
      try {
        const f = await subirArchivo(id, "gancho", file, `gancho${extSegura(file.name, "video")}`, fijarTrabajo);
        const g = await guardarCampos({ gancho: { ...f, duracion: meta.duracion, ancho: meta.ancho, alto: meta.alto } });
        if (g.ok) setGancho({ nombre: file.name });
      } catch (err) {
        setError(err.message);
      }
    });
  }

  const faltan = [!gancho && "tu gancho", tramos.length === 0 && "marcar al menos un tramo"].filter(Boolean);

  async function aprobar() {
    if (enviandoRef.current || faltan.length || subiendo) return;
    enviandoRef.current = true;
    setEnviando(true);
    setError("");
    try {
      const g = await esperarGuardado(ultimo);   // decide por el último guardado, no por una bandera
      if (viejaRef.current) throw new Error("El candidato cambió: recarga la página.");
      if (!g.ok) throw new Error(`${g.error?.message || "No se pudo guardar."} Recarga la página.`);
      const r = await fetch(`/admin/api/cantados/${id}/aprobar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(d.error || "No se pudo aprobar."), { status: r.status });
      setCerrada("Aprobado: sale en la franja de las 2 p. m.");
    } catch (e) {
      if (e.status === 409) {
        viejaRef.current = true;
        setVieja(true);
      }
      setRecargar(true);
      setError(e.message);
    }
    enviandoRef.current = false;
    setEnviando(false);
  }
  async function descartar() {
    if (enviandoRef.current || subiendo || !confirm("¿Descartar este candidato? Se borra del todo.")) return;
    enviandoRef.current = true;
    setEnviando(true);
    setError("");
    try {
      await esperarGuardado(ultimo);   // que ningún PATCH en vuelo reviva el registro después de borrarlo
      const r = await fetch(`/admin/api/cantados/${id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo descartar.");
      setCerrada("Descartado.");
    } catch (e) {
      setError(e.message);
    }
    enviandoRef.current = false;
    setEnviando(false);
  }

  if (cerrada)
    return (
      <div className="adm-tarjeta mt-10 flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-xl font-bold text-[var(--verde)]">{cerrada}</p>
        <a href="/admin" className={chico}>Volver a la lista</a>
      </div>
    );

  return (
    <div className="flex flex-col gap-4 pb-36">
      <div className="flex items-center justify-between gap-2">
        <h1 className="adm-titulo">Cabina</h1>
        <a href="/admin" className={chico}>Volver</a>
      </div>
      <a href={link} target="_blank" rel="noreferrer" className="adm-sub truncate text-sm underline">{nombre}</a>
      <p className="adm-aviso">
        Si no lo apruebas, {textoDias(dias)} como story corta. Cada cambio se guarda solo. Arrastra desde ⠿ o usa las flechas.
      </p>
      {error && (
        <div className="adm-error flex flex-col gap-2">
          <p>{error}</p>
          {recargar && (
            <button onClick={() => location.reload()} className="adm-btn peligro">
              Recargar
            </button>
          )}
        </div>
      )}

      <Seccion titulo="1. Video y tramos">
        {urls.vista ? (
          <video ref={videoRef} src={urls.vista} controls playsInline preload="metadata" className="adm-video" />
        ) : (
          <p className="adm-sub text-sm">Cargando el video…</p>
        )}
        <EditorTramos duracion={vista.duracion} tramos={tramos} onCambio={cambioTramos} videoRef={videoRef} />
      </Seccion>

      <Seccion titulo="2. Comentarios">
        <ListaComentarios porId={porId} rev={rev} bloqueado={bloqueado} medios={urls.medios}
          onMover={(i, paso) => guardarRev(moverEn(rev, i, paso))}
          onMoverA={(de, a) => guardarRev(moverAEn(rev, de, a))}
          onQuitar={quitarUno}
          onMeter={(cid) => guardarRev(meter(rev, cid))}
          onLinea={(cid, t) => guardarRev(editarLinea(rev, cid, t, porId[cid].linea))}
          onError={setError} />
      </Seccion>

      <Seccion titulo="3. Tu gancho">
        <input type="file" accept="video/*" onChange={elegirGancho} disabled={bloqueado || subiendo} />
        <Barra t={trabajos.gancho} />
        {avisoGancho && <p className="adm-aviso">{avisoGancho}</p>}
        {gancho && <p className="text-sm font-semibold text-[var(--verde)]">Subido: {gancho.nombre}</p>}
      </Seccion>

      <Seccion titulo="4. Destino">
        <div className="grid grid-cols-2 gap-2">
          {[["reel", "Reel"], ["story", "Story"]].map(([valor, texto]) => (
            <button key={valor} disabled={bloqueado} onClick={() => elegirDestino(valor)}
              className={`adm-opcion p-3 text-center ${destino === valor ? "on font-bold" : ""}`}>
              {texto}
            </button>
          ))}
        </div>
      </Seccion>

      <div className="adm-pie fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col gap-2 p-4">
        {faltan.length > 0 && !bloqueado && <p className="adm-sub text-center text-sm">Falta: {faltan.join(", ")}.</p>}
        <div className="grid grid-cols-2 gap-2">
          <button disabled={bloqueado || subiendo} className="adm-btn peligro grande" onClick={descartar}>
            Descartar
          </button>
          <button disabled={bloqueado || subiendo || faltan.length > 0} className="adm-btn primario grande" onClick={aprobar}>
            {enviando ? "Guardando…" : subiendo ? "Subiendo…" : "Aprobar"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar**

Run: `npm test && npx eslint --ignore-pattern ".claude/**" src/app/admin && npm run build`
Expected: `ℹ pass 202`, `ℹ fail 0`; eslint sin salida; build OK con la ruta `/admin/cabina/[id]`.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/cabina src/app/admin/cantados/cola.test.js
git commit -m "feat(admin): página del candidato de la Cabina (video, tramos, comentarios con arrastre, gancho, destino, aprobar y descartar)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Documentación (`docs/admin.md`) y verificación completa

**Files:**
- Modify: `docs/admin.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: la sección «Cabina», las filas nuevas de la tabla de API, los límites y lo no probado.

- [ ] **Step 1: Sección nueva**

En `docs/admin.md`, antes de `## Cómo se usa desde el celular`, agrega:
```markdown
## Cabina (2026-10-23, spec `docs/superpowers/specs/2026-10-23-admin-cabina-design.md`)

Los candidatos que saca el sondeo del PC de los links de TikTok se revisan aquí, no en la Cabina local (`herramientas/cabina.py`, que queda de respaldo hasta la primera corrida real buena). **Oscar solo graba el gancho y, si quiere, cambia el orden; Claude hace el resto.**

1. **Franja de las 2 p. m. (PC).** Por cada candidato: `POST /admin/api/pc/cabina` (texto: link, comentarios con likes, respuestas y si traen imagen/GIF, y las medidas de la vista previa) → `{id}`. Luego, **de a un archivo**, `POST …/<id>/subida` con `{pathname, tamano}` → `{token}` y sube con `put(pathname, archivo, {access: "private", token})` de `@vercel/blob/client`: la vista previa (`cantados/<id>/vista.mp4`, ≤ 50 MB) y cada medio (`cantados/<id>/mNN.<ext>`, NN = posición del comentario, ≤ 20 MB). Al final `POST …/<id>/publicar`: la web comprueba cada archivo contra el tamaño anunciado y lo pasa a `en_revision` con `vence` = publicada + **72 h** (se da por vencido 2 h antes, a las 70 h); llega «🎬 Cabina: candidato nuevo (N comentarios): <enlace>».
2. **Lista.** Arriba de los pedidos sale **«Cabina (N)»** con cada candidato en revisión (el que vence antes primero), sus comentarios y «sale solo en N días». Los pedidos normales no muestran candidatos.
3. **Candidato (`/admin/cabina/<id>`).** Video de la vista previa (enlace firmado de 12 h que pide la página a `GET /admin/api/cabina/<id>/medios`) con el editor de **hasta 3 tramos**; comentarios con usuario, ♥ likes, ↩ respuestas, texto, imagen o GIF y la línea grande; ⠿ arrastrar, ↑↓, ✎ corregir, ✕ sacar, «Fuera» con ↩; subir **tu gancho** (barra y «Reintentar»; aviso si no es 1080p); destino **Reel | Story**. **Aprobar** se activa con gancho y al menos un tramo y espera el último guardado. **Descartar** pide confirmación y borra el candidato de Blob y Redis al instante.
4. **Sin revisar en el plazo.** Se da por vencido a `vence − 2 h` (70 h; la misma holgura `HOLGURA_FRANJA_H` de los pedidos por link), así la franja de las 2 p. m. del **día 3** lo recoge. La consulta del PC (`GET /admin/api/pc/cabina`) lo pasa a `automatico` y lo recibe con el **orden propuesto** de los comentarios dentro (story corta, spec §6). Uno publicado después de las 4 p. m. del día 0 vence después de la franja del día 3 y sale en la del día 4.
5. **Franja siguiente (PC).** `GET /admin/api/pc/cabina` → `{decididos, vivos}` (`vivos` = todos los candidatos que existen, en cualquier estado); baja el gancho firmado, `POST …/<id>/bajado` (la web borra el prefijo en Blob y deja `en_pc`) y, al entregar, `DELETE /admin/api/pc/cabina/<id>`. Los ids que el PC tenía y ya no están en `vivos` son descartados.
6. **Purga** (en cada `GET /admin/api/pc/cabina`, **antes** de vencer): sin publicar a las 24 h y en revisión más de 7 días → se borran prefijo y registro (así, si el PC no consulta en una semana, no salen todos de golpe como stories).

**Estados:** `subiendo` (el PC está subiendo; no se ve en la lista) → `en_revision` → `aprobado` (Oscar) | `automatico` (vencido a las 70 h) → `en_pc` (bajado) → borrado (entregado). Descartar = borrar (solo en `subiendo` o `en_revision`; decidido → 409).

**Redis:** el candidato es un pedido con `tipo: "cabina"`, `origen: "sondeo"`, `destino`, `link`, `vista_previa: {pathname, tamano, duracion, ancho, alto}`, `propuesta` y `revision` como los pedidos por link (cada comentario con `likes`, `respuestas` y `medio: {pathname, tipo, tamano}`), `tramos` (contra la duración de la vista previa) y `gancho`. Mientras está `subiendo`, los comentarios viven en `comentarios_cabina`.

**PATCH de un candidato** (`PATCH /admin/api/cantados/<id>`): solo `tramos`, `destino` y `gancho`, y solo en `en_revision` (vencido → 409). El orden y las líneas van por `PATCH …/revision` como en Revisar. La página guarda todo en **una sola fila** porque el servidor reescribe el registro entero.

**El flujo por link no ve la Cabina:** `GET /admin/api/pc/aprobados` no lista ni aprueba candidatos.

**Arrastre (Cabina, Revisar y pantallazos).** Con eventos de puntero desde el asa ⠿ (sirve con el dedo), raya verde donde cae y desplazamiento solo cerca de los bordes; se guarda igual que con las flechas. **Pantallazos** (Nuevo video y Subir pantallazos): cada uno a lo ancho, hasta 60 % del alto de la pantalla, número grande y nombre pequeño.
```

- [ ] **Step 2: Tabla de API, límites y lo no probado**

En la tabla de `## API`, agrega al final:
```markdown
| `POST /admin/api/pc/cabina` | Solo PC | Crea un candidato `subiendo` `{link, comentarios, vista}` → `{id}`; 400 si los datos no sirven; 503 si no hay id libre |
| `POST /admin/api/pc/cabina/<id>/subida` | Solo PC | `{pathname, tamano}` → `{token}` de subida de 1 h para la vista (≤ 50 MB, `video/mp4`) o un medio (≤ 20 MB, `image/*`/`video/mp4`) de ese candidato; guarda el tamaño anunciado. 400 ruta ajena o tamaño malo; 409 si no está `subiendo` |
| `POST /admin/api/pc/cabina/<id>/publicar` | Solo PC | Comprueba los archivos y pasa a `en_revision` (`vence` = +72 h; vencido 2 h antes) con aviso → `{ok, version, vence}`; repetido → 200 igual; faltan → 409 `{error, faltan}` |
| `GET /admin/api/pc/cabina` | Solo PC | Purga, pasa a `automatico` los vencidos y responde `{decididos, vivos}` con el gancho firmado (12 h) |
| `POST /admin/api/pc/cabina/<id>/bajado` | Solo PC | `aprobado`/`automatico` → `en_pc`, borra el prefijo en Blob; repetido → 200; sin decidir → 409 |
| `DELETE /admin/api/pc/cabina/<id>` | Solo PC | Entregado: borra prefijo y registro; un id que no es de la Cabina → 404 sin borrar |
| `GET /admin/api/cabina/<id>/medios` | Sesión | `{vista, medios: {idComentario: url}}` firmadas 12 h, solo en `en_revision` |
```
y cambia la fila de `DELETE /admin/api/cantados/<id>` para que diga: «Cancela (o descarta un candidato de la Cabina en `subiendo`/`en_revision`): borra el prefijo en Blob y el registro (no en `en_pc`, `en_revision` ni `aprobado` de un pedido normal, ni en un candidato decidido); si no existe responde ok».

En `## Límites`, cambia `- Subida: **2 GB por archivo** (`maximumSizeInBytes`), tipos `video/*` e `image/*`.` por:
```markdown
- Subida: **2 GB por archivo** (`maximumSizeInBytes`), tipos `video/*` e `image/*`. En **una sola pieza hasta 500 MB**; desde ahí, multipart (cada parte es una operación avanzada de Blob).
- Cabina: vista previa ≤ 50 MB, cada imagen/GIF ≤ 20 MB, hasta 80 comentarios (`likes` entero o `null`, `respuestas` entero, 0 si no se sabe; GIF como `.gif`), vence a las 70 h (72 − 2), purga a las 24 h (sin publicar) y a los 7 días (en revisión).
```

En `## Lo que NO se ha probado`, agrega:
```markdown
- **Cabina:** token de subida real del PC con `put` de `@vercel/blob/client`, video firmado reproduciéndose y buscando (Range) en el celular, GIF `.gif` animado y medios `.mp4` en bucle, arrastre real con el dedo (iPhone y Android), un gancho de 100–500 MB en una sola pieza por datos móviles, y un candidato de punta a punta (Task 12 del plan).
```

En `## Lo verificado de @vercel/blob 2.8.2`, agrega:
```markdown
- `generateClientTokenFromReadWriteToken({pathname, maximumSizeInBytes, allowedContentTypes, allowOverwrite, addRandomSuffix, validUntil})` exportada desde `@vercel/blob/client`; sin `token` usa `BLOB_READ_WRITE_TOKEN` (dist/client.js). Tamaño máximo de un blob: 5 TB; multipart solo recomendado desde 100 MB (docs «Vercel Blob Pricing», actualizadas 2026-09-23).
```
Y, después del Step 3, una línea más en esa misma sección con la fecha del día y los números que salieron de verdad, con esta forma: «Cabina (AAAA-MM-DD): `npm test` 202 pasan, 0 fallan; `npx eslint --ignore-pattern ".claude/**" src/app/admin` sin salida; `npm run build` OK.» (si el conteo real no es 202, se escribe el real y se averigua por qué).

- [ ] **Step 3: Verificación completa**

Run: `npm test && npx eslint --ignore-pattern ".claude/**" src/app/admin && npm run build`
Expected: `ℹ pass 202`, `ℹ fail 0`; eslint sin salida; build OK. Escribe la línea «Cabina (AAAA-MM-DD): …» del Step 2 con estos números.

- [ ] **Step 4: Commit**

```bash
git add docs/admin.md
git commit -m "docs(admin): sección Cabina, API del PC y de sesión, límites y lo no probado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Prueba de punta a punta con el celular de Oscar (manual)

**Files:** ninguno (si algo falla, se arregla en una tarea nueva con su prueba).

**Interfaces:**
- Consumes: la rama `feat/admin-cabina` publicada como **vista previa del PR** en Vercel (no `main`), y el plan del PC con su parte lista (crear, subir, publicar, bajar, entregar).

- [ ] **Step 1: Abrir el PR y esperar la vista previa**

```bash
git push -u origin feat/admin-cabina
gh pr create --title "Admin: Cabina en la web" --body "Spec: docs/superpowers/specs/2026-10-23-admin-cabina-design.md · Plan: docs/plans/2026-10-23-admin-cabina-web.md. No fusionar sin el visto bueno de Oscar: fusionar publica en elmetacho.com.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
Expected: el PR existe y Vercel muestra la URL de vista previa. **Pide permiso a Oscar antes del `push` y del PR.** Confirma con él que la vista previa tiene `ADMIN_PC_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `KV_REDIS_URL` y las de Telegram (él las revisa en Vercel; Claude no las abre).

- [ ] **Step 2: Sondeo real de 2–3 links (PC → web)**

Con el PC apuntando a la vista previa, corre a mano la parte de sondeo y publicación de la franja con 2–3 links. Mira:
1. Llega un «🎬 Cabina: candidato nuevo…» por candidato, con el enlace de la vista previa.
2. En `/admin` sale «Cabina (N)» arriba, con «sale solo en 3 días»; los pedidos normales no cambian.
3. En Vercel → Storage → Blob, bajo `cantados/<id>/` están `vista.mp4` y los `mNN.*` (y nada más).

- [ ] **Step 3: Revisión desde el celular de Oscar**

En su teléfono (iPhone o Android, datos móviles si se puede), abre un candidato y mira:
1. El video carga y se puede adelantar; «Marca inicio/fin» crea un tramo y ▶ lo reproduce.
2. Las imágenes se ven y los GIF se mueven en bucle sin sonido.
3. **Arrastre:** desde ⠿ sube un comentario del fondo al primero; la página baja/sube sola cerca de los bordes; la raya verde marca dónde cae; al soltar, el número cambia. Arrastrar desde cualquier otra parte de la tarjeta hace scroll normal. Las flechas siguen funcionando.
4. ✎ cambia una línea; ✕ la saca a «Fuera»; ↩ la vuelve a meter.
5. Recarga la página: el orden, la línea y los tramos siguen como los dejó.
6. «Aprobar» está desactivado con «Falta: tu gancho…»; sube un gancho de verdad (ideal > 100 MB): barra, sin multipart, «Subido: …».
7. Cambia a Story y otra vez a Reel; aprueba. Sale «Aprobado: sale en la franja de las 2 p. m.» y el candidato desaparece de «Cabina (N)».
8. Descarta otro candidato: confirmación, «Descartado.», y en Blob ya no está su carpeta.
9. En «Nuevo video» → Con pantallazos y en una página de «Subir pantallazos» (si hay un pedido así), los pantallazos se ven a lo ancho y legibles; el arrastre los reordena.
10. En Revisar (pedido por link, si hay uno en revisión) el arrastre funciona igual.

- [ ] **Step 4: Un aprobado hasta Telegram**

Corre la franja a mano en el PC. Mira:
1. `GET /admin/api/pc/cabina` trae el aprobado con su orden, líneas, tramos, destino y gancho firmado.
2. Tras `bajado`, la carpeta `cantados/<id>/` ya no está en Blob y el estado es `en_pc`.
3. El video llega por Telegram con el orden y las líneas que dejó Oscar.
4. Tras la entrega, la llave `admin:cantados:<id>` ya no está en Redis (el PC llamó `DELETE`).

- [ ] **Step 5: Un candidato vencido a mano**

Pídele a Claude que cambie el `propuesta.vence` de un candidato en revisión a una fecha pasada (con el token del PC no se puede; se hace en Redis con permiso de Oscar) y corre la franja. Mira: `GET /admin/api/pc/cabina` lo devuelve `automatico` con el orden propuesto; la story corta llega con «📱 STORY automática — Pendiente: tu gancho (5 s al inicio)»; Blob y Redis quedan limpios.

- [ ] **Step 6: Anotar el resultado**

En `docs/admin.md` → «Lo que NO se ha probado», quita lo que sí se probó y deja lo que no, con fecha. Commit:
```bash
git add docs/admin.md
git commit -m "docs(admin): resultado de la prueba de punta a punta de la Cabina

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Puntos para Oscar (encontrados al planear; no se cambiaron por cuenta propia)

1. **Purga de 7 días contra «primero automático».** El contrato dice que `GET pc/cabina` «primero» pasa a `automatico` lo vencido (70 h); con ese orden, un `en_revision` nunca llega a 7 días y la purga de la spec no hace nada. El plan **purga primero** (decisión 6). Si se prefiere el orden literal, sobra la purga de 7 días.
2. **Tokens de subida en paralelo pierden tamaños.** Cada `POST …/subida` lee y reescribe el registro entero en Redis; dos a la vez pueden borrar el tamaño anunciado del otro y `publicar` daría 409 «faltan». El plan del PC debe pedirlos **de a uno** (o, al recibir `faltan`, volver a pedir el token de esos archivos y publicar otra vez).
3. **Holgura de 2 h (ajuste ya aplicado):** con 70 h, un candidato publicado en la franja (2–4 p. m.) lo recoge la franja del día 3. Si la publicación de un candidato termina después de las 4 p. m. (franja larga), vence después de la franja del día 3 y sale en la del día 4.
4. **Un `POST /admin/api/pc/cabina` repetido** (respuesta perdida) crea otro candidato; el huérfano no tiene archivos y la purga lo borra a las 24 h, pero el PC no debe reintentar el `POST` sin más.
5. **Un aviso por candidato** = 10–20 mensajes del bot por franja.
6. **`likes` entero ≥ 0 o `null`; `respuestas` entero ≥ 0 (0 cuando no se sabe; `null` también se acepta); `medio.ext` exacta en minúscula; `NN` = posición en la lista completa.** El PC debe convertir «1,2 K» a número antes de mandarlo.
7. **Gancho de hasta 500 MB en una sola pieza desde el celular:** Vercel lo permite (máximo 5 TB; multipart solo recomendado desde 100 MB), pero si se corta la señal a mitad, la subida vuelve a empezar de cero (con multipart solo se repetía la parte).
8. **«Miniatura» en la lista** (spec §4): no hay imagen guardada para eso; el plan muestra el link del video.

## Resoluciones (Claude, sesión principal, 2026-10-23) — mandan sobre lo de arriba

1. **Purga antes que vencer:** se acepta el orden del plan (purga primero); la de 7 días solo actúa en estados atascados.
2. **Tokens de subida:** el PC los pide de a uno (su plan sube en serie) y, ante 409 `{faltan}`, vuelve a pedir el token solo de lo que falta.
3. **Ids:** se acepta reintentar hasta 5 ids y 503 si no hay libre.
4. **`pcAprobados` filtra la Cabina:** se acepta.
5. **Respuestas para el PC:** se aceptan tal cual (`publicar` 409 `{error, faltan}` / `{error, estado}`; `bajado` repetido 200; `DELETE` de un id que no es de la Cabina 404; `likes`/`respuestas` enteros o `null`/0; topes en MiB).
6. **Crear no idempotente:** se acepta; la purga de 24 h limpia los huérfanos.
7. **Avisos:** ninguno por candidato; el PC manda uno por franja. **Miniatura:** se muestra el link (no hay imagen). **Ganchos:** se deja multipart desde 20 MB (cuenta Pro), ver Global Constraints y Task 8.
