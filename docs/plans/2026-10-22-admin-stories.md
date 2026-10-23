# Admin: sección «Stories» — plan de implementación (lado de la web)

> **Para quien lo ejecute:** superpowers:executing-plans con TDD. Trabajar en una rama propia (worktree) y abrir un PR. **No fusionar sin el visto bueno de Oscar:** fusionar a `main` publica en elmetacho.com.

> **Ajuste de Oscar (2026-10-22), reemplaza las pestañas y la sección aparte:** "Que en admin, en la lista seleccionable ahora aparezca "storie" y que copie la estructura "con pantallazos"". Quedó así:
> - En «Nuevo video» hay una opción más, **«Story»**. Usa el mismo formulario que «Con pantallazos»: original, tramos, gancho, pantallazos y estilo. Por dentro es un pedido `tipo: "pantallazos"` con `destino: "story"` (`pedidoDeOpcion`).
> - No hay pestañas, ni `/admin/stories`, ni story por link. En la lista, el pedido lleva la etiqueta «Story».
> - La API rechaza `destino: "story"` con un tipo que no sea `pantallazos` (400). `GET /admin/api/pc/pedidos` devuelve `destino`, y el aviso a Telegram dice «📥 Recibí la story: …».
> - La Tarea 2 de abajo (listas y pestañas) se hizo y se revirtió (commit 7e24472); no aplica.

**Objetivo:** una sección «Stories» en `/admin`, con su lista y su botón «Nueva story», que use el mismo formulario y la misma API que los videos. Las stories quedan marcadas con `destino: "story"` y el PC las recibe así.

**Arquitectura:** un campo `destino` (`"reel"` por defecto, o `"story"`) en el pedido de Redis. Se fija al crear el pedido y no se cambia. Las dos listas filtran por ese campo, y `GET /admin/api/pc/pedidos` lo devuelve. No hay almacén, API ni formulario nuevos: es el mismo `NuevoPedido`, con un `destino` como prop.

**Herramientas:** Next.js (App Router), `node --test`, Redis y Blob (lo que ya existe).

**Spec:** `D:\METACHO CLAUDE\PREMIERE-CLAUDE\cantados\docs\2026-10-22-stories-design.md` §6 (v2). El lado del PC tiene su plan en `D:\METACHO CLAUDE\PREMIERE-CLAUDE\cantados\docs\plans\2026-10-22-stories-plan.md`.

## Restricciones globales
- Los pedidos sin `destino` (todos los de hoy) son reels.
- Una story solo puede ser `pantallazos` o `link`. **El remix no**: re-editar un video ya publicado contradice la regla de las stories.
- Textos en español, tuteo. Aviso a Telegram: «📥 Recibí la story: <nombre> — …».
- Pruebas: `npm test` (`node --test "src/**/*.test.js"`).

## Revisión: puntos que las pruebas no cubren
1. Un pedido en `necesita_pantallazos` o `en_revision` que es story: sus enlaces de «Subir pantallazos» y «Revisar» tienen que verse en la lista de Stories.
2. Después de enviar una story, el formulario vuelve a `/admin/stories`, no a `/admin`.
3. Las pestañas «Videos | Stories» tienen que funcionar en el teléfono, sin desbordar.
4. Un `destino` raro en el POST (`"Story"`, `""`, un número) → 400. No se guarda como reel por accidente.

---

### Tarea 1: `destino` en el pedido y en la API

**Archivos:** `src/app/admin/lib/pedido.js`, `src/app/admin/lib/api.js`; pruebas en `src/app/admin/lib/pedido.test.js` y `src/app/admin/lib/api.test.js`.

- [ ] **Paso 1: pruebas que fallan.** En `pedido.test.js`:
```js
test("destino: reel por defecto, story si se pide, los viejos sin campo son reel", () => {
  assert.equal(nuevoPedido("c_1", "2026-10-22T00:00:00Z").destino, "reel");
  assert.equal(nuevoPedido("c_1", "2026-10-22T00:00:00Z", "link", "story").destino, "story");
  assert.equal(destinoDe({}), "reel");
  assert.equal(destinoDe({ destino: "story" }), "story");
});
```
En `api.test.js` (con los ayudantes `montar`, `conSesion` y `pc` que ya están):
```js
test("crear una story: guarda destino; remix como story o destino raro → 400", async () => {
  const { api, almacen } = montar();
  const { id } = await (await api.crear(conSesion({ tipo: "pantallazos", destino: "story" }))).json();
  assert.equal((await almacen.leer(id)).destino, "story");
  assert.equal((await api.crear(conSesion({ tipo: "remix", destino: "story" }))).status, 400);
  for (const d of ["Story", "", 3]) assert.equal((await api.crear(conSesion({ tipo: "pantallazos", destino: d }))).status, 400, String(d));
});
test("el PC recibe el destino y el aviso dice story", async () => {
  const { api, avisos, tamanos } = montar();
  const { id } = await (await api.crear(conSesion({ tipo: "pantallazos", destino: "story" }))).json();
  const base = `cantados/${id}/`;
  for (const [n, t] of [["original.mp4", 500], ["gancho.mov", 300], ["p01.jpg", 10]]) tamanos.set(base + n, t);
  await api.cambiar(conSesion({ original: { pathname: base + "original.mp4", tamano: 500, duracion: 20 }, gancho: { pathname: base + "gancho.mov", tamano: 300 },
                                pantallazos: [{ pathname: base + "p01.jpg", tamano: 10 }], tramos: [[0, 7]] }, "PATCH"), id);
  assert.equal((await api.enviar(conSesion(), id)).status, 200);
  assert.match(avisos.at(-1), /^📥 Recibí la story: /);
  const lista = await (await api.pcPedidos(pc())).json();
  assert.equal(lista[0].destino, "story");
});
```
(Ajustar la forma del `PATCH` a la del flujo completo que ya existe en `api.test.js`.)
- [ ] **Paso 2:** `npm test` → FALLA.
- [ ] **Paso 3: implementación.**
  - En `pedido.js`:
```js
export const DESTINOS = ["reel", "story"];
export const TIPOS_STORY = ["pantallazos", "link"];          // el remix re-edita algo ya publicado: no va a story
export const destinoDe = (p) => (p.destino === "story" ? "story" : "reel");   // pedidos viejos sin campo = reel
```
y `nuevoPedido = (id, creado, tipo = "pantallazos", destino = "reel") => ({ id, creado, tipo, destino, ... })`.
  - En `api.js`, `crear`: `const { tipo = "pantallazos", destino = "reel" } = await cuerpo(req);` → `if (!DESTINOS.includes(destino)) return json({ error: "Destino no válido." }, 400);` → `if (destino === "story" && !TIPOS_STORY.includes(tipo)) return json({ error: "Una story solo puede ser con pantallazos o por link." }, 400);` → `nuevoPedido(…, tipo, destino)`.
  - En `enviar`: el texto del aviso empieza con `` `📥 Recibí ${destinoDe(p) === "story" ? "la story" : ""}…` ``. Sin cambiar el de los reels: queda `📥 Recibí: <nombre> — …` para reel y `📥 Recibí la story: <nombre> — …` para story.
  - En `pcPedidos`: agregar `destino: destinoDe(p),` al objeto que se devuelve.
- [ ] **Paso 4:** `npm test` → todo pasa.
- [ ] **Paso 5: commit** `feat(admin): destino reel/story en el pedido y en la API del PC`.

### Tarea 2: las dos listas y el formulario de story

**Archivos:** `src/app/admin/page.jsx`, `src/app/admin/stories/page.jsx` (nuevo), `src/app/admin/ListaPedidos.jsx`, `src/app/admin/cantados/nuevo/page.jsx`, `src/app/admin/cantados/nuevo/NuevoPedido.jsx`. Lógica pura en `pedido.js` con su prueba.

- [ ] **Paso 1: prueba que falla** (`pedido.test.js`):
```js
test("cada lista muestra solo su destino", () => {
  const ps = [{ id: "a" }, { id: "b", destino: "story" }, { id: "c", destino: "reel" }];
  assert.deepEqual(deDestino(ps, "reel").map((p) => p.id), ["a", "c"]);
  assert.deepEqual(deDestino(ps, "story").map((p) => p.id), ["b"]);
});
```
- [ ] **Paso 2:** `npm test` → FALLA. **Paso 3:** `export const deDestino = (lista, d) => lista.filter((p) => destinoDe(p) === d);` en `pedido.js`. **Paso 4:** `npm test` → pasa.
- [ ] **Paso 5: páginas.**
  - **`page.jsx`:** pasar la lectura de Redis a una función `listaDe(destino)` (en el mismo archivo o en `lib/`), usarla con `deDestino(…, "reel")` y renderizar `<ListaPedidos pedidos={…} error={…} destino="reel" />`.
  - **`stories/page.jsx`:** igual, con `"story"`. Tiene la misma verificación de sesión que `page.jsx` (`cookies()` + `sesionValida`) y `export const dynamic = "force-dynamic"`.
  - **`ListaPedidos`:** recibe `destino`. Arriba, dos pestañas: `<a href="/admin">Videos</a>` y `<a href="/admin/stories">Stories</a>`, con la activa resaltada (clases `adm-btn` existentes: activa `primario`, la otra `secundario`). Título: `Cantados` o `Stories`. Botón: «Nuevo video» → `/admin/cantados/nuevo`; «Nueva story» → `/admin/cantados/nuevo?destino=story`.
  - **`nuevo/page.jsx`:** `export default async function Nuevo({ searchParams }) { const { destino } = await searchParams; return <NuevoPedido destino={destino === "story" ? "story" : "reel"} />; }`.
  - **`NuevoPedido`:**
    - Recibe `destino`.
    - `OPCIONES` se filtra con `TIPOS_STORY` si es story.
    - El cuerpo del POST de `elegirTipo` es `{ tipo: t, destino }`.
    - Los títulos («Nuevo video» en las líneas ~267 y ~290) pasan a «Nueva story» si es story.
    - El `router.push("/admin")` de la línea ~240 pasa a `router.push(destino === "story" ? "/admin/stories" : "/admin")`.
- [ ] **Paso 6: verificación en el navegador** (servidor de desarrollo con la `.env.local` de Oscar; Claude no la abre):
  1. `/admin` → pestañas y lista sin stories.
  2. «Stories» → «Nueva story»: no aparece «Remix».
  3. Crear una story con pantallazos de prueba (original, gancho y 1 foto de `D:\METACHO CLAUDE\MATERIAL-PRUEBAS`) y enviarla. Ver que en `/admin/stories` sale «Listo para las 2 p. m.» y que en `/admin` no sale.
  4. Cancelarla.
  5. Ver en el teléfono (ancho 375) que las pestañas no desbordan.

  Si la `.env.local` o Redis local no están, decirlo y probar solo lo que no los necesite (no inventar).
- [ ] **Paso 7: commit** `feat(admin): sección Stories con su lista y su formulario`.

### Cierre
- `npm test` y `npm run build` → sin errores (anotar la salida).
- Abrir el PR («Admin: sección Stories») con el enlace a la spec, y avisarle a Oscar que fusionarlo publica en elmetacho.com.
- **Hasta que el PC tenga su parte** (plan del PC, Tarea 2: `leer_web` copia `destino`), las stories de la web salen como reels. Avisarlo si la web se publica antes.
