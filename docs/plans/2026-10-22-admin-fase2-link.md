# Admin · Fase 2 «por link» · Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** que Oscar pida desde `elmetacho.com/admin` un cantado **por link** (link de TikTok + video + tramos + gancho), que el PC lea los comentarios, Claude los escoja, Oscar los revise en el celular con botones (hasta 24 h) y la franja siguiente edite y entregue; con el respaldo «TikTok pidió sesión → Oscar sube pantallazos en el mismo pedido».

**Arquitectura:** Igual que la fase 1: lógica pura en `src/app/admin/lib/` probada con `node:test` (`pedido.js` gana `tipo`/`link`; `revision.js` nuevo con la propuesta y la revisión), API con dependencias inyectadas en `api.js` y rutas delgadas. En el PC (`PREMIERE-CLAUDE/cantados`), `leer_web` registra el pedido por link (modo `link`, original local), `nuevos_pedidos` lo sondea con el original subido, `publicar-propuesta` sube la propuesta y, al día siguiente, `leer` trae los aprobados y los aplica con las mismas funciones de `aplicar_respuesta`/`_reponer` de las respuestas de Telegram (traduciendo la lista de la web a la numeración del mensaje).

**Tech Stack:** Next.js 16.4.1 (App Router, JSX), React 19.2.4, Tailwind v4, `redis` 6, `@vercel/blob` 2.8.2, `node:test` (Node 24.11.1); Python 3.11.9 + pytest en el PC.

**Spec:** `docs/superpowers/specs/2026-10-22-admin-fase2-design.md` (solo la parte «por link»; el remix tiene su propio plan después de la prueba de §7). Base: `docs/superpowers/specs/2026-10-21-admin-design.md` y el plan de la fase 1 `docs/plans/2026-10-21-admin-cantados.md`.

**Línea base medida (2026-10-22):** `node --test "src/app/admin/lib/*.test.js"` → 40 pasan; `python -m pytest -q` en `cantados` → 264 pasan.

## Decisiones del plan

1. **El tipo se elige antes de crear el pedido.** `POST /admin/api/cantados` recibe `{ tipo }`; sin cuerpo = `pantallazos` (compatible con la fase 1). «Remix» se muestra deshabilitado («pronto») y la API lo rechaza hasta su plan (`TIPOS_DISPONIBLES = ["pantallazos", "link"]`).
2. **Pedidos viejos sin `tipo` cuentan como `pantallazos`** (`tipoDe(p)`); no se migra Redis.
3. **Link:** exactamente lo de la spec, `^https://(www\.|vm\.|vt\.)tiktok\.com/\S+$`, máx. 300 caracteres, se guarda sin espacios. No se aceptan `http://`, `m.tiktok.com` ni `tiktok.com` pelado.
4. **Vencimiento con holgura de franja:** `vence` = publicada + 24 h (spec), pero se da por vencida **2 h antes** (`HOLGURA_FRANJA_H = 2`) y el contador de la pantalla cuenta hasta ahí. Sin esto, una propuesta publicada a las 2:30 p. m. y no revisada no la recoge la franja del día siguiente (2:00 p. m.) y saldría al tercer día.
5. **«Trae más» no cambia de estado:** queda `en_revision` con `revision.trae_mas = true` (congelada: no se edita, no vence). `GET /admin/api/pc/aprobados` la devuelve con `trae_mas: true`.
6. **`GET aprobados` lista el pedido hasta la entrega** (la propuesta vive en Redis hasta entonces). El PC solo aplica si su estado local es `en_revision` y la `version` coincide: repetir la consulta no aplica dos veces.
7. **Cancelar:** también 409 en `en_revision` y `aprobado` (el PC ya tiene el proyecto, como en `en_pc`; `EN_EL_PC`). En `necesita_pantallazos` sí se cancela; el registro local del PC queda sin efecto (no se expira: es inofensivo).
8. **Pantallazos en `necesita_pantallazos`:** subida directa + `PATCH` (solo el campo `pantallazos`) + botón «Enviar pantallazos» que reutiliza `POST …/enviar` y marca `pantallazos_listos`. `GET pc/pedidos` solo incluye los `necesita_pantallazos` con `pantallazos_listos` (así el PC no se lleva una tanda a medias). Pantalla propia `/admin/cantados/<id>/pantallazos`.
9. **Revisión:** el `PATCH …/revision` manda el estado completo `{ orden, fuera, lineas }` (idempotente; una lista que no coincide con la propuesta se rechaza con «recarga la página»). ✓ es la insignia de «dentro», ✕ manda a «Fuera», ↩ lo vuelve a meter al final.
10. **Línea corregida:** el servidor exige coma final y texto; la pantalla agrega la coma si falta.
11. **Avisos de la web** (propuesta lista, pedir pantallazos, «no hay más») salen por el bot central (`avisar` de `deps.js`) con enlace absoluto tomado del origen de la petición (sirve igual en vista previa y en producción). El PC no repite el aviso de «no hay más».
12. **PC:** estados locales nuevos con los mismos nombres de la web (`en_revision`, `necesita_pantallazos`); pedido web por link con `modo: "link"`, `tipo: "link"`, `link`. `revisado` solo aprueba directo a los pedidos web que **no** son `modo: "link"`; `enviar-letras` salta todo pedido web.
13. **PC: TikTok con captcha o sin comentarios** (muro de sesión) en un pedido web por link → `necesita_pantallazos` de una vez, sin los 3 reintentos de Telegram; un error de conexión (Chrome 9223 cerrado) sigue con reintentos.
14. **Aplicar la revisión sin duplicar lógica:** al publicar se fija `numeracion` (como `enviar_letras`); la lista de la web se traduce a esa numeración y se aplica con `_fijar_letra` (extraída tal cual de `aplicar_respuesta`) o con `_reponer` («Trae más»); `_reserva` se extrae de `_reponer` para saber antes si hay con qué reponer.
15. **Repetidos web ↔ Telegram:** además de título + duración, un link de Telegram igual (sin `?…` ni `/` final; respeta mayúsculas, los códigos cortos las distinguen) al de un pedido web vivo es repetido, y se detecta **antes** de sondear.
16. **sondear:** `crear_proyecto` copia el `original` local cuando la entrada lo trae, en vez de `yt_dlp`; se copia como `original.mp4` aunque sea `.mov`, como ya hacen los pedidos adjuntos.
17. **Refactor UI mínimo:** `subidas.js`, `Barra.jsx` y `ListaPantallazos.jsx` (en `src/app/admin/cantados/`) para compartir subida, `PATCH` en fila y lista de pantallazos entre «Nuevo video» y «Subir pantallazos».
18. **Repos:** web en la rama `feat/admin-fase2-link` creada desde `spec/admin-fase2` (trae la spec y este plan). `PREMIERE-CLAUDE/cantados` **sí tiene git** (rama `main`) pero con cambios de la fase 1 sin commit que son de otra sesión: en el PC **no se hace commit**; se avisa a Oscar al final.

## Restricciones globales (Global Constraints)

- Código web solo en `src/app/admin/**`; docs en `docs/admin.md` (más esta spec y este plan en `docs/`). No tocar `package.json`, `package-lock.json` ni otros archivos compartidos (así el PR se puede fusionar sin aprobación, spec §9).
- Toda API nueva verifica sesión (cookie `admin_sesion`) o `ADMIN_PC_TOKEN` (rutas `api/pc/*`) **antes** de leer nada; cada una tiene su prueba de 401. El token del PC no sirve en las de sesión y la cookie no sirve en las del PC.
- Redis, solo texto: `propuesta: { publicada, vence, version, comentarios: [{ id, usuario, texto, linea, likes, dentro }] }` y `revision: { orden: [id…], fuera: [id…], lineas: {id: texto}, trae_mas: bool, aprobada_en }`. Sin imágenes ni archivos.
- Tipos: `pantallazos` | `link` | `remix`. Link: `https://(www.|vm.|vt.)tiktok.com/…`. Estados nuevos: `en_revision`, `aprobado`, `necesita_pantallazos`.
- Plazo de revisión: 24 h; si no aprueba, se aprueba solo con la propuesta como esté.
- Borrado igual que la fase 1 (prefijo `cantados/<id>/` al bajar, cancelar, fallar, 48 h de borrador, entregar). La propuesta vive en Redis hasta la entrega.
- Textos de la interfaz en español, tuteo colombiano; teléfono primero (columna de 480 px, botones de ≥ 44 px).
- Verificación web antes de cada commit: `node --test "src/app/admin/lib/*.test.js"` (Node 24), `npm test`, `npx eslint --ignore-pattern ".claude/**"`, `npm run build`, todo sin errores.
- PC: `python -m pytest -q` en `D:\METACHO CLAUDE\PREMIERE-CLAUDE\cantados`. Nunca abrir `.env*`; `ADMIN_PC_TOKEN` ya lo pone Oscar.
- PC: aplicar cambios de Oscar = lógica de `respuestas.py` / `aplicar_respuesta` / `_reponer`; no duplicarla.

## Foco de revisión (Review Focus)

1. **Oscar deja abierta la revisión en otro celular (o una pestaña vieja) y la propuesta ya cambió de versión tras «Trae más»:** el `PATCH` con la lista vieja debe rechazarse con «recarga la página», nunca guardar ids que no existen → prueba: Task 4, `rechaza listas viejas o incompletas…`.
2. **Claude corre `enviar-letras` después de `revisado` en un pedido web por link:** no debe salir una letra por Telegram (doble revisión, numeración cruzada) → prueba: Task 13, `test_revisado_de_un_link_web_no_lo_aprueba_ni_manda_letra`.
3. **La web sigue listando el aprobado hasta la entrega y la pasada se corta y se repite:** el PC aplica la lista una sola vez y nunca una versión que no es la que publicó → prueba: Task 14, `test_aprobados_repetidos_o_de_otra_version_no_se_aplican_dos_veces`.
4. **Propuesta publicada a media tarde que Oscar no revisa:** debe salir en la franja de las 2 p. m. del día siguiente, no al tercer día → pruebas: Task 4, `vence 2 h antes…`, y Task 5, `aprobados: … los vencidos se aprueban solos`.
5. **Pedido por link bloqueado por TikTok que vuelve con pantallazos:** la web no debe intentar firmar `original`/`gancho` nulos y una bajada incompleta de pantallazos no debe borrar el original que el PC ya tiene → pruebas: Task 8, `pantallazos en necesita_pantallazos: …`, y Task 15, `test_pantallazos_que_bajan_incompletos_no_borran_el_original`.

---

## Parte A · Web (`C:\Users\delga\Documents\elmetacho-web`)

- [ ] **Preparación:** `git checkout spec/admin-fase2 && git checkout -b feat/admin-fase2-link`. `node --test "src/app/admin/lib/*.test.js"` → 40 pasan.

### Task 1: Tipo de pedido y link en el modelo

**Files:**
- Modify: `src/app/admin/lib/pedido.js` (constantes y `nuevoPedido` líneas 4-23; `aplicarCambios` líneas 44-67; `erroresParaEnviar` líneas 69-76)
- Test: `src/app/admin/lib/pedido.test.js`

**Interfaces:**
- Consumes: lo de la fase 1 (`validarTramos`, `prefijo`, `PATRON`).
- Produces: `TIPOS = ["pantallazos","link","remix"]`, `TIPOS_DISPONIBLES = ["pantallazos","link"]`, `tipoDe(p) → string`, `linkValido(x) → boolean`, `nuevoPedido(id, creado, tipo = "pantallazos")` (agrega `tipo` y `link: null`), `aplicarCambios(p, c)` acepta `link` (solo `link`/`remix`) y rechaza `pantallazos` en pedidos por link, `erroresParaEnviar(p)` según el tipo.

- [ ] **Paso 1: pruebas que fallan.** En `pedido.test.js` reemplaza la línea 3 por:

```js
import { nuevoId, nuevoPedido, aplicarCambios, erroresParaEnviar, archivos, borradorVencido, prefijo, TIPOS, TIPOS_DISPONIBLES, linkValido, tipoDe } from "./pedido.js";
```

y agrega al final:

```js
const L = () => nuevoPedido("c_20261021_ab12", "2026-10-21T18:30:00.000Z", "link");

test("tipos: pantallazos por defecto; los pedidos viejos sin tipo cuentan como pantallazos", () => {
  assert.deepEqual(TIPOS, ["pantallazos", "link", "remix"]);
  assert.deepEqual(TIPOS_DISPONIBLES, ["pantallazos", "link"]);
  assert.equal(P().tipo, "pantallazos");
  assert.equal(L().tipo, "link");
  assert.equal(L().link, null);
  const { tipo, ...viejo } = P();
  assert.equal(tipo, "pantallazos");
  assert.equal(tipoDe(viejo), "pantallazos");
});

test("link de TikTok: solo https con www., vm. o vt.", () => {
  for (const ok of ["https://www.tiktok.com/@a/video/123", "https://vm.tiktok.com/ZMabc/", "https://vt.tiktok.com/ZS9/", "  https://vt.tiktok.com/ZS9/  "])
    assert.equal(linkValido(ok), true, ok);
  for (const malo of ["http://vt.tiktok.com/ZS9/", "https://tiktok.com/@a/video/1", "https://m.tiktok.com/v/1", "https://vt.tiktok.com/",
    "https://vt.tiktok.com.evil.co/x", "https://www.youtube.com/watch?v=1", "https://vt.tiktok.com/a b", "", null, 5, `https://vt.tiktok.com/${"a".repeat(300)}`])
    assert.equal(linkValido(malo), false, String(malo));
});

test("el link se guarda solo en pedidos por link y debe ser válido; un pedido por link no lleva pantallazos", () => {
  assert.equal(aplicarCambios(L(), { link: " https://vt.tiktok.com/ZS9/ " }).pedido.link, "https://vt.tiktok.com/ZS9/");
  assert.match(aplicarCambios(L(), { link: "https://youtube.com/x" }).errores[0], /TikTok/);
  assert.match(aplicarCambios(P(), { link: "https://vt.tiktok.com/ZS9/" }).errores[0], /no lleva link/);
  assert.match(aplicarCambios(L(), { pantallazos: [arch("p01.jpg")] }).errores[0], /no lleva pantallazos/);
});

test("para enviar por link: original, tramo, gancho y link (sin pantallazos); remix todavía no", () => {
  const base = { original: arch("original.mp4", { duracion: 28 }), tramos: [[0, 4]], gancho: arch("gancho.mov") };
  assert.deepEqual(erroresParaEnviar({ ...L(), ...base }), ["Falta el link de TikTok."]);
  assert.deepEqual(erroresParaEnviar({ ...L(), ...base, link: "https://vt.tiktok.com/ZS9/" }), []);
  assert.match(erroresParaEnviar({ ...nuevoPedido("x", "2026-10-21T18:30:00.000Z", "remix"), ...base }).join(" "), /todavía no/);
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/pedido.test.js` → FALLA con `SyntaxError: The requested module './pedido.js' does not provide an export named 'TIPOS'`.
- [ ] **Paso 3: implementación en `pedido.js`.** Reemplaza las líneas 20-23 (`nuevoPedido`) por:

```js
export const TIPOS = ["pantallazos", "link", "remix"];
export const TIPOS_DISPONIBLES = ["pantallazos", "link"];   // remix: después de su prueba (spec fase 2 §7)
const LINK = /^https:\/\/(www\.|vm\.|vt\.)tiktok\.com\/\S+$/;
const MAX_LINK = 300;
export const tipoDe = (p) => p.tipo || "pantallazos";      // pedidos de la fase 1 no traen tipo
export const linkValido = (x) => typeof x === "string" && x.trim().length <= MAX_LINK && LINK.test(x.trim());
export const nuevoPedido = (id, creado, tipo = "pantallazos") => ({
  id, creado, tipo, estado: "subiendo", titulo: null, estilo: ESTILOS[0], tramos: [],
  original: null, gancho: null, pantallazos: [], link: null, motivo: null,
});
```

En `aplicarCambios`, justo después del bucle `for (const campo of ["original", "gancho"]) {…}` agrega:

```js
  if ("link" in c) {
    if (tipoDe(p) === "pantallazos") errores.push("Este pedido no lleva link.");
    else if (linkValido(c.link)) out.link = c.link.trim();
    else errores.push("El link debe ser de TikTok: https://www.tiktok.com/…, https://vm.tiktok.com/… o https://vt.tiktok.com/…");
  }
```

y reemplaza el bloque `if ("pantallazos" in c) {…}` por:

```js
  if ("pantallazos" in c) {
    if (tipoDe(p) !== "pantallazos") errores.push("Este pedido no lleva pantallazos.");
    else {
      const lista = Array.isArray(c.pantallazos)
        ? c.pantallazos.slice(0, MAX_PANTALLAZOS).map((a) => archivoValido(p.id, a, PATRON.pantallazo))
        : [null];
      lista.every(Boolean) ? (out.pantallazos = lista) : errores.push("Hay un archivo de pantallazo que no es de este pedido.");
    }
  }
```

Reemplaza `erroresParaEnviar` por:

```js
export function erroresParaEnviar(p) {
  const tipo = tipoDe(p);
  if (!TIPOS_DISPONIBLES.includes(tipo)) return ["Ese tipo de pedido todavía no está disponible."];
  const e = [];
  if (!(p.original?.tamano > 0)) e.push("Falta el video original.");
  if (!p.tramos?.length) e.push("Falta marcar el bucle.");
  if (!(p.gancho?.tamano > 0)) e.push("Falta tu gancho.");
  if (tipo === "link" && !linkValido(p.link)) e.push("Falta el link de TikTok.");
  if (tipo === "pantallazos" && (!p.pantallazos?.length || !p.pantallazos.every((a) => a.tamano > 0))) e.push("Faltan los pantallazos.");
  return e;
}
```

- [ ] **Paso 4:** `node --test "src/app/admin/lib/*.test.js"` → PASAN todas (40 + 4; la prueba vieja «para enviar hace falta original, tramo, gancho y un pantallazo» sigue dando 4 errores).
- [ ] **Paso 5: commit**

```bash
git add src/app/admin/lib/pedido.js src/app/admin/lib/pedido.test.js
git commit -m "Admin fase 2: tipo de pedido y link de TikTok en el modelo"
```

### Task 2: API para crear, enviar y entregar al PC pedidos por link

**Files:**
- Modify: `src/app/admin/lib/pedido.js` (agregar `EN_EL_PC`), `src/app/admin/lib/api.js` (import línea 4; `crear` 33-37; `enviar` 49-60; `cancelar` 61-68; `pcPedidos` 74-83; `pcBajado` 84-90)
- Test: `src/app/admin/lib/api.test.js`

**Interfaces:**
- Consumes: Task 1 (`TIPOS_DISPONIBLES`, `tipoDe`, `nuevoPedido(id, creado, tipo)`).
- Produces: `EN_EL_PC = ["en_pc","en_revision","aprobado"]` (en `pedido.js`); `crear` lee `{ tipo }` del cuerpo (400 si no está disponible); `pcPedidos` → `[{ id, estado, tipo, link, creado, titulo, estilo, tramos, original: {…,url}|null, gancho: {…,url}|null, pantallazos: [{…,url}] }]`; `firmar(null) → null`; `pcBajado` solo cambia a `en_pc` lo que está `listo` o `necesita_pantallazos` (en otro estado responde `{ ok: true }` sin tocar nada); `cancelar` → 409 para `EN_EL_PC`.

- [ ] **Paso 1: pruebas que fallan** (al final de `api.test.js`):

```js
async function pedidoLink(api, tamanos) {
  const { id } = await (await api.crear(conSesion({ tipo: "link" }))).json();
  const base = `cantados/${id}/`;
  tamanos.set(base + "original.mp4", 500);
  tamanos.set(base + "gancho.mov", 300);
  const r = await api.cambiar(conSesion({ original: { pathname: base + "original.mp4", tamano: 500, duracion: 28 }, tramos: [[0, 4]],
    gancho: { pathname: base + "gancho.mov", tamano: 300 }, link: "https://vt.tiktok.com/ZS9/" }, "PATCH"), id);
  assert.equal(r.status, 200);
  return id;
}

test("crear: el tipo viene en el cuerpo; sin cuerpo es pantallazos; remix o basura no", async () => {
  const { api, almacen } = montar();
  const { id } = await (await api.crear(conSesion())).json();
  assert.equal((await almacen.leer(id)).tipo, "pantallazos");
  assert.equal((await api.crear(conSesion({ tipo: "remix" }))).status, 400);
  assert.equal((await api.crear(conSesion({ tipo: "otro" }))).status, 400);
});

test("pedido por link: se envía sin pantallazos y el PC lo recibe con tipo, link y estado", async () => {
  const { api, avisos, tamanos } = montar();
  const id = await pedidoLink(api, tamanos);
  assert.equal((await api.enviar(conSesion(), id)).status, 200);
  assert.match(avisos[0], /Recibí/);
  const [p] = await (await api.pcPedidos(pc())).json();
  assert.deepEqual([p.id, p.tipo, p.link, p.estado, p.pantallazos], [id, "link", "https://vt.tiktok.com/ZS9/", "listo", []]);
  assert.match(p.original.url, /^https:\/\/firmado\//);
});

test("cancelar responde 409 mientras el PC tiene el pedido (en_pc, en_revision, aprobado)", async () => {
  const { api, almacen } = montar();
  for (const estado of ["en_pc", "en_revision", "aprobado"]) {
    await almacen.guardar({ id: "c_x", creado: new Date(T).toISOString(), estado, tipo: "link", pantallazos: [] });
    assert.equal((await api.cancelar(conSesion(null, "DELETE"), "c_x")).status, 409, estado);
  }
});

test("bajado solo mueve a en_pc lo que estaba listo (repetirlo no pisa una revisión)", async () => {
  const { api, almacen, borrados } = montar();
  await almacen.guardar({ id: "c_x", creado: new Date(T).toISOString(), estado: "en_revision", tipo: "link", pantallazos: [] });
  assert.equal((await api.pcBajado(pc(), "c_x")).status, 200);
  assert.equal((await almacen.leer("c_x")).estado, "en_revision");
  assert.deepEqual(borrados, []);
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/api.test.js` → FALLAN las 4 nuevas (p. ej. `crear` con remix responde 200; `pcPedidos` no trae `tipo`).
- [ ] **Paso 3: implementación.** En `pedido.js`, debajo de `TIPOS_DISPONIBLES`:

```js
export const EN_EL_PC = ["en_pc", "en_revision", "aprobado"];   // el PC ya tiene el proyecto: no se cancela desde la web
```

En `api.js`, línea 4:

```js
import { EN_EL_PC, TIPOS_DISPONIBLES, aplicarCambios, borradorVencido, erroresParaEnviar, nombreVisible, nuevoId, nuevoPedido, prefijo, tipoDe } from "./pedido.js";
```

`crear`:

```js
    crear: conSesion(async (req) => {
      const { tipo = "pantallazos" } = await cuerpo(req);
      if (!TIPOS_DISPONIBLES.includes(tipo)) return json({ error: "Tipo de pedido no válido." }, 400);
      const p = nuevoPedido(nuevoId(new Date(ahora()), azar()), new Date(ahora()).toISOString(), tipo);
      await almacen.guardar(p);
      return json({ id: p.id });
    }),
```

En `enviar`, reemplaza la línea del aviso por:

```js
      const cuando = tipoDe(p) === "link"
        ? "a las 2 p. m. Claude escoge los comentarios y te mando el enlace para revisarlos."
        : "sale a las 2 p. m.";
      await avisar(`📥 Recibí: ${nombreVisible(p)} — ${cuando}`).catch(() => {});
```

En `cancelar`, reemplaza `if (p.estado === "en_pc") …` por:

```js
      if (EN_EL_PC.includes(p.estado)) return json({ error: "El PC lo está haciendo; ya no se puede cancelar." }, 409);
```

`pcPedidos` (desde `const firmar`):

```js
      const firmar = async (a) => (a ? { ...a, url: await blob.enlace(a.pathname) } : null);
      const paraPc = todos.filter((p) => p.estado === "listo");
      return json(await Promise.all(paraPc.map(async (p) => ({
        id: p.id, estado: p.estado, tipo: tipoDe(p), link: p.link ?? null, creado: p.creado, titulo: p.titulo, estilo: p.estilo, tramos: p.tramos,
        original: await firmar(p.original), gancho: await firmar(p.gancho), pantallazos: await Promise.all((p.pantallazos || []).map(firmar)),
      }))));
```

`pcBajado`, después del 404:

```js
      if (!["listo", "necesita_pantallazos"].includes(p.estado)) return json({ ok: true });   // repetido: no pisar en_pc/en_revision
```

- [ ] **Paso 4:** `node --test "src/app/admin/lib/*.test.js"` → PASAN todas.
- [ ] **Paso 5: commit**

```bash
git add src/app/admin/lib/pedido.js src/app/admin/lib/api.js src/app/admin/lib/api.test.js
git commit -m "Admin fase 2: crear y enviar pedidos por link; el PC los recibe con tipo y link"
```

### Task 3: «Nuevo video» con selector de tipo y campo de link

**Files:**
- Modify: `src/app/admin/cantados/nuevo/NuevoPedido.jsx`

**Interfaces:**
- Consumes: `TIPOS_DISPONIBLES`, `linkValido` (Task 1); `POST /admin/api/cantados` con `{ tipo }` (Task 2); `PATCH { link }` (Task 1).
- Produces: pantalla que pide primero el tipo; para `link` muestra Link → Video original → Gancho → Estilo y título (sin pantallazos).

- [ ] **Paso 1: imports y opciones.** Línea 7 → `import { ESTILOS, TIPOS_DISPONIBLES, linkValido } from "../../lib/pedido.js";`. Debajo de `const boton = …` agrega:

```js
const OPCIONES = [
  { tipo: "pantallazos", titulo: "Con pantallazos", detalle: "Tú escoges los comentarios y subes las fotos." },
  { tipo: "link", titulo: "Por link", detalle: "Claude escoge los comentarios de TikTok y tú los revisas aquí." },
  { tipo: "remix", titulo: "Remix", detalle: "Reeditar un cantado ya publicado (pronto)." },
];
```

- [ ] **Paso 2: estado.** Debajo de `const [id, setId] = useState(null);`:

```js
  const [tipo, setTipo] = useState(null);
  const [link, setLink] = useState("");
  const [linkGuardado, setLinkGuardado] = useState(false);
```

- [ ] **Paso 3: crear al elegir el tipo.** Reemplaza el `useEffect` completo (el que hace `fetch("/admin/api/cantados", { method: "POST" })`) por:

```js
  useEffect(() => {
    const pantsActuales = pantsRef;
    const urlActual = urlOrig;
    return () => {
      if (urlActual.current) URL.revokeObjectURL(urlActual.current);
      pantsActuales.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  // El tipo se elige primero: con él se crea el pedido (spec fase 2 §4).
  async function elegirTipo(t) {
    setTipo(t);
    setErrorGlobal("");
    try {
      const r = await fetch("/admin/api/cantados", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo: t }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.id) throw new Error(d.error || "sin id");
      idRef.current = d.id;
      setId(d.id);
    } catch {
      setErrorGlobal("No se pudo crear el pedido. Recarga la página.");
    }
  }
```

- [ ] **Paso 4: guardar el link.** Debajo de `function elegirEstilo(s) {…}`:

```js
  function guardarLink() {
    const v = link.trim();
    if (!v || !idRef.current) return;
    if (!linkValido(v))
      return setErrorGlobal("Ese link no es de TikTok: debe empezar por https://www.tiktok.com/, https://vm.tiktok.com/ o https://vt.tiktok.com/.");
    setErrorGlobal("");
    patch({ link: v })
      .then(() => setLinkGuardado(true))
      .catch((err) => setErrorGlobal(err.message));
  }
```

- [ ] **Paso 5: qué falta y numeración.** Reemplaza `const falta = …` por:

```js
  const porLink = tipo === "link";
  const falta = !id || !original?.subido || tramos.length === 0 || !gancho || (porLink ? !linkGuardado : pants.length === 0);
  const secciones = porLink ? ["link", "original", "gancho", "estilo"] : ["original", "gancho", "pantallazos", "estilo"];
  const num = (s) => secciones.indexOf(s) + 1;
```

Reemplaza `if (listo) return <p …>Listo: sale a las 2 p. m.</p>;` por:

```jsx
  if (listo)
    return (
      <p className="pt-10 text-center text-xl font-bold">
        {porLink ? "Listo: a las 2 p. m. Claude escoge los comentarios y te llega el enlace para revisarlos." : "Listo: sale a las 2 p. m."}
      </p>
    );

  if (!tipo)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nuevo video</h1>
          <a href="/admin" className="text-sm underline">
            Volver
          </a>
        </div>
        <p className="text-black/70">¿Qué vas a pedir?</p>
        {OPCIONES.map((o) => (
          <button
            key={o.tipo}
            onClick={() => elegirTipo(o.tipo)}
            disabled={!TIPOS_DISPONIBLES.includes(o.tipo)}
            className="flex flex-col gap-1 rounded border-2 border-[#E10600] bg-white p-4 text-left disabled:border-black/20 disabled:opacity-50"
          >
            <span className="text-lg font-bold">{o.titulo}</span>
            <span className="text-sm text-black/70">{o.detalle}</span>
          </button>
        ))}
      </div>
    );
```

- [ ] **Paso 6: secciones.** Justo antes de `<Seccion titulo="1. Video original">` agrega:

```jsx
      {porLink && (
        <Seccion titulo={`${num("link")}. Link de TikTok`}>
          <input
            type="url"
            inputMode="url"
            value={link}
            placeholder="https://vt.tiktok.com/…"
            onChange={(e) => {
              setLink(e.target.value);
              setLinkGuardado(false);
            }}
            onBlur={guardarLink}
            disabled={!id}
            className="rounded border border-black/30 bg-white p-3"
          />
          <p className="text-sm text-black/60">Solo sirve para leer los comentarios: el video súbelo abajo.</p>
          {linkGuardado && <p className="text-sm text-black/70">Link guardado.</p>}
        </Seccion>
      )}
```

Cambia los títulos: `titulo="1. Video original"` → ``titulo={`${num("original")}. Video original`}``; `titulo="2. Tu gancho"` → ``titulo={`${num("gancho")}. Tu gancho`}``; `titulo="4. Estilo y título"` → ``titulo={`${num("estilo")}. Estilo y título`}``. Envuelve la sección de pantallazos completa en `{!porLink && ( … )}` con ``titulo={`${num("pantallazos")}. Pantallazos`}``. En la lista de «Falta:» cambia `pants.length === 0 && "al menos un pantallazo",` por:

```js
            porLink && !linkGuardado && "link de TikTok",
            !porLink && pants.length === 0 && "al menos un pantallazo",
```

- [ ] **Paso 7:** `npm test && npx eslint --ignore-pattern ".claude/**" && npm run build` → sin errores (la ruta `/admin/cantados/nuevo` sale en el build como dinámica).
- [ ] **Paso 8: commit**

```bash
git add src/app/admin/cantados/nuevo/NuevoPedido.jsx
git commit -m "Admin fase 2: Nuevo video pide primero el tipo y, por link, el link de TikTok"
```

### Task 4: Propuesta y revisión (lógica pura)

**Files:**
- Create: `src/app/admin/lib/revision.js`
- Test: `src/app/admin/lib/revision.test.js`

**Interfaces:**
- Consumes: `mover(lista, i, paso)` de `editor.js`.
- Produces: `HORAS_REVISION = 24`, `HOLGURA_FRANJA_H = 2`; `ponerComa(t) → string`; `lineaValida(t) → boolean`; `validarPropuesta(lista) → { comentarios, errores }`; `publicarPropuesta(p, comentarios, ahoraMs) → pedido en_revision`; `vencida(p, ahoraMs) → boolean`; `horasRestantes(p, ahoraMs) → number`; `noEditable(p, ahoraMs) → string|null`; `aplicarRevision(p, { orden, fuera, lineas }, ahoraMs) → { pedido, errores }`; `aprobarRevision(p, ahoraMs)`, `pedirMas(p, ahoraMs)`, `masAtendido(p, ahoraMs)` → `{ pedido, errores }`; `aprobarVencido(p, ahoraMs) → pedido`; `listaFinal(p) → [{ id, linea }]`; de la pantalla: `quitar(rev, id)`, `meter(rev, id)`, `moverEn(rev, i, paso)`, `editarLinea(rev, id, texto, original)` → `rev` (`{ orden, fuera, lineas }`).

- [ ] **Paso 1: pruebas que fallan (`revision.test.js`)**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { HOLGURA_FRANJA_H, aplicarRevision, aprobarRevision, aprobarVencido, editarLinea, horasRestantes, lineaValida, listaFinal,
  masAtendido, meter, moverEn, noEditable, pedirMas, ponerComa, publicarPropuesta, quitar, validarPropuesta, vencida } from "./revision.js";

const T = Date.parse("2026-10-22T19:30:00Z");
const H = 3600e3;
const C = (id, dentro = true, extra = {}) => ({ id, usuario: `u${id}`, texto: `texto ${id}`, linea: `linea ${id},`, likes: 3, dentro, ...extra });
const PED = () => ({ id: "c_1", creado: "2026-10-22T18:00:00.000Z", tipo: "link", estado: "en_pc", pantallazos: [] });
const publicado = () => publicarPropuesta(PED(), validarPropuesta([C("a"), C("b"), C("c"), C("d", false)]).comentarios, T);

test("valida la propuesta del PC: ids únicos, línea con coma, al menos uno dentro, likes enteros", () => {
  const { comentarios, errores } = validarPropuesta([C("a", true, { linea: "  sin coma  ", likes: 2.5 }), C("b", false)]);
  assert.deepEqual(errores, []);
  assert.equal(comentarios[0].linea, "sin coma,");
  assert.equal(comentarios[0].likes, null);
  assert.match(validarPropuesta([C("a"), C("a")]).errores[0], /repetido/);
  assert.match(validarPropuesta([C("a/b")]).errores[0], /id válido/);
  assert.match(validarPropuesta([C("a", false)]).errores[0], /ningún comentario dentro/);
  assert.match(validarPropuesta([C("a", true, { linea: " , " })]).errores[0], /línea/);
  assert.match(validarPropuesta([]).errores[0], /entre 1 y 80/);
  assert.match(validarPropuesta("x").errores[0], /entre 1 y 80/);
  assert.match(validarPropuesta([null]).errores[0], /id válido/);
});

test("publicar: en_revision, vence en 24 h, versión 1 y la revisión arranca con la propuesta", () => {
  const p = publicado();
  assert.equal(p.estado, "en_revision");
  assert.equal(p.propuesta.vence, new Date(T + 24 * H).toISOString());
  assert.equal(p.propuesta.version, 1);
  assert.deepEqual(p.revision, { orden: ["a", "b", "c"], fuera: ["d"], lineas: {}, trae_mas: false, aprobada_en: null });
  assert.equal(publicarPropuesta(p, p.propuesta.comentarios, T).propuesta.version, 2);
});

test("vence 2 h antes de las 24 h para que la franja del día siguiente lo recoja", () => {
  const p = publicado();
  assert.equal(HOLGURA_FRANJA_H, 2);
  assert.equal(vencida(p, T + 21.9 * H), false);
  assert.equal(vencida(p, T + 22 * H), true);
  assert.equal(horasRestantes(p, T), 22);
  assert.equal(horasRestantes(p, T + 21.5 * H), 1);
  assert.equal(horasRestantes(p, T + 30 * H), 0);
  assert.equal(vencida({ ...p, revision: { ...p.revision, trae_mas: true } }, T + 30 * H), false);
  assert.equal(vencida({ ...p, estado: "aprobado" }, T + 30 * H), false);
});

test("aplica la revisión completa: orden, fuera y líneas corregidas", () => {
  const { pedido, errores } = aplicarRevision(publicado(), { orden: ["c", "d", "a"], fuera: ["b"], lineas: { d: "otra cosa," } }, T + H);
  assert.deepEqual(errores, []);
  assert.deepEqual(listaFinal(pedido), [{ id: "c", linea: "linea c," }, { id: "d", linea: "otra cosa," }, { id: "a", linea: "linea a," }]);
});

test("rechaza listas viejas o incompletas (otro celular, propuesta nueva) y deja al menos uno", () => {
  const r = (c) => aplicarRevision(publicado(), c, T + H).errores[0];
  assert.match(r({ orden: ["a", "b"], fuera: ["d"] }), /recarga/);
  assert.match(r({ orden: ["a", "b", "c", "x"], fuera: ["d"] }), /recarga/);
  assert.match(r({ orden: ["a", "a", "b", "c"], fuera: [] }), /recarga/);
  assert.match(r({ orden: [], fuera: ["a", "b", "c", "d"] }), /al menos un/);
  assert.match(r({ orden: ["a"] }), /inválidos/);
  assert.match(r(null), /inválidos/);
});

test("una línea corregida debe terminar en coma y no quedar vacía", () => {
  const r = (lineas) => aplicarRevision(publicado(), { orden: ["a", "b", "c"], fuera: ["d"], lineas }, T + H);
  assert.match(r({ a: "sin coma" }).errores[0], /coma/);
  assert.match(r({ a: " , " }).errores[0], /coma/);
  assert.match(r({ x: "hola," }).errores[0], /no está en la propuesta/);
  assert.deepEqual(r({ a: "  bien,  " }).pedido.revision.lineas, { a: "bien," });
  assert.equal(ponerComa(" hola "), "hola,");
  assert.equal(ponerComa("hola,"), "hola,");
  assert.equal(lineaValida(","), false);
});

test("aprobar, pedir más y plazo vencido", () => {
  const p = publicado();
  const a = aprobarRevision(p, T + H).pedido;
  assert.equal(a.estado, "aprobado");
  assert.equal(a.revision.aprobada_en, new Date(T + H).toISOString());
  assert.match(aprobarRevision(a, T + H).errores[0], /no está en revisión/);
  const m = pedirMas(p, T + H).pedido;
  assert.equal(m.revision.trae_mas, true);
  assert.match(aplicarRevision(m, { orden: ["a"], fuera: ["b", "c", "d"] }, T + H).errores[0], /pediste más/);
  assert.match(noEditable(p, T + 23 * H), /venció/);
  const v = aprobarVencido(p, T + 23 * H);
  assert.deepEqual([v.estado, v.automatico], ["aprobado", true]);
});

test("«no hay más»: vuelve a revisión con 24 h nuevas y la misma lista", () => {
  const m = pedirMas(publicado(), T + H).pedido;
  const { pedido, errores } = masAtendido(m, T + 24 * H);
  assert.deepEqual(errores, []);
  assert.equal(pedido.revision.trae_mas, false);
  assert.equal(pedido.propuesta.vence, new Date(T + 48 * H).toISOString());
  assert.deepEqual(pedido.revision.orden, ["a", "b", "c"]);
  assert.match(masAtendido(publicado(), T).errores[0], /no pidió más/);
});

test("cambios de la pantalla: quitar, meter, mover y corregir", () => {
  let rev = publicado().revision;
  rev = quitar(rev, "b");
  assert.deepEqual([rev.orden, rev.fuera], [["a", "c"], ["d", "b"]]);
  rev = meter(rev, "d");
  assert.deepEqual([rev.orden, rev.fuera], [["a", "c", "d"], ["b"]]);
  rev = moverEn(rev, 2, -1);
  assert.deepEqual(rev.orden, ["a", "d", "c"]);
  assert.deepEqual(quitar({ orden: ["a"], fuera: [], lineas: {} }, "a").orden, ["a"]);
  rev = editarLinea(rev, "a", "nueva,", "linea a,");
  assert.deepEqual(rev.lineas, { a: "nueva," });
  assert.deepEqual(editarLinea(rev, "a", "linea a,", "linea a,").lineas, {});
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/revision.test.js` → FALLA con `Cannot find module …/revision.js`.
- [ ] **Paso 3: `revision.js`**

```js
// Propuesta de comentarios de los pedidos por link y la revisión de Oscar en /admin. Spec fase 2 §4.
import { mover } from "./editor.js";

export const HORAS_REVISION = 24;
export const HOLGURA_FRANJA_H = 2;   // vence 2 h antes: así la franja de las 2 p. m. del día siguiente la recoge
const MAX_COMENTARIOS = 80;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const iso = (ms) => new Date(ms).toISOString();
const corto = (x, max) => (typeof x === "string" ? x.trim().slice(0, max) : "");

export const ponerComa = (t) => {
  const s = String(t ?? "").trim();
  return s.endsWith(",") ? s : `${s},`;
};
export const lineaValida = (t) =>
  typeof t === "string" && t.trim().length <= 300 && t.trim().endsWith(",") && t.trim().slice(0, -1).trim().length > 0;

export function validarPropuesta(lista) {
  const mal = (e) => ({ comentarios: [], errores: [e] });
  if (!Array.isArray(lista) || lista.length === 0 || lista.length > MAX_COMENTARIOS)
    return mal(`La propuesta debe traer entre 1 y ${MAX_COMENTARIOS} comentarios.`);
  const vistos = new Set(), comentarios = [];
  for (const c of lista) {
    const id = String(c?.id ?? "");
    if (!c || typeof c !== "object" || !ID.test(id) || vistos.has(id)) return mal("Hay un comentario sin id válido o repetido.");
    const linea = ponerComa(corto(c.linea, 299));
    if (!lineaValida(linea)) return mal(`El comentario ${id} no tiene línea para cantar.`);
    vistos.add(id);
    comentarios.push({ id, usuario: corto(c.usuario, 60), texto: corto(c.texto, 600), linea,
      likes: Number.isInteger(c.likes) && c.likes >= 0 ? c.likes : null, dentro: c.dentro === true });
  }
  if (!comentarios.some((c) => c.dentro)) return mal("La propuesta no deja ningún comentario dentro.");
  return { comentarios, errores: [] };
}

export function publicarPropuesta(p, comentarios, ahoraMs) {
  return {
    ...p, estado: "en_revision", automatico: false,
    propuesta: { publicada: iso(ahoraMs), vence: iso(ahoraMs + HORAS_REVISION * 3600e3), version: (p.propuesta?.version || 0) + 1, comentarios },
    revision: { orden: comentarios.filter((c) => c.dentro).map((c) => c.id), fuera: comentarios.filter((c) => !c.dentro).map((c) => c.id),
                lineas: {}, trae_mas: false, aprobada_en: null },
  };
}

const limite = (p) => Date.parse(p.propuesta?.vence) - HOLGURA_FRANJA_H * 3600e3;
export const vencida = (p, ahoraMs) => p.estado === "en_revision" && !p.revision?.trae_mas && ahoraMs >= limite(p);
export const horasRestantes = (p, ahoraMs) => Math.max(0, Math.ceil((limite(p) - ahoraMs) / 3600e3));

export function noEditable(p, ahoraMs) {
  if (p.estado !== "en_revision" || !p.propuesta || !p.revision) return "Este pedido no está en revisión.";
  if (p.revision.trae_mas) return "Ya pediste más comentarios: llegan en la franja de las 2 p. m.";
  if (vencida(p, ahoraMs)) return "Se venció el plazo: se aprueba solo con la lista como está.";
  return null;
}

export function aplicarRevision(p, c, ahoraMs) {
  const mal = (e) => ({ pedido: p, errores: [e] });
  const no = noEditable(p, ahoraMs);
  if (no) return mal(no);
  if (!c || typeof c !== "object" || Array.isArray(c) || !Array.isArray(c.orden) || !Array.isArray(c.fuera)) return mal("Datos inválidos.");
  const ids = p.propuesta.comentarios.map((x) => x.id);
  const orden = c.orden.map(String), fuera = c.fuera.map(String), juntos = [...orden, ...fuera];
  if (juntos.length !== ids.length || new Set(juntos).size !== ids.length || !juntos.every((i) => ids.includes(i)))
    return mal("La lista no coincide con la propuesta: recarga la página.");
  if (!orden.length) return mal("Deja al menos un comentario.");
  const crudo = c.lineas && typeof c.lineas === "object" && !Array.isArray(c.lineas) ? c.lineas : {};
  const lineas = {};
  for (const [id, t] of Object.entries(crudo)) {
    if (!ids.includes(id)) return mal("Hay una línea de un comentario que no está en la propuesta.");
    if (!lineaValida(t)) return mal("Cada línea corregida debe terminar en coma (y no puede quedar vacía).");
    lineas[id] = t.trim();
  }
  return { pedido: { ...p, revision: { ...p.revision, orden, fuera, lineas } }, errores: [] };
}

export function aprobarRevision(p, ahoraMs) {
  const no = noEditable(p, ahoraMs);
  if (no) return { pedido: p, errores: [no] };
  return { pedido: { ...p, estado: "aprobado", automatico: false, revision: { ...p.revision, aprobada_en: iso(ahoraMs) } }, errores: [] };
}
export function pedirMas(p, ahoraMs) {
  const no = noEditable(p, ahoraMs);
  if (no) return { pedido: p, errores: [no] };
  return { pedido: { ...p, revision: { ...p.revision, trae_mas: true } }, errores: [] };
}
export const aprobarVencido = (p, ahoraMs) => ({ ...p, estado: "aprobado", automatico: true, revision: { ...p.revision, aprobada_en: iso(ahoraMs) } });
export function masAtendido(p, ahoraMs) {
  if (p.estado !== "en_revision" || !p.revision?.trae_mas) return { pedido: p, errores: ["Ese pedido no pidió más comentarios."] };
  return { pedido: { ...p, revision: { ...p.revision, trae_mas: false },
    propuesta: { ...p.propuesta, vence: iso(ahoraMs + HORAS_REVISION * 3600e3) } }, errores: [] };
}
export function listaFinal(p) {
  const por = new Map(p.propuesta.comentarios.map((c) => [c.id, c]));
  return p.revision.orden.filter((id) => por.has(id)).map((id) => ({ id, linea: p.revision.lineas[id] ?? por.get(id).linea }));
}

// Cambios de la pantalla de revisión sobre { orden, fuera, lineas }.
export const quitar = (rev, id) =>
  rev.orden.length <= 1 || !rev.orden.includes(id) ? rev : { ...rev, orden: rev.orden.filter((x) => x !== id), fuera: [...rev.fuera, id] };
export const meter = (rev, id) =>
  !rev.fuera.includes(id) ? rev : { ...rev, fuera: rev.fuera.filter((x) => x !== id), orden: [...rev.orden, id] };
export const moverEn = (rev, i, paso) => ({ ...rev, orden: mover(rev.orden, i, paso) });
export function editarLinea(rev, id, texto, original) {
  const lineas = { ...rev.lineas };
  if (texto === original) delete lineas[id];
  else lineas[id] = texto;
  return { ...rev, lineas };
}
```

- [ ] **Paso 4:** `node --test "src/app/admin/lib/*.test.js"` → PASAN todas.
- [ ] **Paso 5: commit**

```bash
git add src/app/admin/lib/revision.js src/app/admin/lib/revision.test.js
git commit -m "Admin fase 2: propuesta de comentarios y revisión (lógica pura)"
```

### Task 5: API del PC — propuesta, aprobados y «no hay más»

**Files:**
- Modify: `src/app/admin/lib/api.js`
- Create: `src/app/admin/api/pc/pedidos/[id]/propuesta/route.js`, `src/app/admin/api/pc/pedidos/[id]/trae-mas-atendido/route.js`, `src/app/admin/api/pc/aprobados/route.js`
- Test: `src/app/admin/lib/api.test.js`

**Interfaces:**
- Consumes: Task 4 (`validarPropuesta`, `publicarPropuesta`, `vencida`, `aprobarVencido`, `listaFinal`, `masAtendido`); `tipoDe` (Task 1).
- Produces (todas con `ADMIN_PC_TOKEN`):
  - `pcPropuesta(req, id)` ← `POST /admin/api/pc/pedidos/<id>/propuesta` con `{ comentarios: [{ id, usuario, texto, linea, likes, dentro }] }` → `200 { ok: true, version, vence }` | 404 | 400 (no es por link o datos malos) | 409 (no está `en_pc`/`en_revision`); aviso con `<origen>/admin/cantados/<id>/revisar`.
  - `pcAprobados(req)` ← `GET /admin/api/pc/aprobados` → `[{ id, version, trae_mas, automatico, orden: [{ id, linea }], fuera: [id] }]`; antes aprueba solos los vencidos.
  - `pcTraeMasAtendido(req, id)` ← `POST …/trae-mas-atendido` → `200 { ok: true }` | 404 | 409.
  - Prueba: `montar(reloj = { t: T })` con `ahora: () => reloj.t`.

- [ ] **Paso 1: pruebas que fallan.** En `api.test.js`: agrega a los imports `import { aplicarRevision, aprobarRevision, pedirMas } from "./revision.js";`; en `montar` cambia la firma a `function montar(reloj = { t: T })` y `ahora: () => T` por `ahora: () => reloj.t`. Al final:

```js
const pcCon = (cuerpo, metodo = "POST") => new Request("https://x/admin/api/pc", {
  method: metodo, headers: { authorization: "Bearer pc-tok" }, body: cuerpo ? JSON.stringify(cuerpo) : undefined,
});
const COMENTARIOS = [
  { id: "a", usuario: "ua", texto: "ta", linea: "la,", likes: 5, dentro: true },
  { id: "b", usuario: "ub", texto: "tb", linea: "lb,", likes: 1, dentro: false },
];
async function enPc(almacen, extra = {}) {
  const p = { id: "c_l", creado: new Date(T).toISOString(), estado: "en_pc", tipo: "link", titulo: "perro", link: "https://vt.tiktok.com/ZS9/",
    estilo: "Salsa", tramos: [[0, 4]], original: null, gancho: null, pantallazos: [], motivo: null, ...extra };
  await almacen.guardar(p);
  return p.id;
}

test("las API nuevas del PC exigen su token", async () => {
  const { api } = montar();
  for (const f of ["pcPropuesta", "pcAprobados", "pcTraeMasAtendido"]) {
    assert.equal((await api[f](conSesion(), "c_l")).status, 401, f);
    assert.equal((await api[f](pc("malo"), "c_l")).status, 401, f);
  }
});

test("propuesta: pasa a en_revision, vence en 24 h y avisa con el enlace de revisión", async () => {
  const { api, almacen, avisos } = montar();
  const id = await enPc(almacen);
  const r = await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, version: 1, vence: new Date(T + 24 * 3600e3).toISOString() });
  const p = await almacen.leer(id);
  assert.equal(p.estado, "en_revision");
  assert.deepEqual(p.revision.orden, ["a"]);
  assert.match(avisos[0], /https:\/\/x\/admin\/cantados\/c_l\/revisar/);
});

test("propuesta: solo para pedidos por link que el PC tiene; datos malos = 400", async () => {
  const { api, almacen } = montar();
  assert.equal((await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), "no_existe")).status, 404);
  await enPc(almacen, { tipo: "pantallazos" });
  assert.equal((await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), "c_l")).status, 400);
  await enPc(almacen, { estado: "listo" });
  assert.equal((await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), "c_l")).status, 409);
  await enPc(almacen);
  assert.equal((await api.pcPropuesta(pcCon({ comentarios: [] }), "c_l")).status, 400);
  assert.equal((await almacen.leer("c_l")).estado, "en_pc");
});

test("aprobados: lista final de aprobados y de «trae más»; los vencidos se aprueban solos", async () => {
  const reloj = { t: T };
  const { api, almacen } = montar(reloj);
  for (const id of ["c_a", "c_b", "c_c"]) {
    await enPc(almacen, { id });
    await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  }
  const a = aplicarRevision(await almacen.leer("c_a"), { orden: ["b"], fuera: ["a"], lineas: { b: "otra," } }, T).pedido;
  await almacen.guardar(aprobarRevision(a, T).pedido);
  await almacen.guardar(pedirMas(await almacen.leer("c_b"), T).pedido);
  reloj.t = T + 22 * 3600e3;                         // c_c vence; c_b pidió más: no vence
  const lista = await (await api.pcAprobados(pcCon(null, "GET"))).json();
  assert.deepEqual(lista.map((x) => [x.id, x.trae_mas, x.automatico]).sort(), [["c_a", false, false], ["c_b", true, false], ["c_c", false, true]]);
  assert.deepEqual(lista.find((x) => x.id === "c_a").orden, [{ id: "b", linea: "otra," }]);
  assert.equal(lista.find((x) => x.id === "c_a").version, 1);
  assert.deepEqual(lista.find((x) => x.id === "c_b").fuera, ["b"]);
  assert.equal((await almacen.leer("c_c")).estado, "aprobado");
});

test("trae-mas-atendido: vuelve a revisión con 24 h nuevas y avisa; sin «trae más» = 409", async () => {
  const reloj = { t: T };
  const { api, almacen, avisos } = montar(reloj);
  const id = await enPc(almacen);
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  assert.equal((await api.pcTraeMasAtendido(pcCon({}), id)).status, 409);
  await almacen.guardar(pedirMas(await almacen.leer(id), T).pedido);
  reloj.t = T + 24 * 3600e3;
  assert.equal((await api.pcTraeMasAtendido(pcCon({}), id)).status, 200);
  const p = await almacen.leer(id);
  assert.deepEqual([p.estado, p.revision.trae_mas, p.propuesta.vence], ["en_revision", false, new Date(T + 48 * 3600e3).toISOString()]);
  assert.match(avisos.at(-1), /no hay más/i);
  assert.equal((await api.pcTraeMasAtendido(pcCon({}), "no_existe")).status, 404);
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/api.test.js` → FALLAN con `TypeError: api[f] is not a function` / `api.pcPropuesta is not a function`.
- [ ] **Paso 3: implementación en `api.js`.** Debajo del import de `./pedido.js`:

```js
import { aprobarVencido, listaFinal, masAtendido, publicarPropuesta, validarPropuesta, vencida } from "./revision.js";
```

Debajo de `const cuerpo = …`:

```js
// Enlace absoluto a una página del pedido (sirve igual en la vista previa del PR y en producción).
const enlace = (req, id, pagina) => `${new URL(req.url).origin}/admin/cantados/${id}/${pagina}`;
```

Dentro del objeto que devuelve `crearApi`, después de `pcEntregado`:

```js
    pcPropuesta: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      if (tipoDe(p) !== "link") return json({ error: "Ese pedido no es por link." }, 400);
      if (!["en_pc", "en_revision"].includes(p.estado)) return json({ error: "Ese pedido no está esperando propuesta." }, 409);
      const { comentarios, errores } = validarPropuesta((await cuerpo(req)).comentarios);
      if (errores.length) return json({ error: errores.join(" ") }, 400);
      const nuevo = publicarPropuesta(p, comentarios, ahora());
      await almacen.guardar(nuevo);
      await avisar(`📝 Ya puedes revisar los comentarios de ${nombreVisible(p)}: ${enlace(req, p.id, "revisar")} — si no lo revisas, se aprueba solo en la franja de mañana.`).catch(() => {});
      return json({ ok: true, version: nuevo.propuesta.version, vence: nuevo.propuesta.vence });
    }),
    pcAprobados: delPc(async () => {
      const todos = await almacen.listar();
      for (const [k, p] of todos.entries()) {
        if (vencida(p, ahora())) {
          todos[k] = aprobarVencido(p, ahora());
          await almacen.guardar(todos[k]);
        }
      }
      const salen = todos.filter((p) => p.propuesta && (p.estado === "aprobado" || (p.estado === "en_revision" && p.revision?.trae_mas)));
      return json(salen.map((p) => ({ id: p.id, version: p.propuesta.version, trae_mas: Boolean(p.revision.trae_mas),
        automatico: Boolean(p.automatico), orden: listaFinal(p), fuera: p.revision.fuera })));
    }),
    pcTraeMasAtendido: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      const { pedido, errores } = masAtendido(p, ahora());
      if (errores.length) return json({ error: errores.join(" ") }, 409);
      await almacen.guardar(pedido);
      await avisar(`🔄 No hay más comentarios para ${nombreVisible(p)}. Sigue en revisión: ${enlace(req, p.id, "revisar")}`).catch(() => {});
      return json({ ok: true });
    }),
```

Rutas:

`src/app/admin/api/pc/pedidos/[id]/propuesta/route.js`
```js
import { conApi } from "../../../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req, id) => api.pcPropuesta(req, id));
```
`src/app/admin/api/pc/pedidos/[id]/trae-mas-atendido/route.js`
```js
import { conApi } from "../../../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req, id) => api.pcTraeMasAtendido(req, id));
```
`src/app/admin/api/pc/aprobados/route.js`
```js
import { conApi } from "../../../lib/deps.js";
export const runtime = "nodejs";
export const GET = conApi((api, req) => api.pcAprobados(req));
```

- [ ] **Paso 4:** `node --test "src/app/admin/lib/*.test.js" && npx eslint --ignore-pattern ".claude/**" && npm run build` → todo PASA; el build lista `/admin/api/pc/aprobados`, `/admin/api/pc/pedidos/[id]/propuesta` y `/admin/api/pc/pedidos/[id]/trae-mas-atendido`.
- [ ] **Paso 5: commit**

```bash
git add src/app/admin/lib/api.js src/app/admin/lib/api.test.js src/app/admin/api/pc
git commit -m "Admin fase 2: API del PC para publicar la propuesta, traer aprobados y «no hay más»"
```

### Task 6: API de sesión — guardar la revisión, aprobar y «Trae más»

**Files:**
- Modify: `src/app/admin/lib/api.js`
- Create: `src/app/admin/api/cantados/[id]/revision/route.js`, `src/app/admin/api/cantados/[id]/aprobar/route.js`, `src/app/admin/api/cantados/[id]/trae-mas/route.js`
- Test: `src/app/admin/lib/api.test.js`

**Interfaces:**
- Consumes: Task 4 (`aplicarRevision`, `aprobarRevision`, `pedirMas`, `noEditable`); helpers de prueba `pcCon`, `enPc`, `COMENTARIOS`, `montar(reloj)` (Task 5).
- Produces (todas con sesión):
  - `revision(req, id)` ← `PATCH /admin/api/cantados/<id>/revision` con `{ orden, fuera, lineas }` → `200 { ok: true }` | 404 | 409 (no editable: no está en revisión, pidió más o venció) | 400 (lista o línea inválida).
  - `aprobar(req, id)` ← `POST …/aprobar` y `traeMas(req, id)` ← `POST …/trae-mas` → `200 { ok: true }` | 404 | 409.

- [ ] **Paso 1: pruebas que fallan** (al final de `api.test.js`):

```js
test("las API de revisión exigen sesión; el token del PC no sirve", async () => {
  const { api } = montar();
  for (const f of ["revision", "aprobar", "traeMas"]) {
    assert.equal((await api[f](sinSesion(), "c_l")).status, 401, f);
    assert.equal((await api[f](pc(), "c_l")).status, 401, f);
  }
});

test("revisión: guarda cada cambio, aprueba y ya no deja cambiar", async () => {
  const { api, almacen } = montar();
  const id = await enPc(almacen);
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  const r = await api.revision(conSesion({ orden: ["b", "a"], fuera: [], lineas: { b: "cambiada," } }, "PATCH"), id);
  assert.equal(r.status, 200);
  assert.deepEqual((await almacen.leer(id)).revision.orden, ["b", "a"]);
  assert.equal((await api.revision(conSesion({ orden: ["b"], fuera: [] }, "PATCH"), id)).status, 400);
  assert.equal((await api.aprobar(conSesion(), id)).status, 200);
  assert.equal((await almacen.leer(id)).estado, "aprobado");
  assert.equal((await api.revision(conSesion({ orden: ["a", "b"], fuera: [] }, "PATCH"), id)).status, 409);
  assert.equal((await api.traeMas(conSesion(), id)).status, 409);
  assert.equal((await api.aprobar(conSesion(), "no_existe")).status, 404);
});

test("trae más congela la revisión hasta la franja; vencido no se aprueba a mano", async () => {
  const reloj = { t: T };
  const { api, almacen } = montar(reloj);
  const id = await enPc(almacen);
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  assert.equal((await api.traeMas(conSesion(), id)).status, 200);
  assert.equal((await almacen.leer(id)).revision.trae_mas, true);
  assert.equal((await api.aprobar(conSesion(), id)).status, 409);
  const otro = await enPc(almacen, { id: "c_v" });
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), otro);
  reloj.t = T + 22 * 3600e3;
  assert.equal((await api.aprobar(conSesion(), otro)).status, 409);
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/api.test.js` → FALLAN con `TypeError: api[f] is not a function`.
- [ ] **Paso 3: implementación.** Import de `./revision.js`:

```js
import { aplicarRevision, aprobarRevision, aprobarVencido, listaFinal, masAtendido, noEditable, pedirMas, publicarPropuesta, validarPropuesta, vencida } from "./revision.js";
```

Dentro de `crearApi`, debajo de `verificarArchivos`:

```js
  // Aprobar o pedir más: cierra la revisión de Oscar (409 si ya no se puede).
  async function cerrarRevision(id, paso) {
    const p = await almacen.leer(id);
    if (!p) return json({ error: "Ese pedido no existe." }, 404);
    const { pedido, errores } = paso(p, ahora());
    if (errores.length) return json({ error: errores.join(" ") }, 409);
    await almacen.guardar(pedido);
    return json({ ok: true });
  }
```

En el objeto, después de `cancelar`:

```js
    revision: conSesion(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      const no = noEditable(p, ahora());
      if (no) return json({ error: no }, 409);
      const { pedido, errores } = aplicarRevision(p, await cuerpo(req), ahora());
      if (errores.length) return json({ error: errores.join(" ") }, 400);
      await almacen.guardar(pedido);
      return json({ ok: true });
    }),
    aprobar: conSesion(async (req, id) => cerrarRevision(id, aprobarRevision)),
    traeMas: conSesion(async (req, id) => cerrarRevision(id, pedirMas)),
```

Rutas (`../../../../lib/deps.js`, como `enviar`):

`src/app/admin/api/cantados/[id]/revision/route.js`
```js
import { conApi } from "../../../../lib/deps.js";
export const runtime = "nodejs";
export const PATCH = conApi((api, req, id) => api.revision(req, id));
```
`src/app/admin/api/cantados/[id]/aprobar/route.js`
```js
import { conApi } from "../../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req, id) => api.aprobar(req, id));
```
`src/app/admin/api/cantados/[id]/trae-mas/route.js`
```js
import { conApi } from "../../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req, id) => api.traeMas(req, id));
```

- [ ] **Paso 4:** `node --test "src/app/admin/lib/*.test.js" && npx eslint --ignore-pattern ".claude/**" && npm run build` → todo PASA.
- [ ] **Paso 5: commit**

```bash
git add src/app/admin/lib/api.js src/app/admin/lib/api.test.js src/app/admin/api/cantados
git commit -m "Admin fase 2: API de sesión para guardar la revisión, aprobar y pedir más"
```

### Task 7: Pantalla de revisión y lista con «Revisar»

**Files:**
- Modify: `src/app/admin/lib/pedido.js` (agregar `ordenarLista`), `src/app/admin/page.jsx`, `src/app/admin/ListaPedidos.jsx`
- Create: `src/app/admin/cantados/[id]/pedidoDeSesion.js`, `src/app/admin/cantados/[id]/revisar/page.jsx`, `src/app/admin/cantados/[id]/revisar/Revisar.jsx`
- Test: `src/app/admin/lib/pedido.test.js`

**Interfaces:**
- Consumes: Task 4 (`horasRestantes`, `noEditable`, `quitar`, `meter`, `moverEn`, `editarLinea`, `ponerComa`, `lineaValida`); Task 6 (rutas `PATCH …/revision`, `POST …/aprobar`, `POST …/trae-mas`); `EN_EL_PC`, `tipoDe` (Tasks 1–2).
- Produces: `ordenarLista(lista) → lista` (`en_revision` primero, luego `necesita_pantallazos`, el resto en su orden); `pedidoDeSesion(id, ahoraMs) → Promise<{ dentro: boolean, pedido?: object|null, error?: string }>` (lo usa también la Task 8); página `/admin/cantados/<id>/revisar`.

- [ ] **Paso 1: prueba que falla.** En `pedido.test.js` agrega `ordenarLista` al import de la línea 3 y al final:

```js
test("la lista pone arriba lo que espera a Oscar: revisión y luego pantallazos", () => {
  const l = [{ id: "1", estado: "listo" }, { id: "2", estado: "necesita_pantallazos" }, { id: "3", estado: "en_revision" },
    { id: "4", estado: "en_pc" }, { id: "5", estado: "en_revision" }];
  assert.deepEqual(ordenarLista(l).map((p) => p.id), ["3", "5", "2", "1", "4"]);
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/pedido.test.js` → FALLA (`does not provide an export named 'ordenarLista'`).
- [ ] **Paso 3: `ordenarLista` en `pedido.js`** (al final):

```js
const PRIORIDAD = { en_revision: 0, necesita_pantallazos: 1 };   // lo que espera a Oscar va arriba
export const ordenarLista = (lista) => [...lista].sort((a, b) => (PRIORIDAD[a.estado] ?? 2) - (PRIORIDAD[b.estado] ?? 2));
```

- [ ] **Paso 4:** `node --test "src/app/admin/lib/*.test.js"` → PASAN.
- [ ] **Paso 5: lectura del pedido para las páginas** (`src/app/admin/cantados/[id]/pedidoDeSesion.js`):

```js
// Lee un pedido para las páginas /admin/cantados/<id>/… (solo con sesión). Spec fase 2 §4.
import { cookies } from "next/headers";
import { urlRedisDirecta } from "../../../api/lead/config.js";
import { almacenRedis } from "../../lib/almacen.js";
import { COOKIE, sesionValida } from "../../lib/sesion.js";

export async function pedidoDeSesion(id, ahoraMs) {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!sesionValida(valor, process.env.ADMIN_CLAVE, ahoraMs)) return { dentro: false };   // el layout ya muestra la entrada
  let almacen;
  try {
    const url = urlRedisDirecta(process.env);
    if (!url) throw new Error("sin url");
    almacen = await almacenRedis(url);
    return { dentro: true, pedido: await almacen.leer(String(id)) };
  } catch {
    return { dentro: true, error: "No se pudo leer el pedido (Redis no responde)." };
  } finally {
    await almacen?.cerrar();
  }
}
```

- [ ] **Paso 6: página** (`src/app/admin/cantados/[id]/revisar/page.jsx`):

```jsx
import { nombreVisible } from "../../../lib/pedido.js";
import { horasRestantes, noEditable } from "../../../lib/revision.js";
import { pedidoDeSesion } from "../pedidoDeSesion.js";
import Revisar from "./Revisar.jsx";

const ahora = () => Date.now();
export const dynamic = "force-dynamic";

export default async function PaginaRevisar({ params }) {
  const { id } = await params;
  const t = ahora();
  const { dentro, pedido: p, error } = await pedidoDeSesion(id, t);
  if (!dentro) return null;
  if (error) return <p className="text-[#E10600]">{error}</p>;
  if (!p?.propuesta)
    return (
      <div className="flex flex-col gap-4 pt-10 text-center">
        <p>Este pedido no tiene comentarios para revisar.</p>
        <a href="/admin" className="underline">Volver a la lista</a>
      </div>
    );
  const aviso = p.estado === "aprobado" ? "Ya está aprobado: se edita en la franja de las 2 p. m." : noEditable(p, t);
  return (
    <Revisar id={p.id} nombre={nombreVisible(p)} comentarios={p.propuesta.comentarios} revisionInicial={p.revision}
      horas={horasRestantes(p, t)} abierta={!aviso} aviso={aviso || ""} />
  );
}
```

- [ ] **Paso 7: pantalla** (`src/app/admin/cantados/[id]/revisar/Revisar.jsx`):

```jsx
"use client";
import { useRef, useState } from "react";
import { editarLinea, lineaValida, meter, moverEn, ponerComa, quitar } from "../../../lib/revision.js";

const grande = "rounded p-4 text-lg font-bold disabled:opacity-40";
const chico = "min-h-[44px] min-w-[44px] rounded border border-black/20 px-2 text-xl";

export default function Revisar({ id, nombre, comentarios, revisionInicial, horas, abierta, aviso }) {
  const porId = Object.fromEntries(comentarios.map((c) => [c.id, c]));
  const [rev, setRev] = useState({ orden: revisionInicial.orden, fuera: revisionInicial.fuera, lineas: revisionInicial.lineas });
  const [editando, setEditando] = useState(null); // { id, texto }
  const [error, setError] = useState("");
  const [cerrada, setCerrada] = useState(abierta ? "" : aviso);
  const [enviando, setEnviando] = useState(false);
  const cola = useRef(Promise.resolve());
  const fallo = useRef(false);
  const linea = (cid) => rev.lineas[cid] ?? porId[cid].linea;

  // Cada cambio se guarda enseguida, en fila (el servidor recibe el estado completo).
  function guardar(nueva) {
    if (nueva === rev) return;
    setRev(nueva);
    setError("");
    const paso = cola.current.then(async () => {
      const r = await fetch(`/admin/api/cantados/${id}/revision`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nueva),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      fallo.current = false;
    });
    cola.current = paso.catch((e) => {
      fallo.current = true;
      setError(e.message);
    });
  }
  function quitarUno(cid) {
    if (rev.orden.length <= 1) return setError("Deja al menos un comentario.");
    guardar(quitar(rev, cid));
  }
  function guardarLinea() {
    const t = ponerComa(editando.texto);
    if (!lineaValida(t)) return setError("La línea no puede quedar vacía.");
    guardar(editarLinea(rev, editando.id, t, porId[editando.id].linea));
    setEditando(null);
  }
  async function cerrar(ruta, mensaje) {
    setEnviando(true);
    setError("");
    try {
      await cola.current;
      if (fallo.current) throw new Error("Hay un cambio sin guardar: recarga la página.");
      const r = await fetch(`/admin/api/cantados/${id}/${ruta}`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo.");
      setCerrada(mensaje);
    } catch (e) {
      setError(e.message);
    }
    setEnviando(false);
  }

  if (cerrada)
    return (
      <div className="flex flex-col gap-4 pt-10 text-center">
        <p className="text-xl font-bold">{cerrada}</p>
        <a href="/admin" className="underline">Volver a la lista</a>
      </div>
    );

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="flex items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-2xl font-bold">{nombre}</h1>
        <a href="/admin" className="text-sm underline">Volver</a>
      </div>
      <p className="rounded bg-yellow-200 p-2 text-sm">
        Se aprueba solo en {horas} h (en la franja de las 2 p. m.). Cada cambio se guarda solo.
      </p>
      {error && <p className="rounded bg-red-100 p-2 text-[#E10600]">{error}</p>}
      <ol className="flex flex-col gap-2">
        {rev.orden.map((cid, i) => {
          const c = porId[cid];
          return (
            <li key={cid} className="flex flex-col gap-2 rounded border border-black/20 bg-white p-3">
              <div className="flex items-start gap-2">
                <span className="rounded bg-green-600 px-2 text-white" aria-label="Dentro">✓ {i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-black/60">
                    {c.usuario}
                    {c.likes != null ? ` · ${c.likes} ♥` : ""}
                  </p>
                  <p className="text-sm text-black/70">{c.texto}</p>
                </div>
              </div>
              {editando?.id === cid ? (
                <div className="flex flex-col gap-2">
                  <textarea value={editando.texto} rows={2} className="rounded border border-black/30 p-2"
                    onChange={(e) => setEditando({ id: cid, texto: e.target.value })} />
                  <div className="flex gap-2">
                    <button onClick={guardarLinea} className="flex-1 rounded bg-[#E10600] p-2 font-bold text-white">Guardar</button>
                    <button onClick={() => setEditando(null)} className="flex-1 rounded border border-black/30 p-2">Cancelar</button>
                  </div>
                </div>
              ) : (
                <p className="font-bold">{linea(cid)}</p>
              )}
              <div className="flex gap-2">
                <button aria-label="Subir" className={chico} onClick={() => guardar(moverEn(rev, i, -1))}>↑</button>
                <button aria-label="Bajar" className={chico} onClick={() => guardar(moverEn(rev, i, 1))}>↓</button>
                <button aria-label="Corregir la línea" className={chico} onClick={() => setEditando({ id: cid, texto: linea(cid) })}>✎</button>
                <button aria-label="Quitar" className={`${chico} ml-auto text-[#E10600]`} onClick={() => quitarUno(cid)}>✕</button>
              </div>
            </li>
          );
        })}
      </ol>
      {rev.fuera.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Fuera</h2>
          <ul className="flex flex-col gap-2">
            {rev.fuera.map((cid) => (
              <li key={cid} className="flex items-center gap-2 rounded border border-black/10 bg-white/60 p-2">
                <span className="min-w-0 flex-1 text-sm text-black/70">{linea(cid)}</span>
                <button aria-label="Meter" className={chico} onClick={() => guardar(meter(rev, cid))}>↩</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="fixed inset-x-0 bottom-0 mx-auto grid max-w-[480px] grid-cols-2 gap-2 bg-[#faf6ee] p-4">
        <button disabled={enviando} className={`${grande} border-2 border-[#E10600] text-[#E10600]`}
          onClick={() => confirm("¿Pedir otros comentarios en lugar de los que quitaste? Llegan en la franja de las 2 p. m.")
            && cerrar("trae-mas", "Listo: en la franja de las 2 p. m. Claude pone otros en lugar de los que quitaste y te llega el enlace otra vez.")}>
          Trae más
        </button>
        <button disabled={enviando} className={`${grande} bg-[#E10600] text-white`}
          onClick={() => cerrar("aprobar", "Aprobado: se edita en la franja de las 2 p. m.")}>
          Aprobar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Paso 8: lista.** En `page.jsx`: import `import { nombreVisible, ordenarLista, tipoDe } from "./lib/pedido.js";` y reemplaza la asignación de `pedidos` por:

```js
    pedidos = ordenarLista(await almacen.listar()).map((p) => ({
      id: p.id, nombre: nombreVisible(p), creado: p.creado, estado: p.estado, motivo: p.motivo ?? null,
      tipo: tipoDe(p), listos: Boolean(p.pantallazos_listos),
    }));
```

En `ListaPedidos.jsx`: agrega `import { EN_EL_PC } from "./lib/pedido.js";`; en `ETIQUETA` agrega:

```js
  en_revision: () => "Esperando tu revisión",
  aprobado: () => "Aprobado: se edita en la franja de las 2 p. m.",
```

y reemplaza el bloque `{p.estado !== "en_pc" && ( <button …>Cancelar</button> )}` por:

```jsx
            <div className="flex shrink-0 flex-col gap-2">
              {p.estado === "en_revision" && (
                <a href={`/admin/cantados/${p.id}/revisar`} className="rounded bg-[#E10600] px-3 py-2 text-center font-bold text-white">
                  Revisar
                </a>
              )}
              {!EN_EL_PC.includes(p.estado) && (
                <button onClick={() => cancelar(p.id)} className="rounded border border-[#E10600] px-3 py-2 text-[#E10600]">
                  Cancelar
                </button>
              )}
            </div>
```

- [ ] **Paso 9:** `npm test && npx eslint --ignore-pattern ".claude/**" && npm run build` → sin errores; el build lista `/admin/cantados/[id]/revisar` como dinámica (ƒ).
- [ ] **Paso 10: commit**

```bash
git add src/app/admin/lib/pedido.js src/app/admin/lib/pedido.test.js src/app/admin/page.jsx src/app/admin/ListaPedidos.jsx "src/app/admin/cantados/[id]"
git commit -m "Admin fase 2: pantalla de revisión de comentarios y lista con «Revisar» arriba"
```

### Task 8: «Necesita pantallazos»: API, subida y pantalla

**Files:**
- Modify: `src/app/admin/lib/pedido.js` (`aplicarCambios`, `subidaPermitida`), `src/app/admin/lib/api.js` (`enviar`, `autorizarSubida`, `pcPedidos`, `pcNecesitaPantallazos`), `src/app/admin/cantados/nuevo/NuevoPedido.jsx` (usa los helpers compartidos), `src/app/admin/ListaPedidos.jsx`
- Create: `src/app/admin/api/pc/pedidos/[id]/necesita-pantallazos/route.js`, `src/app/admin/cantados/subidas.js`, `src/app/admin/cantados/Barra.jsx`, `src/app/admin/cantados/ListaPantallazos.jsx`, `src/app/admin/cantados/[id]/pantallazos/page.jsx`, `src/app/admin/cantados/[id]/pantallazos/SubirPantallazos.jsx`
- Test: `src/app/admin/lib/pedido.test.js`, `src/app/admin/lib/api.test.js`

**Interfaces:**
- Consumes: `pedidoDeSesion` (Task 7); `enPc`, `pcCon` (Task 5); `firmar(null) → null` y guarda de `pcBajado` (Task 2).
- Produces: `subidaPermitida(p, pathname) → boolean`; `pcNecesitaPantallazos(req, id)` ← `POST /admin/api/pc/pedidos/<id>/necesita-pantallazos` con `{ motivo }` → `200` | 404 | 409 (solo `link` en `en_pc`); `enviar` en `necesita_pantallazos` marca `pantallazos_listos`; `pcPedidos` incluye `necesita_pantallazos` con `pantallazos_listos` (con `original` y `gancho` en `null`). Cliente: `encolarPatch(cola, id, cuerpo) → Promise<pedido>`, `subirArchivo(id, clave, file, nombre, fijarTrabajo) → Promise<{ pathname, tamano, nombre }>`, `<Barra t>`, `<ListaPantallazos pants onMover onQuitar>`.

- [ ] **Paso 1: pruebas que fallan.** En `pedido.test.js` agrega `subidaPermitida` al import de la línea 3 y al final:

```js
test("en necesita_pantallazos solo se cambian los pantallazos, y solo hasta enviarlos", () => {
  const n = { ...L(), estado: "necesita_pantallazos", pantallazos: [], pantallazos_listos: false };
  const r = aplicarCambios(n, { pantallazos: [arch("p01.jpg")] });
  assert.deepEqual(r.errores, []);
  assert.equal(r.pedido.pantallazos.length, 1);
  assert.match(aplicarCambios(n, { titulo: "x" }).errores[0], /solo se pueden subir pantallazos/);
  assert.match(aplicarCambios({ ...n, pantallazos_listos: true }, { pantallazos: [] }).errores[0], /Ya enviaste/);
});

test("subidas: en subiendo todo lo del pedido; en necesita_pantallazos solo pNN hasta enviarlos", () => {
  const n = { ...L(), estado: "necesita_pantallazos", pantallazos_listos: false };
  const b = "cantados/c_20261021_ab12/";
  assert.equal(subidaPermitida(P(), b + "gancho.mov"), true);
  assert.equal(subidaPermitida(n, b + "p01.jpg"), true);
  assert.equal(subidaPermitida(n, b + "original.mp4"), false);
  assert.equal(subidaPermitida({ ...n, pantallazos_listos: true }, b + "p02.jpg"), false);
  assert.equal(subidaPermitida({ ...P(), estado: "listo" }, b + "p01.jpg"), false);
  assert.equal(subidaPermitida(P(), "cantados/otro/p01.jpg"), false);
  assert.equal(subidaPermitida(P(), b + "../x"), false);
  assert.equal(subidaPermitida(null, b + "p01.jpg"), false);
});
```

En `api.test.js`, al final:

```js
test("necesita-pantallazos: solo el PC; el pedido por link pasa a pedir pantallazos y avisa", async () => {
  const { api, almacen, avisos } = montar();
  assert.equal((await api.pcNecesitaPantallazos(conSesion({}), "c_l")).status, 401);
  assert.equal((await api.pcNecesitaPantallazos(pc("malo"), "c_l")).status, 401);
  const id = await enPc(almacen);
  assert.equal((await api.pcNecesitaPantallazos(pcCon({ motivo: "TikTok pidió iniciar sesión" }), id)).status, 200);
  const p = await almacen.leer(id);
  assert.deepEqual([p.estado, p.motivo, p.pantallazos_listos], ["necesita_pantallazos", "TikTok pidió iniciar sesión", false]);
  assert.match(avisos.at(-1), /\/admin\/cantados\/c_l\/pantallazos/);
  assert.equal((await api.pcNecesitaPantallazos(pcCon({}), id)).status, 409);
  assert.equal((await api.pcNecesitaPantallazos(pcCon({}), "no_existe")).status, 404);
});

test("pantallazos en necesita_pantallazos: se suben, se envían y el PC los recibe sin original ni gancho", async () => {
  const { api, almacen, tamanos, avisos } = montar();
  const id = await enPc(almacen, { estado: "necesita_pantallazos", pantallazos_listos: false });
  const base = `cantados/${id}/`;
  await api.autorizarSubida(conSesion(), base + "p01.jpg", id);
  await assert.rejects(api.autorizarSubida(conSesion(), base + "original.mp4", id));
  tamanos.set(base + "p01.jpg", 10);
  assert.equal((await api.cambiar(conSesion({ pantallazos: [{ pathname: base + "p01.jpg", tamano: 10 }] }, "PATCH"), id)).status, 200);
  assert.deepEqual(await (await api.pcPedidos(pc())).json(), []);           // todavía no los envía
  assert.equal((await api.enviar(conSesion(), id)).status, 200);
  assert.match(avisos.at(-1), /pantallazos/);
  const [p] = await (await api.pcPedidos(pc())).json();
  assert.deepEqual([p.estado, p.original, p.gancho, p.pantallazos[0].url], ["necesita_pantallazos", null, null, `https://firmado/${base}p01.jpg`]);
  assert.equal((await api.enviar(conSesion(), id)).status, 409);
  assert.equal((await api.pcBajado(pc(), id)).status, 200);
  assert.equal((await almacen.leer(id)).estado, "en_pc");
});
```

- [ ] **Paso 2:** `node --test "src/app/admin/lib/*.test.js"` → FALLAN las 4 nuevas (falta `subidaPermitida`, `pcNecesitaPantallazos`).
- [ ] **Paso 3: modelo (`pedido.js`).** En `aplicarCambios` reemplaza `if (p.estado !== "subiendo") return { … };` por:

```js
  if (p.estado === "necesita_pantallazos") {
    if (p.pantallazos_listos) return { pedido: p, errores: ["Ya enviaste los pantallazos."] };
    if (Object.keys(c).some((k) => k !== "pantallazos")) return { pedido: p, errores: ["En este pedido solo se pueden subir pantallazos."] };
  } else if (p.estado !== "subiendo") return { pedido: p, errores: ["Este pedido ya se envió; cancélalo y súbelo de nuevo."] };
```

y en el bloque de pantallazos cambia `if (tipoDe(p) !== "pantallazos")` por `if (tipoDe(p) !== "pantallazos" && p.estado !== "necesita_pantallazos")`. Al final del archivo:

```js
// ¿Puede el navegador subir este archivo? En subiendo, cualquiera de su carpeta; en necesita_pantallazos, solo pNN.
export function subidaPermitida(p, pathname) {
  if (!p || typeof pathname !== "string" || pathname.includes("..") || !pathname.startsWith(prefijo(p.id))) return false;
  if (p.estado === "subiendo") return true;
  return p.estado === "necesita_pantallazos" && !p.pantallazos_listos && PATRON.pantallazo.test(pathname.slice(prefijo(p.id).length));
}
```

- [ ] **Paso 4: API (`api.js`).** Agrega `subidaPermitida` al import de `./pedido.js`. En `enviar`, justo después del 404:

```js
      if (p.estado === "necesita_pantallazos") {
        if (p.pantallazos_listos) return json({ error: "Ya enviaste los pantallazos." }, 409);
        if (!p.pantallazos?.length || !p.pantallazos.every((a) => a.tamano > 0)) return json({ error: "Faltan los pantallazos." }, 400);
        const malo = await verificarArchivos(p);
        if (malo) return json({ error: malo }, 400);
        await almacen.guardar({ ...p, pantallazos_listos: true });
        await avisar(`📥 Recibí los pantallazos de ${nombreVisible(p)} — sale a las 2 p. m.`).catch(() => {});
        return json({ ok: true });
      }
```

En `autorizarSubida` reemplaza la línea del `if (!p || …)` por:

```js
      if (!subidaPermitida(p, pathname)) throw new Error("Subida no permitida.");
```

En `pcPedidos`: `const paraPc = todos.filter((p) => p.estado === "listo" || (p.estado === "necesita_pantallazos" && p.pantallazos_listos));`. Después de `pcTraeMasAtendido`:

```js
    pcNecesitaPantallazos: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      if (tipoDe(p) !== "link" || p.estado !== "en_pc") return json({ error: "Ese pedido no puede pasar a pantallazos." }, 409);
      const motivo = String((await cuerpo(req)).motivo || "TikTok no dejó leer los comentarios").slice(0, 300);
      await almacen.guardar({ ...p, estado: "necesita_pantallazos", pantallazos: [], pantallazos_listos: false, motivo });
      await avisar(`📸 ${nombreVisible(p)}: ${motivo}. Sube los pantallazos aquí: ${enlace(req, p.id, "pantallazos")}`).catch(() => {});
      return json({ ok: true });
    }),
```

Ruta `src/app/admin/api/pc/pedidos/[id]/necesita-pantallazos/route.js`:

```js
import { conApi } from "../../../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req, id) => api.pcNecesitaPantallazos(req, id));
```

- [ ] **Paso 5:** `node --test "src/app/admin/lib/*.test.js"` → PASAN todas.
- [ ] **Paso 6: piezas compartidas de la subida.** `src/app/admin/cantados/subidas.js`:

```js
// Subida directa del navegador a Blob privado y PATCH en fila (compartido por Nuevo video y Subir pantallazos).
import { upload } from "@vercel/blob/client";

// PATCH en fila (el servidor lee y escribe el pedido completo: de a uno evita pisarse).
export function encolarPatch(cola, id, cuerpo) {
  const paso = cola.current.then(async () => {
    const r = await fetch(`/admin/api/cantados/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
    return d;
  });
  cola.current = paso.catch(() => {});
  return paso;
}

// Sube un archivo a Blob con barra de progreso. Si falla, queda "Reintentar" y espera el toque.
export async function subirArchivo(id, clave, file, nombre, fijarTrabajo) {
  const pathname = `cantados/${id}/${nombre}`;
  for (;;) {
    fijarTrabajo(clave, { pct: 0 });
    try {
      await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/admin/api/cantados/subir",
        clientPayload: id,
        multipart: file.size > 20e6,
        onUploadProgress: ({ percentage }) => fijarTrabajo(clave, { pct: Math.round(percentage) }),
      });
      fijarTrabajo(clave, null);
      return { pathname, tamano: file.size, nombre: file.name };
    } catch (e) {
      await new Promise((siguiente) => fijarTrabajo(clave, { pct: 100, error: e?.message || "Falló la subida.", reintentar: siguiente }));
    }
  }
}
```

`src/app/admin/cantados/Barra.jsx` (la misma `Barra` de `NuevoPedido.jsx`, líneas 24-44, ahora exportada):

```jsx
"use client";
export default function Barra({ t }) {
  if (!t) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-3 rounded bg-black/15">
        <div className={`h-3 rounded ${t.error ? "bg-red-700" : "bg-[#E10600]"}`} style={{ width: `${t.error ? 100 : t.pct}%` }} />
      </div>
      {t.error && (
        <div className="flex items-center justify-between gap-2 text-[#E10600]">
          <span>{t.error}</span>
          <button onClick={t.reintentar} className="rounded border border-[#E10600] px-3 py-2">
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
```

`src/app/admin/cantados/ListaPantallazos.jsx`:

```jsx
"use client";
export default function ListaPantallazos({ pants, onMover, onQuitar }) {
  return (
    <ul className="flex flex-col gap-2">
      {pants.map((p, i) => (
        <li key={p.pathname} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt="" className="h-16 w-16 rounded object-cover" />
          <span className="min-w-0 flex-1 truncate text-sm">
            {i + 1}. {p.nombre}
          </span>
          <button aria-label="Subir" className="px-2 py-2 text-xl" onClick={() => onMover(i, -1)}>↑</button>
          <button aria-label="Bajar" className="px-2 py-2 text-xl" onClick={() => onMover(i, 1)}>↓</button>
          <button aria-label="Quitar" className="px-2 py-2 text-xl" onClick={() => onQuitar(i)}>✕</button>
        </li>
      ))}
    </ul>
  );
}
```

En `NuevoPedido.jsx`: cambia `import { upload } from "@vercel/blob/client";` por

```js
import Barra from "../Barra.jsx";
import ListaPantallazos from "../ListaPantallazos.jsx";
import { encolarPatch, subirArchivo } from "../subidas.js";
```

borra la función `Barra`; reemplaza el comentario `// PATCH en fila…` y la función `patch` completa por `const patch = (cuerpo) => encolarPatch(cola, idRef.current, cuerpo);`; reemplaza el comentario `// Sube un archivo a Blob…` y la función `subir` completa por `const subir = (clave, file, nombre) => subirArchivo(idRef.current, clave, file, nombre, fijarTrabajo);`; reemplaza el `<ul className="flex flex-col gap-2">…</ul>` de los pantallazos por `<ListaPantallazos pants={pants} onMover={moverPant} onQuitar={quitarPant} />`.

- [ ] **Paso 7: pantalla de pantallazos.** `src/app/admin/cantados/[id]/pantallazos/page.jsx`:

```jsx
import { nombreVisible } from "../../../lib/pedido.js";
import { pedidoDeSesion } from "../pedidoDeSesion.js";
import SubirPantallazos from "./SubirPantallazos.jsx";

const ahora = () => Date.now();
export const dynamic = "force-dynamic";

export default async function PaginaPantallazos({ params }) {
  const { id } = await params;
  const { dentro, pedido: p, error } = await pedidoDeSesion(id, ahora());
  if (!dentro) return null;
  if (error) return <p className="text-[#E10600]">{error}</p>;
  if (p?.estado !== "necesita_pantallazos" || p.pantallazos_listos)
    return (
      <div className="flex flex-col gap-4 pt-10 text-center">
        <p>Este pedido no está esperando pantallazos.</p>
        <a href="/admin" className="underline">Volver a la lista</a>
      </div>
    );
  return <SubirPantallazos id={p.id} nombre={nombreVisible(p)} motivo={p.motivo || ""} />;
}
```

`src/app/admin/cantados/[id]/pantallazos/SubirPantallazos.jsx`:

```jsx
"use client";
import { useEffect, useRef, useState } from "react";
import Barra from "../../Barra.jsx";
import ListaPantallazos from "../../ListaPantallazos.jsx";
import { encolarPatch, subirArchivo } from "../../subidas.js";
import { extSegura, mover } from "../../../lib/editor.js";

const MAX_PANTALLAZOS = 40;

export default function SubirPantallazos({ id, nombre, motivo }) {
  const [pants, setPants] = useState([]); // { pathname, tamano, nombre, url }
  const [trabajos, setTrabajos] = useState({});
  const [ocupado, setOcupado] = useState(0);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const cola = useRef(Promise.resolve());
  const pantsRef = useRef([]);
  const contador = useRef(0);

  useEffect(() => {
    const actuales = pantsRef;
    return () => actuales.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, []);

  const fijarTrabajo = (k, v) =>
    setTrabajos((t) => {
      const n = { ...t };
      if (v) n[k] = v;
      else delete n[k];
      return n;
    });
  function fijarPants(lista) {
    pantsRef.current = lista;
    setPants(lista);
  }
  const guardarPants = (lista) =>
    encolarPatch(cola, id, { pantallazos: lista.map((p) => ({ pathname: p.pathname, tamano: p.tamano, nombre: p.nombre })) }).catch((e) =>
      setError(e.message),
    );

  async function elegir(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setError("");
    setOcupado((k) => k + 1);
    try {
      for (const file of files) {
        if (pantsRef.current.length >= MAX_PANTALLAZOS || contador.current >= 99) {
          setError(`Son máximo ${MAX_PANTALLAZOS} pantallazos.`);
          break;
        }
        contador.current += 1;
        const nn = String(contador.current).padStart(2, "0");
        try {
          const f = await subirArchivo(id, `pant${nn}`, file, `p${nn}${extSegura(file.name, "imagen")}`, fijarTrabajo);
          fijarPants([...pantsRef.current, { ...f, url: URL.createObjectURL(file) }]);
          await guardarPants(pantsRef.current);
        } catch (err) {
          setError(err.message);
        }
      }
    } finally {
      setOcupado((k) => k - 1);
    }
  }
  function moverPant(i, paso) {
    const lista = mover(pantsRef.current, i, paso);
    fijarPants(lista);
    guardarPants(lista);
  }
  function quitarPant(i) {
    URL.revokeObjectURL(pantsRef.current[i].url);
    const lista = pantsRef.current.filter((_, j) => j !== i);
    fijarPants(lista);
    guardarPants(lista);
  }
  async function enviar() {
    setEnviando(true);
    setError("");
    try {
      await cola.current;
      const r = await fetch(`/admin/api/cantados/${id}/enviar`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo enviar.");
      setListo(true);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  const subiendo = Object.keys(trabajos).length > 0 || ocupado > 0;
  if (listo)
    return (
      <div className="flex flex-col gap-4 pt-10 text-center">
        <p className="text-xl font-bold">Listo: sale a las 2 p. m. como pedido con pantallazos.</p>
        <a href="/admin" className="underline">Volver a la lista</a>
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pantallazos</h1>
        <a href="/admin" className="text-sm underline">Volver</a>
      </div>
      <p className="rounded bg-yellow-200 p-2 text-sm">
        {nombre}: {motivo || "TikTok no dejó leer los comentarios"}. Sube los pantallazos en el orden que quieres; el video, el bucle y el gancho ya los tiene el PC.
      </p>
      {error && <p className="rounded bg-red-100 p-2 text-[#E10600]">{error}</p>}
      <input type="file" accept="image/*" multiple onChange={elegir} />
      {Object.entries(trabajos).map(([k, t]) => (
        <Barra key={k} t={t} />
      ))}
      <ListaPantallazos pants={pants} onMover={moverPant} onQuitar={quitarPant} />
      <button className="rounded bg-[#E10600] p-4 text-lg font-bold text-white disabled:opacity-40"
        disabled={subiendo || enviando || pants.length === 0} onClick={enviar}>
        {enviando ? "Enviando…" : subiendo ? "Subiendo…" : "Enviar pantallazos"}
      </button>
    </div>
  );
}
```

- [ ] **Paso 8: lista.** En `ListaPedidos.jsx`, en `ETIQUETA`:

```js
  necesita_pantallazos: (p) => (p.listos ? "Pantallazos recibidos: sale a las 2 p. m." : "TikTok no dejó leer los comentarios: sube pantallazos"),
```

y dentro del `<div className="flex shrink-0 flex-col gap-2">`, después del enlace «Revisar»:

```jsx
              {p.estado === "necesita_pantallazos" && !p.listos && (
                <a href={`/admin/cantados/${p.id}/pantallazos`} className="rounded bg-[#E10600] px-3 py-2 text-center font-bold text-white">
                  Subir pantallazos
                </a>
              )}
```

- [ ] **Paso 9:** `npm test && npx eslint --ignore-pattern ".claude/**" && npm run build` → sin errores; el build lista `/admin/cantados/[id]/pantallazos` y `/admin/api/pc/pedidos/[id]/necesita-pantallazos`.
- [ ] **Paso 10: commit**

```bash
git add src/app/admin
git commit -m "Admin fase 2: pedido por link que TikTok bloquea sigue con pantallazos subidos en la web"
```

### Task 9: Documentación, verificación y PR

**Files:**
- Modify: `docs/admin.md`

- [ ] **Paso 1: `docs/admin.md`.** Después de la sección «Qué es y el flujo» agrega:

```markdown
## Pedidos por link (fase 2, spec `docs/superpowers/specs/2026-10-22-admin-fase2-design.md`)

1. **Nuevo video → Por link.** Oscar pega el link de TikTok (`https://www.tiktok.com/…`, `https://vm.tiktok.com/…` o `https://vt.tiktok.com/…`; otro no deja enviar), sube el video, marca los tramos y sube su gancho. No lleva pantallazos.
2. **Franja de las 2 p. m. (día 1).** El PC baja los archivos (la web los borra), lee los comentarios en TikTok con el original subido, Claude escoge y revisa con el reglamento y publica la **propuesta**: el pedido pasa a `en_revision` y llega al bot un aviso con el enlace `…/admin/cantados/<id>/revisar`.
3. **Revisión (celular).** Tarjetas en orden: ✓ = dentro, ✕ = a «Fuera», ↑↓ = mover, ✎ = corregir la línea que se canta (termina en coma; si no la pones, se agrega). En «Fuera», ↩ lo vuelve a meter al final. Cada cambio se guarda solo. «Aprobar» → `aprobado`. «Trae más» → la franja siguiente pone otros en lugar de los que quitaste y vuelve el enlace (si no hay más, llega «No hay más» y sigue en revisión 24 h nuevas).
4. **Plazo.** 24 h desde la propuesta; se da por vencida **2 h antes** para que la franja del día siguiente la recoja con la lista como esté (la pantalla dice «se aprueba solo en N h»).
5. **Franja siguiente (día 2).** El PC trae los aprobados, aplica la lista final, hace la canción, edita y entrega; al entregar se borra el registro.
6. **TikTok pide sesión o captcha.** El pedido pasa a `necesita_pantallazos` y llega el aviso con `…/admin/cantados/<id>/pantallazos`. Oscar sube las fotos en orden y toca «Enviar pantallazos»; la franja siguiente lo hace como pedido con pantallazos.

En Redis solo hay texto: la propuesta (`id`, usuario, texto, línea, likes, dentro) y la revisión (orden, fuera, líneas corregidas). Nada de imágenes.

### Estados

`subiendo` → `listo` → `en_pc` → (por link) `en_revision` → `aprobado` → (borrado al entregar). Ramas: `necesita_pantallazos` → `en_pc`; `fallido`. No se puede cancelar en `en_pc`, `en_revision` ni `aprobado` (el PC ya tiene el proyecto).
```

En la tabla «API» agrega:

```markdown
| `PATCH /admin/api/cantados/<id>/revision` | Sesión | Guarda `{orden, fuera, lineas}` completo; 409 si ya no está en revisión, pidió más o venció |
| `POST /admin/api/cantados/<id>/aprobar` | Sesión | `en_revision` → `aprobado` |
| `POST /admin/api/cantados/<id>/trae-mas` | Sesión | Marca «trae más» (la revisión queda congelada hasta la franja) |
| `POST /admin/api/pc/pedidos/<id>/propuesta` | Solo PC | Publica la propuesta, `en_revision`, vence en 24 h, aviso con enlace |
| `GET /admin/api/pc/aprobados` | Solo PC | Aprobados (y vencidos, que se aprueban solos) y los que piden más, con su lista final |
| `POST /admin/api/pc/pedidos/<id>/necesita-pantallazos` | Solo PC | Link bloqueado por TikTok: pide pantallazos con aviso |
| `POST /admin/api/pc/pedidos/<id>/trae-mas-atendido` | Solo PC | «No hay más»: vuelve a revisión con 24 h nuevas |
```

Cambia la fila de `GET /admin/api/pc/pedidos` a «Pedidos `listo` (con `tipo`, `link` y `estado`) y `necesita_pantallazos` con pantallazos enviados (`original`/`gancho` en `null`); limpia borradores > 48 h». En «Lo que NO se ha probado» agrega: «Fase 2 por link: revisión real en el celular, aviso real del bot con el enlace y un pedido real de punta a punta».

- [ ] **Paso 2:** `npm test && npx eslint --ignore-pattern ".claude/**" && npm run build` → sin errores. Anota en `docs/admin.md` («Lo verificado») los números que salieron.
- [ ] **Paso 3:** `git diff --name-only main...HEAD` → solo `src/app/admin/**`, `docs/admin.md`, la spec y este plan. Commit «Docs: admin fase 2 por link». Pedirle a Oscar el push (regla 5 del `CLAUDE.md`), o con su permiso `git push -u origin feat/admin-fase2-link` y `gh pr create --title "Admin fase 2: pedidos por link con revisión en la web"` con cuerpo en español (resumen, que no toca archivos compartidos, que no hay variables nuevas).
- [ ] **Paso 4:** en la vista previa del PR, en vista de teléfono (375 px): Nuevo video → los tres tipos (Remix deshabilitado); por link no muestra pantallazos y no deja enviar sin link válido; la lista y `/admin/cantados/<id>/revisar` sin sesión piden la clave.

---

## Parte B · PC (`D:\METACHO CLAUDE\PREMIERE-CLAUDE\cantados`; pruebas con `python -m pytest -q`; sin commits, ver decisión 18)

### Task 10: El sondeo usa el original local

**Files:**
- Modify: `herramientas/sondear.py` (imports; `crear_proyecto`, la llamada a `yt_dlp` de las líneas 249-250)
- Test: `tests/test_sondear.py`

**Interfaces:**
- Produces: `crear_proyecto(cfg, fecha, entrada, datos, indice)`: si `entrada["original"]` existe, copia ese archivo a `<carpeta>/original.mp4` y **no** llama a `yt_dlp`. `sondear_lista` ya pasa la entrada completa.

- [ ] **Paso 1: prueba que falla** (al final de `tests/test_sondear.py`):

```python
def test_crear_proyecto_usa_el_original_local_si_viene(tmp_path, monkeypatch):
    from herramientas import sondear
    orig = tmp_path / "subido.mov"
    orig.write_bytes(b"video de oscar")
    llamadas = []
    monkeypatch.setattr(sondear.subprocess, "run", lambda *a, **k: llamadas.append(a))
    monkeypatch.setattr(sondear, "_bajar", lambda url, destino: False)
    monkeypatch.setattr(sondear, "_con_texto", lambda v: False)
    monkeypatch.setattr(sondear, "filtrar", lambda cs: cs)
    monkeypatch.setattr(sondear, "gifs_candidatos", lambda todos, cfg: [])
    monkeypatch.setattr(sondear, "puntuar", lambda cs, cfg: {"pasa": True, "mediana_top15": 1, "n_buenos": 1})
    monkeypatch.setattr(sondear, "seleccionar", lambda cs, n: cs)
    monkeypatch.setattr(sondear, "risa_de", lambda rs: 0.0)
    cfg = {"proyectos_dir": str(tmp_path / "P"), "n_comentarios": 12, "paleta": ["#fde68a"]}
    datos = {"url": "https://www.tiktok.com/@a/video/123", "respuestas": {},
             "crudos": [{"cid": "1", "text": "que risa", "digg_count": 3, "user": {"nickname": "ana"}}]}
    entrada = {"url": "https://vt.tiktok.com/ZS9/", "bucle": (0.0, 4.0), "tramos": [(0.0, 4.0)], "titulo": "perro",
               "forzar": True, "original": str(orig)}
    slug, p, carpeta = sondear.crear_proyecto(cfg, "2026-10-22", entrada, datos, 0)
    assert (carpeta / "original.mp4").read_bytes() == b"video de oscar"
    assert not any("yt_dlp" in str(a) for a in llamadas)
```

- [ ] **Paso 2:** `python -m pytest -q tests/test_sondear.py` → FALLA (`FileNotFoundError` sobre `original.mp4`: se llamó al `subprocess.run` falso de `yt_dlp`).
- [ ] **Paso 3:** agrega `import shutil` a los imports de `sondear.py` y reemplaza

```python
    subprocess.run([sys.executable, "-m", "yt_dlp", "-q", "--no-warnings", "-f", "mp4/best",
                    "-o", str(carpeta / "original.%(ext)s"), datos["url"]])
```

por

```python
    if entrada.get("original"):     # pedido web por link: el video lo subió Oscar (no se baja de TikTok)
        shutil.copy(entrada["original"], carpeta / "original.mp4")
    else:
        subprocess.run([sys.executable, "-m", "yt_dlp", "-q", "--no-warnings", "-f", "mp4/best",
                        "-o", str(carpeta / "original.%(ext)s"), datos["url"]])
```

- [ ] **Paso 4:** `python -m pytest -q` → 265 pasan.

### Task 11: Cliente web para la fase 2

**Files:**
- Modify: `herramientas/web.py` (`bajar`; funciones nuevas al final)
- Create: `tests/test_web_link.py`

**Interfaces:**
- Consumes: `web._llamar(metodo, ruta, cuerpo=None)`.
- Produces: `bajar(pedido, destino, descargar=None)` salta los archivos que vienen en `None` (la clave falta en el resultado); `propuesta(id_, comentarios) → dict` (`{"ok", "version", "vence"}`); `aprobados() → list`; `necesita_pantallazos(id_, motivo)`; `trae_mas_atendido(id_)`. En pruebas: fixture `web_link`, helpers `_pedido_link(**extra)`, `LINK`, `BAJAR_REAL`.

- [ ] **Paso 1: pruebas que fallan** (`tests/test_web_link.py`):

```python
"""Pedidos por link desde elmetacho.com/admin (spec web docs/superpowers/specs/2026-10-22-admin-fase2-design.md §5)."""
from pathlib import Path

import pytest

from herramientas import pasada, proyecto, revisor, sondear, web
from tests.test_pasada import entorno  # noqa: F401  (fixture)
from tests.test_proyecto import base

LINK = "https://vt.tiktok.com/ZS9/"
BAJAR_REAL = web.bajar


def _pedido_link(**extra):
    b = "cantados/c_1/"
    arch = lambda n: {"pathname": b + n, "tamano": 5, "url": f"https://firmado/{n}"}
    return {"id": "c_1", "estado": "listo", "tipo": "link", "link": LINK, "creado": "2026-10-22T18:30:00Z",
            "titulo": "lo grabaron paseando al perro", "estilo": "Salsa", "tramos": [[0, 4]],
            "original": {**arch("original.mp4"), "duracion": 40}, "gancho": arch("gancho.mov"), "pantallazos": [], **extra}


@pytest.fixture
def web_link(monkeypatch):
    estado = {"pedidos": [_pedido_link()], "bajados": [], "propuestas": [], "aprobados": [], "necesita": [],
              "atendidos": [], "fallidos": []}
    monkeypatch.setattr(web, "pedidos", lambda: estado["pedidos"])

    def bajar(p, destino, descargar=None):
        destino = Path(destino)
        destino.mkdir(parents=True, exist_ok=True)
        rutas = {"pantallazos": []}
        for clave in ("original", "gancho"):
            if p.get(clave):
                f = destino / Path(p[clave]["pathname"]).name
                f.write_bytes(b"x")
                rutas[clave] = f
        for a in p.get("pantallazos") or []:
            f = destino / Path(a["pathname"]).name
            f.write_bytes(b"x")
            rutas["pantallazos"].append(f)
        return rutas
    monkeypatch.setattr(web, "bajar", bajar)
    monkeypatch.setattr(web, "bajado", lambda i: estado["bajados"].append(i))
    monkeypatch.setattr(web, "propuesta", lambda i, cs: estado["propuestas"].append((i, cs)) or {"ok": True, "version": len(estado["propuestas"])})
    monkeypatch.setattr(web, "aprobados", lambda: estado["aprobados"])
    monkeypatch.setattr(web, "necesita_pantallazos", lambda i, m: estado["necesita"].append((i, m)))
    monkeypatch.setattr(web, "trae_mas_atendido", lambda i: estado["atendidos"].append(i))
    monkeypatch.setattr(web, "fallido", lambda i, m: estado["fallidos"].append((i, m)))
    monkeypatch.setattr(pasada, "_duracion", lambda f: 40.0)
    return estado


def test_cliente_fase2_llama_las_rutas_del_pc(monkeypatch):
    llamadas = []

    def llamar(metodo, ruta, cuerpo=None):
        llamadas.append((metodo, ruta, cuerpo))
        if ruta.endswith("/propuesta"):
            return {"ok": True, "version": 2}
        return [] if ruta.endswith("/aprobados") else {"ok": True}
    monkeypatch.setattr(web, "_llamar", llamar)
    assert web.propuesta("c_1", [{"id": "a"}]) == {"ok": True, "version": 2}
    assert web.aprobados() == []
    web.necesita_pantallazos("c_1", "captcha")
    web.trae_mas_atendido("c_1")
    assert llamadas == [("POST", "/admin/api/pc/pedidos/c_1/propuesta", {"comentarios": [{"id": "a"}]}),
                        ("GET", "/admin/api/pc/aprobados", None),
                        ("POST", "/admin/api/pc/pedidos/c_1/necesita-pantallazos", {"motivo": "captcha"}),
                        ("POST", "/admin/api/pc/pedidos/c_1/trae-mas-atendido", {})]


def test_bajar_salta_los_archivos_que_no_vienen(tmp_path):
    def descargar(url, destino):
        destino.write_bytes(b"x" * 5)
    ped = {"original": None, "gancho": None, "pantallazos": [{"pathname": "cantados/c_1/p01.jpg", "tamano": 5, "url": "u1"}]}
    r = web.bajar(ped, tmp_path / "pantallazos", descargar=descargar)
    assert "original" not in r and [f.name for f in r["pantallazos"]] == ["p01.jpg"]
```

- [ ] **Paso 2:** `python -m pytest -q tests/test_web_link.py` → FALLA (`AttributeError: module 'herramientas.web' has no attribute 'propuesta'` y `TypeError: 'NoneType' object is not subscriptable` en `bajar`).
- [ ] **Paso 3:** en `web.bajar` cambia la cabecera del `for` para saltar los vacíos:

```python
        for clave, arch in [("original", pedido.get("original")), ("gancho", pedido.get("gancho"))] + \
                           [("pantallazos", a) for a in pedido.get("pantallazos") or []]:
            if not arch:          # pedido que vuelve con pantallazos: el original y el gancho ya están en el PC
                continue
```

y al final de `web.py`:

```python
def propuesta(id_, comentarios):
    """Pedido por link revisado por Claude: la web lo pasa a en_revision (24 h) y avisa a Oscar con el enlace."""
    return _llamar("POST", f"/admin/api/pc/pedidos/{id_}/propuesta", {"comentarios": comentarios}) or {}


def aprobados():
    """[{id, version, trae_mas, automatico, orden: [{id, linea}], fuera: [id]}]; la web aprueba sola los vencidos."""
    return _llamar("GET", "/admin/api/pc/aprobados") or []


def necesita_pantallazos(id_, motivo):
    _llamar("POST", f"/admin/api/pc/pedidos/{id_}/necesita-pantallazos", {"motivo": motivo})


def trae_mas_atendido(id_):
    _llamar("POST", f"/admin/api/pc/pedidos/{id_}/trae-mas-atendido", {})
```

- [ ] **Paso 4:** `python -m pytest -q` → todas pasan.

### Task 12: Registrar y sondear el pedido web por link

**Files:**
- Modify: `herramientas/pasada.py` (`leer_web`, rama de sondeo de `nuevos_pedidos`)
- Test: `tests/test_web_link.py`

**Interfaces:**
- Consumes: Task 10 (`entrada["original"]`), Task 11 (fixture).
- Produces: pedido local `web:<id>` con `tipo: "link"`, `modo: "link"`, `link`, `original`, `gancho_web`, `fotos: []`; los de tipo desconocido (`remix`) se quedan en la web sin `bajado`. `nuevos_pedidos` sondea `d["link"]` con `original` local → `por_revisar` con carpeta. Helper de prueba `_sondeo_falso(entorno, monkeypatch, det=…) → lista de entradas vistas`.

- [ ] **Paso 1: pruebas que fallan** (al final de `tests/test_web_link.py`):

```python
def _sondeo_falso(entorno, monkeypatch, det="perro buenos=5 pasa=True"):
    vistas = []

    def sondear_lista(entradas, fecha, interactivo=True, progreso=None):
        e = entradas[0]
        vistas.append(e)
        if " buenos=" in det:
            c = entorno["raiz"] / f"{fecha}-perro"
            c.mkdir(exist_ok=True)
            p = base()
            p["comentarios"] = [{"id": f"c{i}", "usuario": f"u{i}", "avatar": None, "fecha": "", "likes": 10 - i,
                                 "texto_tarjeta": f"t{i}", "linea_letra": f"l{i},", "gif": None, "incluido": i < 3} for i in range(5)]
            proyecto.guardar(c, p)
        return [(10, e["url"], det)]
    monkeypatch.setattr(sondear, "sondear_lista", sondear_lista)
    return vistas


def test_leer_web_registra_un_pedido_por_link_sin_pantallazos(entorno, web_link):
    pasada.leer_web(pasada._P(), [])
    d = pasada._P().get("web:c_1")
    assert d["estado"] == "recibido" and d["modo"] == "link" and d["tipo"] == "link" and d["link"] == LINK
    assert d["fotos"] == [] and Path(d["original"]).name == "original.mp4" and web_link["bajados"] == ["c_1"]


def test_tipo_desconocido_se_queda_en_la_web(entorno, web_link):
    web_link["pedidos"] = [_pedido_link(tipo="remix")]
    inf = []
    pasada.leer_web(pasada._P(), inf)
    assert not pasada._P().d and web_link["bajados"] == [] and any("remix" in x for x in inf)


def test_link_web_se_sondea_con_su_link_y_el_original_local(entorno, web_link, monkeypatch):
    vistas = _sondeo_falso(entorno, monkeypatch)
    inf = []
    pasada.leer_web(pasada._P(), inf)
    pasada.nuevos_pedidos(pasada._P(), inf, fecha="2026-10-22")
    assert vistas[0]["url"] == LINK and vistas[0]["original"].endswith("original.mp4") and vistas[0]["forzar"] is True
    d = pasada._P().get("web:c_1")
    assert d["estado"] == "por_revisar" and d["carpeta"] == "2026-10-22-perro"
```

- [ ] **Paso 2:** `python -m pytest -q tests/test_web_link.py` → FALLAN (`d["modo"] == "pantallazos"`; el remix se baja; el sondeo recibe `web:c_1` como url).
- [ ] **Paso 3: `leer_web`.** Justo después de `url = f"web:{id_}"` agrega:

```python
            tipo = ped.get("tipo") or "pantallazos"
            if tipo not in ("pantallazos", "link") or (tipo == "link" and not ped.get("link")):
                informe.append(f"Pedido web {id_} de tipo «{tipo}»: el PC todavía no lo sabe hacer; queda en la web")
                continue
```

y reemplaza la llamada `P.nuevo(url, {...}, msg=None)` + su `informe.append` por:

```python
                datos = {"tramos": tramos, "titulo": ped.get("titulo"), "estilo": ped.get("estilo"), "tipo": tipo,
                         "modo": "pantallazos", "origen": "web", "web_id": id_, "clave": f"w{id_}",
                         "original": str(rutas["original"]), "gancho_web": str(rutas["gancho"]),
                         "fotos": [{"archivo": str(f)} for f in rutas["pantallazos"]],
                         "bucle_largo": total > LARGO_S, "bucle_sin_tope": True, "duracion": dur}
                if tipo == "link":       # Claude escoge los comentarios de TikTok; Oscar los revisa en la web
                    datos.update(modo="link", link=ped["link"])
                P.nuevo(url, datos, msg=None)
                informe.append(f"Pedido de la web{' por link' if tipo == 'link' else ''}: {ped.get('titulo') or id_}")
```

- [ ] **Paso 4: `nuevos_pedidos`.** En la rama de sondeo reemplaza

```python
            entrada = {"url": url, "bucle": (tramos[0][0], tramos[-1][1]), "tramos": tramos,
                       "bucle_largo": bool(d.get("bucle_largo")), "titulo": d.get("titulo") or "", "forzar": True}
```

por

```python
            entrada = {"url": d.get("link") or url, "bucle": (tramos[0][0], tramos[-1][1]), "tramos": tramos,
                       "bucle_largo": bool(d.get("bucle_largo")), "titulo": d.get("titulo") or "", "forzar": True}
            if d.get("origen") == "web" and d.get("original"):
                entrada["original"] = d["original"]      # pedido web por link: el video lo subió Oscar
```

- [ ] **Paso 5:** `python -m pytest -q` → todas pasan (también `test_leer_web_registra_una_sola_vez_y_marca_bajado`, que sigue en modo pantallazos).

### Task 13: `revisado` y `publicar-propuesta`

**Files:**
- Modify: `herramientas/pasada.py` (docstring; `revisado`; `enviar_letras`; `main`; función nueva `publicar_propuesta`)
- Test: `tests/test_web_link.py`

**Interfaces:**
- Consumes: `web.propuesta` (Task 11); pedido `modo: "link"` (Task 12); `_lineas`, `_url_de_carpeta`, `_cancelado_en_la_web`.
- Produces: `revisado(carpeta, informe)` solo marca `revisado=True` en pedidos web con `modo: "link"`; `enviar_letras` salta todo pedido `origen: "web"`; `publicar_propuesta(carpeta, informe) → bool` deja el pedido local en `estado="en_revision"`, `version`, `propuesta` (líneas incluidas), `numeracion={"inc": [ids], "fuera": [ids]}`; fase `python -m herramientas.pasada publicar-propuesta <carpeta>`.

- [ ] **Paso 1: pruebas que fallan:**

```python
def _en_por_revisar(entorno, **extra):
    return entorno["nuevo"]("2026-10-22-perro", "web:c_1", "por_revisar", origen="web", web_id="c_1",
                            modo="link", tipo="link", link=LINK, **extra)


def test_revisado_de_un_link_web_no_lo_aprueba_ni_manda_letra(entorno, monkeypatch):
    d = _en_por_revisar(entorno)
    pasada.revisado(d.name, [])
    v = pasada._P().get("web:c_1")
    assert v["revisado"] is True and v["estado"] == "por_revisar" and proyecto.cargar(d)["estado"] == "capturado"
    enviadas = []
    monkeypatch.setattr(pasada.bot, "enviar_letra", lambda *a, **k: enviadas.append(a) or [])
    pasada.enviar_letras([])
    assert enviadas == []


def test_publicar_propuesta_sube_dentro_y_fuera_y_fija_la_numeracion(entorno, web_link):
    d = _en_por_revisar(entorno, revisado=True)
    assert pasada.publicar_propuesta(d.name, []) is True
    i, cs = web_link["propuestas"][0]
    assert i == "c_1"
    assert [(c["id"], c["linea"], c["dentro"]) for c in cs] == [("0", "a,", True), ("1", "b,", True), ("2", "c,", True), ("3", "d,", False)]
    assert cs[0]["usuario"] == "u" and cs[0]["texto"] == "a," and cs[0]["likes"] == 10
    v = pasada._P().get("web:c_1")
    assert v["estado"] == "en_revision" and v["version"] == 1 and v["numeracion"] == {"inc": ["0", "1", "2"], "fuera": ["3"]}
    assert v["propuesta"] == ["a,", "b,", "c,"]


def test_publicar_propuesta_exige_revisado_y_link_web(entorno, web_link):
    d = _en_por_revisar(entorno)
    assert pasada.publicar_propuesta(d.name, []) is False and web_link["propuestas"] == []
    entorno["nuevo"]("2026-10-22-otro", "https://vt.tiktok.com/X/", "por_revisar", revisado=True)
    assert pasada.publicar_propuesta("2026-10-22-otro", []) is False


def test_publicar_propuesta_404_cancela(entorno, web_link, monkeypatch):
    d = _en_por_revisar(entorno, revisado=True)
    monkeypatch.setattr(web, "propuesta", lambda i, cs: (_ for _ in ()).throw(web.ErrorWeb("404", status=404)))
    assert pasada.publicar_propuesta(d.name, []) is False
    assert pasada._P().get("web:c_1")["estado"] == "fallido"
```

- [ ] **Paso 2:** `python -m pytest -q tests/test_web_link.py` → FALLAN (`revisado` lo aprueba; `AttributeError: … has no attribute 'publicar_propuesta'`).
- [ ] **Paso 3: implementación.** En `revisado` reemplaza

```python
    if P.get(url).get("origen") != "web":
```

por

```python
    if P.get(url).get("origen") != "web" or P.get(url).get("modo") == "link":   # por link: Oscar revisa en la web
```

En `enviar_letras` reemplaza `if not P.get(url).get("revisado"):` por `if not P.get(url).get("revisado") or P.get(url).get("origen") == "web":`. Debajo de `revisado`:

```python
def publicar_propuesta(carpeta, informe):
    """Pedido web por link ya revisado por Claude (runbook §2): sube la propuesta a la web, que lo pasa a en_revision
    y le manda a Oscar el enlace. La numeración queda fija aquí (como en enviar_letras) para aplicar después su lista."""
    P = _P()
    url = _url_de_carpeta(P, carpeta)
    d = P.get(url)
    if d.get("origen") != "web" or d.get("modo") != "link":
        informe.append(f"{carpeta}: no es un pedido web por link; no hay propuesta que publicar")
        return False
    if not d.get("revisado"):
        informe.append(f"{carpeta}: falta `revisado` (Claude todavía no lo revisó)")
        return False
    c = _carpeta(P, url)
    inc, fuera = _lineas(proyecto.cargar(c))
    comentarios = [{"id": str(x["id"]), "usuario": x.get("usuario") or "", "texto": x.get("texto_tarjeta") or "",
                    "linea": x["linea_letra"], "likes": x.get("likes") if isinstance(x.get("likes"), int) else None,
                    "dentro": k < len(inc)} for k, x in enumerate(inc + fuera)]
    try:
        r = web.propuesta(d["web_id"], comentarios) or {}
    except web.ErrorWeb as e:
        if getattr(e, "status", None) == 404:
            _cancelado_en_la_web(P, url, informe)
        else:
            informe.append(f"No pude publicar la propuesta de {c.name}: {e} (repetir `publicar-propuesta`)")
        return False
    P.poner(url, estado="en_revision", version=r.get("version"), propuesta_en=_ahora(),
            propuesta=[x["linea_letra"] for x in inc],
            numeracion={"inc": [x["id"] for x in inc], "fuera": [x["id"] for x in fuera]})
    informe.append(f"Propuesta publicada en la web: {c.name} (versión {r.get('version')})")
    return True
```

En `main`, después de la rama `revisado`:

```python
    elif fase == "publicar-propuesta":
        publicar_propuesta(sys.argv[2], informe)
```

En el docstring, debajo de `revisado <carp>`:

```
  publicar-propuesta <carp> → pedido web por link revisado: sube la propuesta; Oscar la revisa en la web (24 h)
```

- [ ] **Paso 4:** `python -m pytest -q` → todas pasan (incluida `test_revisado_de_un_pedido_web_lo_aprueba_sin_letra`).

### Task 14: Aplicar los aprobados de la web y «Trae más»

**Files:**
- Modify: `herramientas/pasada.py` (`aplicar_respuesta` líneas 121-128, `_reponer` líneas 149 y 157-159, `leer`; funciones nuevas `_numerar`, `_fijar_letra`, `_reserva`, `_r_web`, `_aplicar_web`, `_traer_mas_web`, `aplicar_aprobados_web`)
- Test: `tests/test_web_link.py`

**Interfaces:**
- Consumes: `web.aprobados`, `web.trae_mas_atendido` (Task 11); `numeracion`, `version`, `propuesta` locales (Task 13); `respuestas.FUERA_DESDE`, `respuestas._coma`; `_numerados`, `_reponer`, `revisor.registrar`.
- Produces: `_numerar(inc, fuera) → {n: comentario}`; `_fijar_letra(p, numerados, r) → [elegidos]` (pone `incluido`, `linea_letra`, orden y `estado="listo_suno"`); `_reserva(p, elegidos, ya_quitados) → [comentarios]`; `_r_web(numeracion, item) → {"orden": [n], "textos": {n: linea}}`; `aplicar_aprobados_web(P, informe)` (en `leer`, después de `nuevos_pedidos`).

- [ ] **Paso 1: pruebas que fallan:**

```python
def _en_revision(entorno, web_link):
    d = _en_por_revisar(entorno, revisado=True)
    pasada.publicar_propuesta(d.name, [])
    return d


def test_aprobado_en_la_web_aplica_orden_quitados_y_lineas(entorno, web_link):
    d = _en_revision(entorno, web_link)
    web_link["aprobados"] = [{"id": "c_1", "version": 1, "trae_mas": False, "automatico": False,
                              "orden": [{"id": "2", "linea": "c,"}, {"id": "3", "linea": "otra d,"}, {"id": "0", "linea": "a,"}],
                              "fuera": ["1"]}]
    pasada.aplicar_aprobados_web(pasada._P(), [])
    p = proyecto.cargar(d)
    assert proyecto.letra_de(p) == ["c,", "otra d,", "a,"] and p["estado"] == "listo_suno"
    v = pasada._P().get("web:c_1")
    assert v["estado"] == "aprobado" and v["automatico"] is False
    assert revisor.ejemplos()[-1]["cambio"] is True


def test_aprobados_repetidos_o_de_otra_version_no_se_aplican_dos_veces(entorno, web_link):
    d = _en_revision(entorno, web_link)
    item = {"id": "c_1", "version": 1, "trae_mas": False, "automatico": True, "orden": [{"id": "0", "linea": "a,"}],
            "fuera": ["1", "2", "3"]}
    web_link["aprobados"] = [{**item, "version": 2}]
    pasada.aplicar_aprobados_web(pasada._P(), [])
    assert pasada._P().get("web:c_1")["estado"] == "en_revision"
    web_link["aprobados"] = [item]
    pasada.aplicar_aprobados_web(pasada._P(), [])
    pasada.aplicar_aprobados_web(pasada._P(), [])        # la web lo sigue listando hasta la entrega
    assert len([r for r in revisor.ejemplos() if r["carpeta"] == d.name]) == 1
    assert pasada._P().get("web:c_1")["automatico"] is True


def test_trae_mas_repone_y_vuelve_a_revision_de_claude(entorno, web_link):
    d = _en_revision(entorno, web_link)
    web_link["aprobados"] = [{"id": "c_1", "version": 1, "trae_mas": True, "automatico": False,
                              "orden": [{"id": "0", "linea": "a,"}, {"id": "2", "linea": "c,"}], "fuera": ["1", "3"]}]
    pasada.aplicar_aprobados_web(pasada._P(), [])
    assert proyecto.letra_de(proyecto.cargar(d)) == ["a,", "d,", "c,"]          # d en el puesto del quitado
    v = pasada._P().get("web:c_1")
    assert v["estado"] == "por_revisar" and v["revisado"] is False and v["reponer"] == 1 and v["quitados_oscar"] == ["1"]
    assert web_link["atendidos"] == []


def test_trae_mas_sin_reserva_vuelve_a_revision_sin_cambios(entorno, web_link):
    d = _en_revision(entorno, web_link)
    web_link["aprobados"] = [{"id": "c_1", "version": 1, "trae_mas": True, "automatico": False,
                              "orden": [{"id": k, "linea": f"{l},"} for k, l in zip("0123", "abcd")], "fuera": []}]
    pasada.aplicar_aprobados_web(pasada._P(), [])
    assert web_link["atendidos"] == ["c_1"] and pasada._P().get("web:c_1")["estado"] == "en_revision"
    assert proyecto.letra_de(proyecto.cargar(d)) == ["a,", "b,", "c,"]


def test_aprobados_con_la_web_caida_no_tumba_leer(entorno, monkeypatch):
    monkeypatch.setattr(web, "aprobados", lambda: (_ for _ in ()).throw(web.ErrorWeb("caída")))
    inf = []
    pasada.aplicar_aprobados_web(pasada._P(), inf)
    assert any("aprobados" in x for x in inf)
```

- [ ] **Paso 2:** `python -m pytest -q tests/test_web_link.py` → FALLAN con `AttributeError: … has no attribute 'aplicar_aprobados_web'`.
- [ ] **Paso 3: extraer lo compartido.** Debajo de `_numerados` agrega:

```python
def _numerar(inc, fuera):
    """Comentarios por número del mensaje: 1..n los incluidos, FUERA_DESDE.. los de fuera."""
    return {**{k: c for k, c in enumerate(inc, 1)}, **{respuestas.FUERA_DESDE + k: c for k, c in enumerate(fuera)}}


def _fijar_letra(p, numerados, r):
    """Aplica al proyecto el orden y los textos de una respuesta (números del mensaje); devuelve los elegidos en orden."""
    for n, c in numerados.items():
        c["incluido"] = n in r["orden"]
        if n in r["textos"]:
            c["linea_letra"] = r["textos"][n]
    elegidos = [numerados[n] for n in r["orden"]]
    p["comentarios"] = elegidos + [c for c in p["comentarios"] if c not in elegidos]
    p["estado"] = "listo_suno"
    return elegidos


def _reserva(p, elegidos, ya_quitados):
    """Los que pueden entrar en lugar de un quitado: ni elegidos, ni quitados por Oscar, ni línea roja, con texto."""
    return [c for c in p["comentarios"] if c not in elegidos and c["id"] not in ya_quitados
            and not c.get("linea_roja") and str(c.get("linea_letra", "")).strip(" ,")
            and not str(c.get("linea_letra", "")).startswith("(falta")]
```

En `aplicar_respuesta` reemplaza las 8 líneas desde `numerados = {**{k: c …` hasta `p["estado"] = "listo_suno"` por:

```python
    elegidos = _fijar_letra(p, _numerar(inc, fuera), r)
```

En `_reponer` reemplaza `numerados = {**{k: c for k, c in enumerate(inc, 1)}, …}` por `numerados = _numerar(inc, fuera)` y la lista `reserva = [c for c in p["comentarios"] if …]` (3 líneas) por `reserva = _reserva(p, elegidos_por_oscar, ya_quitados)`.

- [ ] **Paso 4:** `python -m pytest -q tests/test_pasada.py tests/test_fallos_2026_10_20.py` → PASAN (el refactor no cambia nada de Telegram).
- [ ] **Paso 5: aplicar lo de la web** (debajo de `publicar_propuesta`):

```python
def _r_web(numeracion, item):
    """La lista final de la web ({id, linea} en orden) en la numeración del mensaje que usa respuestas.py."""
    num = {str(i): n for n, i in enumerate(numeracion.get("inc", []), 1)}
    num.update({str(i): respuestas.FUERA_DESDE + k for k, i in enumerate(numeracion.get("fuera", []))})
    lista = [x for x in item.get("orden") or [] if isinstance(x, dict) and str(x.get("id")) in num]
    return {"orden": [num[str(x["id"])] for x in lista],
            "textos": {num[str(x["id"])]: respuestas._coma(str(x["linea"])) for x in lista if x.get("linea")}}


def _aplicar_web(P, url, d, item, informe):
    c = _carpeta(P, url)
    p = proyecto.cargar(c)
    inc, fuera = _numerados(p, d.get("numeracion"))
    r = _r_web(d.get("numeracion") or {}, item)
    if not r["orden"]:
        informe.append(f"{url}: la lista aprobada en la web llegó vacía; no la aplico")
        return
    elegidos = _fijar_letra(p, _numerar(inc, fuera), r)
    proyecto.guardar(c, p)
    auto = bool(item.get("automatico"))
    revisor.registrar(c.name, d.get("propuesta", []), [x["linea_letra"] for x in elegidos],
                      "(web: se venció)" if auto else "(web)", automatico=auto)
    P.poner(url, estado="aprobado", aprobado_en=_ahora(), automatico=auto, hoja_ok=False, intentos_render=0)
    informe.append(("Aprobado solo (plazo de la web): " if auto else "Aprobado en la web: ") + c.name)


def _traer_mas_web(P, url, d, item, informe):
    """«Trae más» en la web = «trae más que reemplacen» de Telegram: _reponer y vuelve a revisión de Claude."""
    c = _carpeta(P, url)
    p = proyecto.cargar(c)
    inc, fuera = _numerados(p, d.get("numeracion"))
    r = {**_r_web(d.get("numeracion") or {}, item), "reponer": True}
    numerados = _numerar(inc, fuera)
    quitados = {numerados[n]["id"] for n in range(1, len(inc) + 1) if n not in r["orden"]}
    ya = set(d.get("quitados_oscar") or []) | quitados
    if not _reserva(p, [numerados[n] for n in r["orden"]], ya):
        try:
            web.trae_mas_atendido(d["web_id"])       # la web avisa «no hay más» y le da 24 h nuevas
        except web.ErrorWeb as e:
            informe.append(f"No pude avisar a la web que no hay más para {c.name}: {e}")
            return
        informe.append(f"{c.name}: Oscar pidió más comentarios y no hay más; vuelve a revisión sin cambios")
        return
    _reponer(P, url, p, inc, fuera, r, None, "(web: trae más)", informe)


def aplicar_aprobados_web(P, informe):
    """Pedidos web por link que Oscar aprobó (o que se vencieron) o en los que pidió «Trae más»."""
    try:
        lista = web.aprobados()
        if not isinstance(lista, list):
            raise web.ErrorWeb("respuesta inesperada de la web")
    except web.ErrorWeb as e:
        informe.append(f"No pude leer los aprobados de la web: {e}")
        return
    for item in lista:
        if not isinstance(item, dict):
            continue
        url = f"web:{item.get('id')}"
        d = P.get(url)
        if not d or d.get("estado") != "en_revision":
            continue                                   # ya aplicado: la web lo lista hasta la entrega
        if item.get("version") != d.get("version"):
            informe.append(f"{url}: la web tiene la versión {item.get('version')} y el PC la {d.get('version')}; no lo toco")
            continue
        try:
            (_traer_mas_web if item.get("trae_mas") else _aplicar_web)(P, url, d, item, informe)
        except Exception as e:
            informe.append(f"Error aplicando la revisión web de {url}: {e}")
```

En `leer`, en la tupla de fases, después de `lambda: nuevos_pedidos(P, informe),` agrega `lambda: aplicar_aprobados_web(P, informe),`.

- [ ] **Paso 6:** `python -m pytest -q` → todas pasan.

### Task 15: TikTok bloquea → pantallazos en la web → sigue como pantallazos

**Files:**
- Modify: `herramientas/pasada.py` (`nuevos_pedidos`, `leer_web`; funciones nuevas `_pedir_pantallazos`, `_pantallazos_de_web`)
- Test: `tests/test_web_link.py`

**Interfaces:**
- Consumes: `web.necesita_pantallazos`, `web.bajar` (salta `None`) (Task 11); `_nuevo_por_pantallazos`; `_cancelado_en_la_web`.
- Produces: pedido local `estado="necesita_pantallazos"` (con `motivo`) cuando el sondeo de un link web da `captcha` o `sin_comentarios`; `_pantallazos_de_web(P, url, ped, informe) → bool` baja solo los pantallazos a `logs/web/<id>/pantallazos/` y deja el pedido `recibido`, `modo="pantallazos"`.

- [ ] **Paso 1: pruebas que fallan:**

```python
def _a_necesita(entorno, web_link, monkeypatch, det="captcha"):
    _sondeo_falso(entorno, monkeypatch, det=det)
    pasada.leer_web(pasada._P(), [])
    pasada.nuevos_pedidos(pasada._P(), [], fecha="2026-10-22")
    return Path(pasada._P().get("web:c_1")["original"])


def _con_pantallazos(n=2):
    b = "cantados/c_1/"
    return _pedido_link(estado="necesita_pantallazos", original=None, gancho=None,
                        pantallazos=[{"pathname": b + f"p0{k}.jpg", "tamano": 5, "url": f"u{k}"} for k in range(1, n + 1)])


def test_captcha_en_link_web_pide_pantallazos_en_la_web(entorno, web_link, monkeypatch):
    _a_necesita(entorno, web_link, monkeypatch)
    v = pasada._P().get("web:c_1")
    assert v["estado"] == "necesita_pantallazos" and web_link["necesita"][0][0] == "c_1"
    assert "captcha" in web_link["necesita"][0][1]


def test_si_la_web_no_recibe_el_pedido_de_pantallazos_se_reintenta(entorno, web_link, monkeypatch):
    monkeypatch.setattr(web, "necesita_pantallazos", lambda i, m: (_ for _ in ()).throw(web.ErrorWeb("caída")))
    _a_necesita(entorno, web_link, monkeypatch)
    assert pasada._P().get("web:c_1")["estado"] == "recibido"


def test_link_web_que_vuelve_con_pantallazos_sigue_como_pantallazos(entorno, web_link, monkeypatch):
    from herramientas import pantallazos
    original = _a_necesita(entorno, web_link, monkeypatch, det="sin_comentarios")
    web_link["pedidos"] = [_con_pantallazos()]
    pasada.leer_web(pasada._P(), [])
    v = pasada._P().get("web:c_1")
    assert v["estado"] == "recibido" and v["modo"] == "pantallazos"
    assert [Path(f["archivo"]).name for f in v["fotos"]] == ["p01.jpg", "p02.jpg"]
    assert original.exists() and web_link["bajados"] == ["c_1", "c_1"]
    monkeypatch.setattr(pasada, "_resolucion", lambda f: (1080, 1920))
    monkeypatch.setattr(pantallazos, "armar_proyecto",
                        lambda carpeta, url, fotos, datos, indice, paleta: {"comentarios": [{"incluido": True, "texto_tarjeta": "a,"}]})
    pasada.nuevos_pedidos(pasada._P(), [], fecha="2026-10-23")
    assert pasada._P().get("web:c_1")["estado"] == "por_revisar"


def test_pantallazos_que_bajan_incompletos_no_borran_el_original(entorno, web_link, monkeypatch):
    original = _a_necesita(entorno, web_link, monkeypatch)
    web_link["pedidos"] = [_con_pantallazos(1)]

    def corto(url, destino):
        destino.write_bytes(b"xx")
    monkeypatch.setattr(web, "bajar", lambda p, destino, descargar=None: BAJAR_REAL(p, destino, descargar=corto))
    inf = []
    pasada.leer_web(pasada._P(), inf)
    assert original.exists() and pasada._P().get("web:c_1")["estado"] == "necesita_pantallazos"
    assert web_link["bajados"] == ["c_1"] and any("se reintenta" in x for x in inf)
```

- [ ] **Paso 2:** `python -m pytest -q tests/test_web_link.py` → FALLAN (el captcha deja el pedido en reintentos; el regreso con pantallazos no se registra).
- [ ] **Paso 3: implementación.** Debajo de `_cancelado_en_la_web`:

```python
def _pedir_pantallazos(P, url, d, motivo, informe):
    """Pedido web por link que TikTok no deja leer: la web le pide a Oscar los pantallazos (spec fase 2 §3)."""
    try:
        web.necesita_pantallazos(d["web_id"], motivo)
    except web.ErrorWeb as e:
        if getattr(e, "status", None) == 404:
            _cancelado_en_la_web(P, url, informe)
        else:
            informe.append(f"No pude pedir pantallazos en la web para {url}: {e} (se reintenta mañana)")
        return
    P.poner(url, estado="necesita_pantallazos", motivo=motivo)
    informe.append(f"{url}: {motivo}; le pedí a Oscar los pantallazos en la web")


def _pantallazos_de_web(P, url, ped, informe):
    """Llegaron los pantallazos de un pedido por link bloqueado: se bajan aparte (el original ya está en el PC)
    y sigue como pedido con pantallazos. Devuelve True si hay que marcarlo «bajado» en la web."""
    d = P.get(url)
    if not d:
        informe.append(f"Pantallazos de {url} sin pedido en el PC: los ignoro")
        return False
    if d.get("estado") == "necesita_pantallazos":
        rutas = web.bajar(ped, LOGS / "web" / ped["id"] / "pantallazos")
        P.poner(url, modo="pantallazos", fotos=[{"archivo": str(f)} for f in rutas["pantallazos"]], estado="recibido",
                motivo=None, intentos=0)
        informe.append(f"Pantallazos del pedido web {ped.get('titulo') or ped['id']}: {len(rutas['pantallazos'])}")
    return True
```

En `leer_web`, reemplaza `if not P.get(url):` (el que abre el registro nuevo) por:

```python
            if ped.get("estado") == "necesita_pantallazos":
                if not _pantallazos_de_web(P, url, ped, informe):
                    continue
            elif not P.get(url):
```

En `nuevos_pedidos`, dentro de `if not carpeta or not (carpeta / "proyecto.json").exists():`, como primeras líneas:

```python
                if d.get("origen") == "web" and det in ("captcha", "sin_comentarios"):
                    _pedir_pantallazos(P, url, d, "TikTok pidió iniciar sesión o captcha" if det == "captcha"
                                       else "TikTok no mostró los comentarios (pide iniciar sesión)", informe)
                    continue
```

- [ ] **Paso 4:** `python -m pytest -q` → todas pasan.

### Task 16: Repetidos web ↔ Telegram también por link

**Files:**
- Modify: `herramientas/pasada.py` (`_repetido_de_web`; función nueva `_mismo_link`; `nuevos_pedidos` rama de sondeo)
- Test: `tests/test_web_link.py`

**Interfaces:**
- Produces: `_mismo_link(a, b) → bool` (sin `?…` ni `/` final; respeta mayúsculas); `_repetido_de_web(P, url, titulo, dur)` devuelve el pedido web vivo con el mismo link aunque `titulo`/`dur` sean `None`; `nuevos_pedidos` lo revisa antes de sondear.

- [ ] **Paso 1: pruebas que fallan:**

```python
def test_link_de_telegram_igual_al_de_un_pedido_web_vivo_no_se_sondea(entorno, web_link, monkeypatch):
    pasada.leer_web(pasada._P(), [])
    pasada._P().poner("web:c_1", estado="en_revision")
    vistas = _sondeo_falso(entorno, monkeypatch)
    pasada._P().nuevo("https://vt.tiktok.com/ZS9?lang=es", {"tramos": [[0, 4]], "titulo": None}, msg=9)
    pasada.nuevos_pedidos(pasada._P(), [], fecha="2026-10-22")
    v = pasada._P().get("https://vt.tiktok.com/ZS9?lang=es")
    assert v["estado"] == "fallido" and v["motivo"] == "repetido de web:c_1" and vistas == []


def test_repetido_por_link_ignora_pedidos_web_terminados(entorno, web_link):
    pasada.leer_web(pasada._P(), [])
    assert pasada._repetido_de_web(pasada._P(), "https://vt.tiktok.com/ZS9/", None, None) == "web:c_1"
    assert pasada._repetido_de_web(pasada._P(), "https://vt.tiktok.com/zs9/", None, None) is None
    pasada._P().poner("web:c_1", estado="enviado")
    assert pasada._repetido_de_web(pasada._P(), "https://vt.tiktok.com/ZS9/", None, None) is None
```

- [ ] **Paso 2:** `python -m pytest -q tests/test_web_link.py` → FALLAN (se sondea; `_repetido_de_web` devuelve `None`).
- [ ] **Paso 3:** reemplaza `_repetido_de_web` por:

```python
def _mismo_link(a, b):
    """Mismo link de TikTok sin parámetros ni barra final (los códigos cortos distinguen mayúsculas)."""
    n = lambda x: (x or "").split("?")[0].rstrip("/")
    return bool(a and b) and n(a) == n(b)


def _repetido_de_web(P, url, titulo, dur):
    """Un pedido de Telegram igual a uno de la web vivo no se hace: mismo link, o título normalizado y duración ±0,5 s."""
    t = web.normalizar_titulo(titulo)
    for u, v in P.d.items():
        if u == url or v.get("origen") != "web" or v.get("estado") in ("enviado", "fallido"):
            continue
        if _mismo_link(v.get("link"), url):
            return u
        if (t and dur is not None and v.get("duracion") is not None
                and web.normalizar_titulo(v.get("titulo")) == t and abs(v["duracion"] - dur) <= 0.5):
            return u
    return None
```

En la rama de sondeo de `nuevos_pedidos`, como primeras líneas del `try:`:

```python
            if d.get("origen") != "web":
                rep = _repetido_de_web(P, url, d.get("titulo"), None)      # por link, antes de gastar un sondeo
                if rep:
                    P.poner(url, estado="fallido", motivo=f"repetido de {rep}", avisado=True)
                    informe.append(f"{url} es el mismo video que {rep} (web): no se hace")
                    continue
```

- [ ] **Paso 4:** `python -m pytest -q` → todas pasan (también `test_telegram_repetido_de_la_web` y `test_repetido_ignora_pedidos_web_ya_enviados_o_fallidos`).

### Task 17: Runbook y bitácora

**Files:**
- Modify: `docs/runbook-pasada.md` (§1, §2, §2b), `BITACORA-CANTADOS.md` (§0, §0.3)

- [ ] **Paso 1: runbook.** Al final de §1 agrega:

```markdown
**Pedidos web por link (fase 2).** Clave `web:<id>`, `tipo: link`, `modo: link`, `link`; el original subido por Oscar queda en `logs/web/<id>/` y el sondeo lo usa (no se baja de TikTok). En el mismo `leer`: si TikTok da captcha o no muestra comentarios, el pedido pasa a `necesita_pantallazos` y la web le pide las fotos a Oscar (cuando las envía, el siguiente `leer` las baja a `logs/web/<id>/pantallazos/` y sigue como pedido con pantallazos web: se revisa y `revisado` lo aprueba directo). `leer` también trae los **aprobados** de la web (o vencidos) y aplica la lista final al proyecto (pasa a `aprobado` → §3); si Oscar pidió **«Trae más»**, repone como el «trae más» de Telegram y vuelve a `por_revisar` con `reponer: N` (si no hay más, la web le avisa «no hay más» y sigue en revisión).
```

En §2, después del punto de «Pedidos de la web»:

```markdown
- **Pedidos web por link** (`"modo": "link"`): se revisan **como los de Telegram** (escoger, ordenar, `linea_letra` con el reglamento). Cerrar con `python -m herramientas.pasada revisado <carpeta>` y luego `python -m herramientas.pasada publicar-propuesta <carpeta>`: la web lo pasa a `en_revision`, le manda a Oscar el enlace y él tiene hasta la franja de mañana. **No van a `enviar-letras`** (el comando los salta). Si vuelven con `reponer: N`, revisar esos N igual que en Telegram (nunca los de `quitados_oscar`) y repetir `revisado` + `publicar-propuesta`.
```

En §2b, al inicio: «Los pedidos web por link publicados no esperan en la franja: Oscar los revisa en la web y salen en la franja siguiente.»

- [ ] **Paso 2: bitácora.** En §0 agrega la entrada «**Pedidos por link desde la web (2026-10-2x): CONSTRUIDO el lado del PC**» con: spec `C:\Users\delga\Documents\elmetacho-web\docs\superpowers\specs\2026-10-22-admin-fase2-design.md`, plan `…\docs\plans\2026-10-22-admin-fase2-link.md`, las piezas (`publicar-propuesta`, `aplicar_aprobados_web`, `_pedir_pantallazos`, `_pantallazos_de_web`, `_mismo_link`; `_numerar`/`_fijar_letra`/`_reserva` extraídas sin cambiar Telegram; `sondear` con original local), el número de pruebas que dio `python -m pytest -q` y que se hizo desde la sesión «Productos MLABS» (avisar a «Construir pedidos de cantados por Telegram»). En §0.3: «Probar de punta a punta un pedido por link real (franja día 1 → revisión en el celular → franja día 2)» y «Remix: plan aparte tras la prueba de §7».
- [ ] **Paso 3:** `python -m pytest -q` → todas pasan (anotar el número en la bitácora).

### Task 18: Publicación y prueba de punta a punta

- [ ] **Paso 1:** PR de la Task 9 con las comprobaciones en verde; como no toca archivos compartidos, se puede fusionar (`gh pr merge --squash --delete-branch`) cuando Oscar lo diga; esperar el despliegue de Vercel.
- [ ] **Paso 2:** en vivo, sin sesión: `curl -s -o /dev/null -w "%{http_code}" https://www.elmetacho.com/admin/api/pc/aprobados` → `401`; igual con `-X POST …/admin/api/cantados/x/aprobar` → `401`.
- [ ] **Paso 3:** Oscar sube desde el celular un pedido **por link** real. Franja (o a mano): `PYTHONIOENCODING=utf-8 python -m herramientas.pasada leer` → «Pedido de la web por link: …» y «Capturado: …»; §2 → `revisado <carpeta>` → `publicar-propuesta <carpeta>` → llega al bot el enlace.
- [ ] **Paso 4:** Oscar revisa en el celular (quita uno, mueve otro, corrige una línea, aprueba). Siguiente franja: `leer` → «Aprobado en la web: …»; §3–§5; llegan los dos cortes; en Vercel → Storage → Blob no queda `cantados/<id>/` y el pedido ya no aparece en `/admin`.
- [ ] **Paso 5:** contarle a Oscar: los archivos del PC quedaron **sin commit** en `PREMIERE-CLAUDE/cantados` (junto con los de la fase 1, de otra sesión) y que decida quién los sube; actualizar `docs/BRIEF.md` («Resumen de sesiones») en un PR aparte.
