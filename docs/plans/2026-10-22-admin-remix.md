# Admin · Fase 2 «remix» · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal (objetivo):** que Oscar pida desde `elmetacho.com/admin` un **remix** de un cantado ya publicado (link del TikTok original + su video publicado + clip original + tramos + gancho nuevo) y que la franja de las 2 p. m. lo haga el mismo día, sin revisión: los mismos comentarios reales en otro orden, con estilo (salsa ↔ merengue) y color de karaoke contrarios y canción nueva.

**Architecture (arquitectura):** En la web, el remix es un tipo más del pedido (`pedido.js` gana la ranura `publicado`; `api.js` la verifica, la firma para el PC y la borra al bajar; la pantalla «Nuevo video» muestra sus campos). En el PC (`PREMIERE-CLAUDE/cantados`), `leer_web` registra `modo: remix` y un módulo nuevo `herramientas/remix.py` arma el proyecto por dos caminos: (1) si el publicado lo hizo este sistema, los comentarios salen de su `proyecto.json` y el pedido queda aprobado al instante; (2) si no, OCR de las tarjetas (cuadros cada 0,5 s, el método de la prueba de §7) → emparejar con TikTok (o con los pantallazos de Oscar si TikTok pide sesión) → tarjetas reales o dibujadas → whisper del publicado para corroborar → Claude corrige contra el cuadro y `revisado` lo aprueba. Primero el camino 1 de punta a punta; el OCR después.

**Tech Stack:** Next.js 16.4.1 (App Router, JSX), React 19.2.4, Tailwind v4, `redis` 6, `@vercel/blob` 2.8.2, `node:test` (Node 24.11.1); Python 3.11.9 + pytest 8.4.2, OpenCV 4.14 (headless), `rapidocr-onnxruntime`, `faster-whisper` 1.2.1 (vía `PREMIERE-CLAUDE/subtitular.py`), Playwright sobre el Chrome de captura (9223), ffmpeg/ffprobe.

**Spec:** `docs/superpowers/specs/2026-10-22-admin-fase2-design.md` (vive en la rama `docs/admin-fase2-spec`, commit `ccf2475`; léela con `git show docs/admin-fase2-spec:docs/superpowers/specs/2026-10-22-admin-fase2-design.md`). Este plan cubre **solo el remix**: §2 decisiones 4–8, fila «remix» de §3, campo `publicado` de §4, módulo remix de §5, errores de remix de §6 y §7 con su «Resultado de la prueba». La parte «por link» ya está en producción (PR #11, `50f905e`); su plan: `docs/plans/2026-10-22-admin-fase2-link.md` (misma rama de la spec).

**Línea base medida (2026-10-22):** web `node --test "src/app/admin/lib/*.test.js"` → 84 pasan; `npm test` → 144 pasan. PC `python -m pytest -q` en `D:\METACHO CLAUDE\PREMIERE-CLAUDE\cantados` → 314 pasan. Todo el código de las tareas 5–11 se corrió en una copia desechable del PC (368 pasan) y el de las tareas 1–3 en una copia de `lib/` (89 pasan; `eslint` sin salida en los archivos nuevos).

## Decisiones del plan

1. **Remix disponible en la web:** `TIPOS_DISPONIBLES = ["pantallazos", "link", "remix"]`. Ranura nueva `publicado` (`cantados/<id>/publicado.<ext>`), solo en remix; se verifica su tamaño como las demás y se borra con el prefijo al bajar, cancelar, fallar, a las 48 h de borrador y al entregar (regla de la fase 1).
2. **El remix no muestra selector de estilo** (el PC pone el contrario del publicado); el título sigue opcional. El `estilo` que queda en Redis es el de por defecto y el PC lo ignora para el remix.
3. **«Lo hizo el sistema nuevo»** = en `PROYECTOS` hay un proyecto `renderizado` con el mismo link (`_mismo_link`, contra su `url` o contra el link del pedido que lo creó) **o** el mismo id de video (el link corto se resuelve siguiendo su redirección; cada «compartir» de TikTok da otro código corto) **y** uno de sus cortes (`salida.mp4` o `salida-YT.mp4`) dura lo mismo que el publicado ±1 s. Si el publicado es el corto de YouTube, solo se usan sus `corto_yt.n` comentarios. Si varios cumplen, el más reciente. Si ninguno cumple, camino OCR: nunca se adivina el proyecto.
4. **Revisión:** camino proyecto.json → `aprobado` enseguida (textos y líneas ya revisados al hacer el original; sin Claude ni Oscar). Camino OCR → `por_revisar`: Claude corrobora las tarjetas dibujadas y las leídas de pantallazos (cuadro + whisper) y pasa `linea_letra` por el reglamento **sin quitar ni reordenar**; `revisado` lo aprueba directo y **se niega** si queda alguna sin `corroborar.ok`. Los dos caminos salen el mismo día (spec §2.5).
5. **«El primero sigue siendo de los más graciosos»** = está entre los 3 con más likes (sin likes cuenta el puesto en el publicado: el de arriba es más gracioso). El primero nuevo es el más gracioso que no iba primero; los demás van de más a menos gracioso y, si alguno queda en su puesto original, se cambia con el vecino (con 2 o más comentarios siempre se logra que nadie quede en su puesto).
6. **Contrario:** salsa → merengue, merengue → salsa, con los dos («Salsa, merengue») manda el primero. Color: el que sigue en la paleta al del proyecto previo. Sin proyecto previo (camino OCR, p. ej. un video de Premiere) no se conoce ni el estilo ni el color: se alternan como en un pedido nuevo y el informe lo dice.
7. **Emparejar:** parecido de texto normalizado (minúsculas, sin tildes, emojis, espacios ni puntuación) ≥ 0,75 —el umbral con el que la prueba de §7 recuperó 83–100 %—, o ≥ 0,55 si además coincide el usuario. Cada comentario se usa una vez. Una tarjeta sin texto legible nunca se empareja (dos textos vacíos «se parecen» al 100 %).
8. **Tarjeta dibujada:** texto leído del publicado (Claude lo corrige contra el cuadro; nunca se inventa), usuario de una lista fija de 16 nombres neutros sin chocar con los reales del video, `likes: null` (la plantilla no dibuja likes), `avatar: null` (la plantilla dibuja el círculo genérico) y `fecha: ""`.
9. **whisper:** el mismo de `alinear.py` (`subtitular.transcribir_palabras`, modelo medium, con los textos leídos como «soplón»), una sola vez por remix y solo si hay algo que corroborar; ventana de cada tarjeta = [t0 − 0,5 s, t1 + 0,5 s] (medio cuadro de margen).
10. **TikTok con sesión o captcha en un remix:** el PC llama `necesita-pantallazos` (la web lo acepta ahora también para remix); Oscar sube pantallazos de los comentarios en TikTok **en cualquier orden**; el pedido sigue `modo: remix` y se empareja contra ellos. El OCR del publicado queda en `logs/web/<id>/tarjetas.json` y no se repite. Los comentarios sacados de pantallazos también se corroboran (su texto es OCR).
11. **Sin tarjetas legibles** (spec §6): `fallido` con motivo «no pude leer las tarjetas del video publicado; pídelo «Con pantallazos» con fotos de sus tarjetas». Reenviarlo con pantallazos del publicado = un pedido «Con pantallazos» normal (Oscar pone el orden); no hay un remix con pantallazos del publicado en este plan.
12. **Resumen:** una línea por remix, una sola vez (`remix_resumido`): «Remix <carpeta>: N de M tarjetas dibujadas (usuario inventado, sin likes)».
13. **Orden de tareas:** la web completa primero (es inofensiva: el PC de hoy deja los remix en la web con «el PC todavía no lo sabe hacer»). En el PC, el camino proyecto.json de punta a punta (Task 6) antes del OCR (Tasks 7–10). Mientras falte el OCR, un remix de un video ajeno se queda `recibido` (no falla) y sale en la franja siguiente a la Task 10.
14. **Repos:** web en la rama `feat/admin-remix` creada desde `main`. `PREMIERE-CLAUDE/cantados` está dentro del git de `PREMIERE-CLAUDE` con cambios de otra sesión sin commit (y `cantados/` ni siquiera está rastreado): en el PC **no se hace commit**; al final se le avisa a Oscar.
15. **El código del PC es el que corre la franja:** cada tarea del PC termina con la suite completa verde y no se deja una tarea a medias entre la 1:50 p. m. y el fin de la franja.

## Global Constraints

- Código web solo en `src/app/admin/**`; docs en `docs/admin.md` (y este plan en `docs/plans/`). No tocar `package.json`, `package-lock.json` ni otros archivos compartidos (spec §9).
- Toda API sigue verificando sesión (cookie `admin_sesion`) o `ADMIN_PC_TOKEN` (rutas `api/pc/*`) antes de leer nada; no se crean rutas nuevas.
- Redis, solo texto: el pedido gana `publicado` (archivo, solo `remix`, ruta `cantados/<id>/publicado.<ext>`). Tipos: `pantallazos` | `link` | `remix`. Link: `https://(www.|vm.|vt.)tiktok.com/…`.
- Remix: comentarios reales siempre; el texto se lee del video publicado y nunca se inventa; sin pareja en TikTok → tarjeta dibujada con el texto real, usuario inventado, sin likes; orden nuevo (el primero de los más graciosos, ninguno en su puesto cuando se pueda); estilo contrario (salsa ↔ merengue) y otro color de karaoke; sin revisión de letra: va a Suno el mismo día; el resumen dice cuántas tarjetas se dibujaron.
- TikTok pide sesión o captcha → `necesita_pantallazos`; los pantallazos reemplazan la búsqueda en TikTok.
- Nada de archivos en la nube tras bajarlos: el publicado y el clip se borran de Blob cuando el PC los baja (fase 1).
- La franja desatendida de las 2 p. m. sigue haciendo Telegram, pedidos con pantallazos y pedidos por link (pruebas de regresión: suite completa del PC verde en cada tarea).
- Textos de la interfaz en español, tuteo colombiano; teléfono primero (columna de 480 px, botones ≥ 44 px).
- Verificación web antes de cada commit: `node --test "src/app/admin/lib/*.test.js"` (Node 24), `npm test`, `npx eslint --ignore-pattern ".claude/**"`, `npm run build`, todo sin errores.
- PC: `python -m pytest -q` en `D:\METACHO CLAUDE\PREMIERE-CLAUDE\cantados`. `tests/conftest.py` bloquea la red: las pruebas nuevas reemplazan la web, TikTok, whisper y ffmpeg (monkeypatch o archivos mínimos). Nunca abrir `.env*`.

## Review Focus

1. **Oscar pega otro link corto del mismo TikTok** (cada «compartir» genera otro `vt.tiktok.com/…`): el proyecto previo se debe hallar por el id del video y la duración, y uno del mismo video con otra duración (otra edición) no se debe usar → prueba: Task 6, `test_previo_con_otro_link_corto_se_halla_por_id_y_duracion`.
2. **Oscar sube el corte corto de YouTube como «publicado»:** solo deben salir los comentarios de ese corte, no los del largo → prueba: Task 6, `test_remix_del_corte_de_youtube_usa_solo_sus_comentarios`.
3. **Una tarjeta del publicado es solo emoji o sticker (el OCR no lee texto):** no debe emparejarse con un comentario vacío de TikTok (un sticker) y tomar su usuario y likes → prueba: Task 8, `test_tarjeta_sin_texto_legible_no_se_empareja_con_un_comentario_vacio`.
4. **Claude corre `revisado` en un remix por OCR sin corroborar las tarjetas dibujadas:** no debe aprobarse (se cantaría texto que nadie miró) → prueba: Task 10, `test_revisado_de_remix_exige_corroborar`.
5. **TikTok pide sesión en un remix y Oscar sube pantallazos:** debe seguir siendo remix (no un pedido de pantallazos con el orden de las fotos), emparejar contra las fotos y no repetir el OCR del publicado → prueba: Task 10, `test_remix_con_captcha_vuelve_con_pantallazos_y_empareja_contra_ellos`.

---

## Parte A · Web (`C:\Users\delga\Documents\elmetacho-web`)

- [ ] **Preparación:** `git checkout main && git pull && git checkout -b feat/admin-remix`. `node --test "src/app/admin/lib/*.test.js"` → 84 pasan; `npm test` → 144 pasan. Los números de línea de esta parte son los de `main` en `50f905e` antes de editar: dentro de un mismo archivo, ubica cada cambio por el texto citado (los anteriores corren las líneas).

### Task 1: Remix disponible y ranura `publicado` en el modelo

**Files:**
- Modify: `src/app/admin/lib/pedido.js` (`PATRON` líneas 9-13; `TIPOS_DISPONIBLES` línea 21; `nuevoPedido` líneas 27-30; bucle de archivos de `aplicarCambios` líneas 60-65; `erroresParaEnviar` línea 94; `archivos` línea 98)
- Test: `src/app/admin/lib/pedido.test.js` (líneas 77 y 101-106, más pruebas nuevas al final), `src/app/admin/lib/api.test.js` (prueba «crear», líneas 156-162)

**Interfaces:**
- Consumes: lo de la fase 2 por link (`tipoDe`, `linkValido`, `archivoValido`, `PATRON`).
- Produces: `TIPOS_DISPONIBLES = ["pantallazos", "link", "remix"]`; `nuevoPedido(id, creado, tipo)` agrega `publicado: null`; `aplicarCambios(p, c)` acepta `c.publicado` (archivo `publicado.<ext>` del pedido) solo si `tipoDe(p) === "remix"` (si no: «Este pedido no lleva video publicado.»); `erroresParaEnviar(p)` exige link en `link` y `remix` y «Falta tu video ya publicado.» en `remix`; `archivos(p)` → `[original, gancho, publicado, ...pantallazos]` (sin nulos).

- [ ] **Paso 1: pruebas que fallan.** En `pedido.test.js`, línea 77, cambia la lista esperada:

```js
  assert.deepEqual(TIPOS_DISPONIBLES, ["pantallazos", "link", "remix"]);
```

Reemplaza la prueba de las líneas 101-106 (ya no hay «remix todavía no») por:

```js
test("para enviar por link: original, tramo, gancho y link (sin pantallazos)", () => {
  const base = { original: arch("original.mp4", { duracion: 28 }), tramos: [[0, 4]], gancho: arch("gancho.mov") };
  assert.deepEqual(erroresParaEnviar({ ...L(), ...base }), ["Falta el link de TikTok."]);
  assert.deepEqual(erroresParaEnviar({ ...L(), ...base, link: "https://vt.tiktok.com/ZS9/" }), []);
});
```

Agrega al final de `pedido.test.js`:

```js
const R = () => nuevoPedido("c_20261021_ab12", "2026-10-21T18:30:00.000Z", "remix");

test("remix: lleva link y video publicado; los otros tipos no llevan publicado", () => {
  assert.equal(R().publicado, null);
  const pub = arch("publicado.mp4", { duracion: 61 });
  const r = aplicarCambios(R(), { publicado: pub, link: "https://vt.tiktok.com/ZS9/" });
  assert.deepEqual(r.errores, []);
  assert.equal(r.pedido.publicado.pathname, "cantados/c_20261021_ab12/publicado.mp4");
  assert.match(aplicarCambios(L(), { publicado: pub }).errores[0], /no lleva video publicado/);
  assert.match(aplicarCambios(P(), { publicado: pub }).errores[0], /no lleva video publicado/);
  assert.match(aplicarCambios(R(), { publicado: arch("original.mp4") }).errores[0], /archivo/);
  assert.match(aplicarCambios(R(), { pantallazos: [arch("p01.jpg")] }).errores[0], /no lleva pantallazos/);
});

test("para enviar un remix: clip original, tramo, gancho nuevo, link y publicado", () => {
  const base = { original: arch("original.mp4", { duracion: 28 }), tramos: [[0, 4]], gancho: arch("gancho.mov") };
  assert.deepEqual(erroresParaEnviar({ ...R(), ...base }), ["Falta el link de TikTok.", "Falta tu video ya publicado."]);
  const listo = { ...R(), ...base, link: "https://vt.tiktok.com/ZS9/", publicado: arch("publicado.mp4") };
  assert.deepEqual(erroresParaEnviar(listo), []);
  assert.deepEqual(archivos(listo), [listo.original.pathname, listo.gancho.pathname, listo.publicado.pathname]);
  assert.deepEqual(erroresParaEnviar({ ...listo, publicado: { ...listo.publicado, tamano: 0 } }), ["Falta tu video ya publicado."]);
  assert.match(erroresParaEnviar({ ...listo, tipo: "otro" }).join(" "), /todavía no/);
});
```

En `api.test.js` reemplaza la prueba de las líneas 156-162 por:

```js
test("crear: el tipo viene en el cuerpo; sin cuerpo es pantallazos; remix sí; basura no", async () => {
  const { api, almacen } = montar();
  const { id } = await (await api.crear(conSesion())).json();
  assert.equal((await almacen.leer(id)).tipo, "pantallazos");
  const r = await api.crear(conSesion({ tipo: "remix" }));
  assert.equal(r.status, 200);
  assert.equal((await almacen.leer((await r.json()).id)).tipo, "remix");
  assert.equal((await api.crear(conSesion({ tipo: "otro" }))).status, 400);
});
```

- [ ] **Paso 2:** `node --test "src/app/admin/lib/*.test.js"` → FALLAN 4: `tipos: pantallazos por defecto…` (`TIPOS_DISPONIBLES` sin remix), `remix: lleva link y video publicado…` (`R().publicado` es `undefined`), `para enviar un remix…` y `crear: … remix sí…` (400).
- [ ] **Paso 3: implementación en `pedido.js`.** Reemplaza el bloque `PATRON` (líneas 9-13) por:

```js
const PATRON = {
  original: /^original\.[a-z0-9]{2,5}$/,
  gancho: /^gancho\.[a-z0-9]{2,5}$/,
  pantallazo: /^p\d{2}\.[a-z0-9]{2,5}$/,
  publicado: /^publicado\.[a-z0-9]{2,5}$/,   // remix: el video ya publicado del que salen los comentarios
};
```

Línea 21:

```js
export const TIPOS_DISPONIBLES = ["pantallazos", "link", "remix"];
```

En `nuevoPedido` (línea 29):

```js
  original: null, gancho: null, pantallazos: [], link: null, publicado: null, motivo: null,
```

Reemplaza el bucle de archivos de `aplicarCambios` (líneas 60-65) por:

```js
  for (const campo of ["original", "gancho", "publicado"]) {
    if (campo in c) {
      if (campo === "publicado" && tipoDe(p) !== "remix") {
        errores.push("Este pedido no lleva video publicado.");
        continue;
      }
      const a = archivoValido(p.id, c[campo], PATRON[campo]);
      a ? (out[campo] = a) : errores.push(`El archivo de ${campo} no es de este pedido.`);
    }
  }
```

En `erroresParaEnviar`, reemplaza la línea 94 (`if (tipo === "link" && …`) por:

```js
  if (tipo !== "pantallazos" && !linkValido(p.link)) e.push("Falta el link de TikTok.");
  if (tipo === "remix" && !(p.publicado?.tamano > 0)) e.push("Falta tu video ya publicado.");
```

Y `archivos` (línea 98):

```js
export const archivos = (p) => [p.original, p.gancho, p.publicado, ...(p.pantallazos || [])].filter(Boolean).map((a) => a.pathname);
```

- [ ] **Paso 4:** `node --test "src/app/admin/lib/*.test.js"` → 86 pasan, 0 fallan. `npm test` → 146 pasan. `npx eslint --ignore-pattern ".claude/**"` → sin salida.
- [ ] **Paso 5: commit**

```bash
git add src/app/admin/lib/pedido.js src/app/admin/lib/pedido.test.js src/app/admin/lib/api.test.js
git commit -m "Admin remix: tipo disponible y ranura del video publicado en el modelo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: API del remix (verificar, avisar, firmar y borrar el publicado; pedir pantallazos)

**Files:**
- Modify: `src/app/admin/lib/api.js` (`verificarArchivos` línea 21; `enviar` líneas 83-85; `pcPedidos` línea 122; `pcBajado` línea 130; `pcNecesitaPantallazos` líneas 192-193)
- Test: `src/app/admin/lib/api.test.js` (al final)

**Interfaces:**
- Consumes: Task 1 (`publicado` en el pedido, `TIPOS_DISPONIBLES` con remix).
- Produces: `PATCH`/`enviar` verifican el tamaño real del `publicado` en Blob; aviso «📥 Recibí: … — remix: sale a las 2 p. m., sin revisión (…)»; `GET /admin/api/pc/pedidos` → cada pedido trae `publicado: {pathname, tamano, duracion, ancho, alto, nombre, url} | null`; `pcBajado` deja `publicado: null` (y borra el prefijo); `POST …/necesita-pantallazos` acepta `link` y `remix` en `en_pc` (repetido → 200 sin aviso).

- [ ] **Paso 1: pruebas que fallan** (al final de `api.test.js`):

```js
async function pedidoRemix(api, tamanos) {
  const { id } = await (await api.crear(conSesion({ tipo: "remix" }))).json();
  const base = `cantados/${id}/`;
  for (const [n, t] of [["original.mp4", 500], ["gancho.mov", 300], ["publicado.mp4", 900]]) tamanos.set(base + n, t);
  const r = await api.cambiar(conSesion({ original: { pathname: base + "original.mp4", tamano: 500, duracion: 28 }, tramos: [[0, 4]],
    gancho: { pathname: base + "gancho.mov", tamano: 300 }, publicado: { pathname: base + "publicado.mp4", tamano: 900, duracion: 61 },
    link: "https://vt.tiktok.com/ZS9/" }, "PATCH"), id);
  assert.equal(r.status, 200);
  return id;
}

test("remix: se envía con aviso, el PC recibe el publicado firmado y al bajarlo se borra todo de Blob", async () => {
  const { api, almacen, avisos, tamanos, borrados } = montar();
  const id = await pedidoRemix(api, tamanos);
  assert.equal((await api.enviar(conSesion(), id)).status, 200);
  assert.match(avisos[0], /remix/);
  const [p] = await (await api.pcPedidos(pc())).json();
  assert.deepEqual([p.tipo, p.link, p.estado], ["remix", "https://vt.tiktok.com/ZS9/", "listo"]);
  assert.equal(p.publicado.url, `https://firmado/cantados/${id}/publicado.mp4`);
  assert.equal((await api.pcBajado(pc(), id)).status, 200);
  const g = await almacen.leer(id);
  assert.deepEqual([g.estado, g.original, g.gancho, g.publicado], ["en_pc", null, null, null]);
  assert.deepEqual(borrados, [`cantados/${id}/`]);
});

test("remix: no se envía sin el publicado ni con un publicado que no terminó de subir", async () => {
  const { api, almacen, tamanos, avisos } = montar();
  const id = await pedidoRemix(api, tamanos);
  const p = await almacen.leer(id);
  await almacen.guardar({ ...p, publicado: null });
  const r = await api.enviar(conSesion(), id);
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /publicado/);
  await almacen.guardar(p);
  tamanos.set(`cantados/${id}/publicado.mp4`, 10);
  assert.equal((await api.enviar(conSesion(), id)).status, 400);
  assert.deepEqual([(await almacen.leer(id)).estado, avisos.length], ["subiendo", 0]);
});

test("necesita-pantallazos: también para un remix en el PC; repetido no avisa otra vez; pantallazos no", async () => {
  const { api, almacen, avisos } = montar();
  const id = await enPc(almacen, { tipo: "remix", publicado: null });
  assert.equal((await api.pcNecesitaPantallazos(pcCon({ motivo: "captcha" }), id)).status, 200);
  assert.deepEqual([(await almacen.leer(id)).estado, avisos.length], ["necesita_pantallazos", 1]);
  assert.equal((await api.pcNecesitaPantallazos(pcCon({ motivo: "captcha" }), id)).status, 200);
  assert.equal(avisos.length, 1);
  await enPc(almacen, { tipo: "pantallazos" });
  assert.equal((await api.pcNecesitaPantallazos(pcCon({}), id)).status, 409);
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/api.test.js` → FALLAN las 3: el aviso no dice «remix» (y `p.publicado` es `undefined`); el `PATCH` con un `publicado` de tamaño 10 no se rechaza al enviar (`verificarArchivos` no lo mira) → 200 en vez de 400; `necesita-pantallazos` de un remix → 409.
- [ ] **Paso 3: implementación en `api.js`.** Línea 21:

```js
    const lista = [c.original, c.gancho, c.publicado, ...(Array.isArray(c.pantallazos) ? c.pantallazos : [])].filter(Boolean);
```

Reemplaza las líneas 83-85 (`const cuando = …`) por:

```js
      const cuando = {
        link: "a las 2 p. m. Claude escoge los comentarios y te mando el enlace para revisarlos.",
        remix: "remix: sale a las 2 p. m., sin revisión (mismos comentarios en otro orden, con otra canción).",
      }[tipoDe(p)] ?? "sale a las 2 p. m.";
```

Reemplaza la línea 122 por:

```js
        original: await firmar(p.original), gancho: await firmar(p.gancho), publicado: await firmar(p.publicado ?? null),
        pantallazos: await Promise.all((p.pantallazos || []).map(firmar)),
```

Línea 130:

```js
      await almacen.guardar({ ...p, estado: "en_pc", original: null, gancho: null, publicado: null, pantallazos: [] });
```

Reemplaza las líneas 192-193 por:

```js
      const conLink = ["link", "remix"].includes(tipoDe(p));   // remix: los pantallazos reemplazan la búsqueda en TikTok
      if (conLink && p.estado === "necesita_pantallazos") return json({ ok: true });
      if (!conLink || p.estado !== "en_pc") return json({ error: "Ese pedido no puede pasar a pantallazos." }, 409);
```

- [ ] **Paso 4:** `node --test "src/app/admin/lib/*.test.js"` → 89 pasan, 0 fallan. `npm test` → 149 pasan. `npx eslint --ignore-pattern ".claude/**"` → sin salida.
- [ ] **Paso 5: commit**

```bash
git add src/app/admin/lib/api.js src/app/admin/lib/api.test.js
git commit -m "Admin remix: el PC recibe el publicado firmado, se borra al bajar y puede pedir pantallazos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Pantallas: «Nuevo video → Remix» y «Subir pantallazos» del remix

**Files:**
- Modify (reemplazo completo): `src/app/admin/cantados/nuevo/NuevoPedido.jsx`
- Modify: `src/app/admin/cantados/[id]/pantallazos/SubirPantallazos.jsx` (firma línea 8; texto de «Listo» línea 50; aviso línea 61), `src/app/admin/cantados/[id]/pantallazos/page.jsx` (import línea 1; línea 20)

**Interfaces:**
- Consumes: Tasks 1-2 (`TIPOS_DISPONIBLES` con remix; `PATCH` acepta `publicado`; la subida directa ya acepta cualquier archivo de la carpeta del pedido en `subiendo`).
- Produces: subida a la ranura `publicado` (`cantados/<id>/publicado.<ext>`, clave de barra `publicado`); `SubirPantallazos({ id, nombre, motivo, remix = false })`.

- [ ] **Paso 1: reemplaza `NuevoPedido.jsx` completo** por (el remix muestra: link del original, video publicado, clip original con el editor de tramos, gancho nuevo y título; sin selector de estilo; gancho y publicado comparten `subirVideo`):

```jsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Barra from "../Barra.jsx";
import ListaPantallazos from "../ListaPantallazos.jsx";
import { encolarPatch } from "../cola.js";
import { subirArchivo, usePantallazos, useTrabajos } from "../subidas.js";
import EditorTramos from "./EditorTramos.jsx";
import { extSegura } from "../../lib/editor.js";
import { ESTILOS, TIPOS_DISPONIBLES, linkValido } from "../../lib/pedido.js";

const boton = "rounded bg-[#E10600] p-4 text-lg font-bold text-white disabled:opacity-40";
const OPCIONES = [
  { tipo: "pantallazos", titulo: "Con pantallazos", detalle: "Tú escoges los comentarios y subes las fotos." },
  { tipo: "link", titulo: "Por link", detalle: "Claude escoge los comentarios de TikTok y tú los revisas aquí." },
  { tipo: "remix", titulo: "Remix", detalle: "Reeditar un cantado ya publicado: mismos comentarios en otro orden, otra canción. Sin revisión." },
];
// Orden de las secciones de cada tipo (los números de los títulos salen de aquí).
const SECCIONES = {
  pantallazos: ["original", "gancho", "pantallazos", "estilo"],
  link: ["link", "original", "gancho", "estilo"],
  remix: ["link", "publicado", "original", "gancho", "estilo"],
};
const LISTO = {
  pantallazos: "Listo: sale a las 2 p. m.",
  link: "Listo: a las 2 p. m. Claude escoge los comentarios y te llega el enlace para revisarlos.",
  remix: "Listo: el remix sale a las 2 p. m., sin revisión.",
};

// Lee duración y tamaño en píxeles de un video local.
function leerMeta(url) {
  return new Promise((ok, mal) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => ok({ duracion: v.duration, ancho: v.videoWidth, alto: v.videoHeight });
    v.onerror = () => mal(new Error("No pude leer ese video. Prueba con otro."));
    v.src = url;
  });
}

const Seccion = ({ titulo, children }) => (
  <section className="flex flex-col gap-3 rounded border border-black/15 bg-white p-3">
    <h2 className="text-lg font-bold">{titulo}</h2>
    {children}
  </section>
);

export default function NuevoPedido() {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [tipo, setTipo] = useState(null);
  const [link, setLink] = useState("");
  const [linkGuardado, setLinkGuardado] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState("");
  const [original, setOriginal] = useState(null); // { url, nombre, duracion, ancho, alto, subido }
  const [tramos, setTramos] = useState([]);
  const [gancho, setGancho] = useState(null); // { nombre }
  const [publicado, setPublicado] = useState(null); // { nombre } (solo remix)
  const [avisoGancho, setAvisoGancho] = useState("");
  const [estilo, setEstilo] = useState(ESTILOS[0]);
  const [titulo, setTitulo] = useState("");
  const { trabajos, fijarTrabajo, conOcupado, subiendo } = useTrabajos(); // trabajos: barras; subiendo: hay handlers en curso
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [ocupOrig, setOcupOrig] = useState(false);
  const [ocupGancho, setOcupGancho] = useState(false);
  const [ocupPub, setOcupPub] = useState(false);

  const idRef = useRef(null);
  const videoRef = useRef(null);
  const cola = useRef(Promise.resolve());
  const origenGuardado = useRef(false); // el original ya está en el servidor, con su duración
  const tramosRef = useRef([]);
  const urlOrig = useRef(null);

  useEffect(() => {
    const urlActual = urlOrig;
    return () => {
      if (urlActual.current) URL.revokeObjectURL(urlActual.current);
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

  // PATCH en fila (el servidor lee y escribe el pedido completo: de a uno evita pisarse).
  const patch = (cuerpo) => encolarPatch(cola, `/admin/api/cantados/${idRef.current}`, cuerpo);
  const subir = (clave, file, nombre) => subirArchivo(idRef.current, clave, file, nombre, fijarTrabajo);
  const { pants, elegir: elegirPants, moverPant, quitarPant } = usePantallazos({
    listoParaElegir: () => Boolean(idRef.current),
    subir,
    patch,
    conOcupado,
    alError: setErrorGlobal,
    alLimpiar: () => setErrorGlobal(""),
  });

  async function elegirOriginal(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !idRef.current) return;
    setErrorGlobal("");
    setOcupOrig(true);
    await conOcupado(async () => {
      const url = URL.createObjectURL(file);
      try {
        let meta;
        try {
          meta = await leerMeta(url);
        } catch (err) {
          URL.revokeObjectURL(url);
          return setErrorGlobal(err.message);
        }
        if (urlOrig.current) URL.revokeObjectURL(urlOrig.current);
        urlOrig.current = url;
        origenGuardado.current = false;
        tramosRef.current = [];
        setTramos([]); // otra duración: hay que marcar de nuevo
        setOriginal({ url, nombre: file.name, ...meta, subido: false });
        try {
          const f = await subir("original", file, `original${extSegura(file.name, "video")}`);
          await patch({ original: { ...f, duracion: meta.duracion, ancho: meta.ancho, alto: meta.alto } });
          origenGuardado.current = true;
          setOriginal((o) => o && { ...o, subido: true });
          // Tramos marcados mientras subía: ahora sí se validan contra la duración.
          if (tramosRef.current.length) await patch({ tramos: tramosRef.current });
        } catch (err) {
          setErrorGlobal(err.message);
        }
      } finally {
        setOcupOrig(false);
      }
    });
  }

  function cambioTramos(nuevos) {
    tramosRef.current = nuevos;
    setTramos(nuevos);
    if (nuevos.length === 0 || !origenGuardado.current) return; // sin original guardado se envían tras guardarlo
    patch({ tramos: nuevos }).catch((err) => setErrorGlobal(err.message));
  }

  // Video que no se previsualiza (gancho, publicado): lee su tamaño, lo sube a la ranura `clave` y lo guarda.
  // `alLeer(meta)` corre antes de subir (limpia lo anterior y avisa); `alSubir(file)` cuando quedó guardado.
  async function subirVideo(e, clave, setOcup, alLeer, alSubir) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !idRef.current) return;
    setErrorGlobal("");
    setOcup(true);
    await conOcupado(async () => {
      try {
        const url = URL.createObjectURL(file);
        let meta;
        try {
          meta = await leerMeta(url);
        } catch (err) {
          return setErrorGlobal(err.message);
        } finally {
          URL.revokeObjectURL(url);
        }
        alLeer(meta);
        try {
          const f = await subir(clave, file, `${clave}${extSegura(file.name, "video")}`);
          await patch({ [clave]: { ...f, duracion: meta.duracion, ancho: meta.ancho, alto: meta.alto } });
          alSubir(file);
        } catch (err) {
          setErrorGlobal(err.message);
        }
      } finally {
        setOcup(false);
      }
    });
  }

  function elegirGancho(e) {
    return subirVideo(
      e,
      "gancho",
      setOcupGancho,
      (meta) => {
        setGancho(null);
        setAvisoGancho(Math.min(meta.ancho, meta.alto) < 1080 ? "Tu gancho no está en 1080p" : "");
      },
      (file) => setGancho({ nombre: file.name }),
    );
  }

  function elegirPublicado(e) {
    return subirVideo(e, "publicado", setOcupPub, () => setPublicado(null), (file) => setPublicado({ nombre: file.name }));
  }

  function elegirEstilo(s) {
    setEstilo(s);
    patch({ estilo: s }).catch((err) => setErrorGlobal(err.message));
  }

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

  async function enviar() {
    setEnviando(true);
    setErrorGlobal("");
    try {
      await cola.current;
      const r = await fetch(`/admin/api/cantados/${idRef.current}/enviar`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo enviar.");
      setListo(true);
      setTimeout(() => {
        router.push("/admin");
      }, 1500);
    } catch (err) {
      setErrorGlobal(err.message);
      setEnviando(false);
    }
  }

  const esRemix = tipo === "remix";
  const conLink = tipo === "link" || esRemix;
  const faltan = [
    !original?.subido && (esRemix ? "clip original" : "video original"),
    tramos.length === 0 && "marcar un tramo",
    !gancho && "gancho",
    conLink && !linkGuardado && "link de TikTok",
    esRemix && !publicado && "video publicado",
    tipo === "pantallazos" && pants.length === 0 && "al menos un pantallazo",
  ].filter(Boolean);
  const falta = !id || faltan.length > 0;
  const num = (s) => (SECCIONES[tipo] || []).indexOf(s) + 1;

  if (listo) return <p className="pt-10 text-center text-xl font-bold">{LISTO[tipo]}</p>;

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{esRemix ? "Remix" : "Nuevo video"}</h1>
        <a href="/admin" className="text-sm underline">
          Volver
        </a>
      </div>
      {errorGlobal && <p className="rounded bg-red-100 p-2 text-[#E10600]">{errorGlobal}</p>}

      {conLink && (
        <Seccion titulo={`${num("link")}. Link de TikTok${esRemix ? " del video original" : ""}`}>
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
          <p className="text-sm text-black/60">
            {esRemix
              ? "Sirve para buscar los comentarios reales (usuario, likes, foto) de las tarjetas de tu video."
              : "Solo sirve para leer los comentarios: el video súbelo abajo."}
          </p>
          {linkGuardado && <p className="text-sm text-black/70">Link guardado.</p>}
        </Seccion>
      )}

      {esRemix && (
        <Seccion titulo={`${num("publicado")}. Tu video ya publicado`}>
          <input type="file" accept="video/*" onChange={elegirPublicado} disabled={!id || ocupPub} />
          <Barra t={trabajos.publicado} />
          <p className="text-sm text-black/60">El cantado tal como salió: de sus tarjetas salen los comentarios.</p>
          {publicado && <p className="text-sm text-black/70">Subido: {publicado.nombre}</p>}
        </Seccion>
      )}

      <Seccion titulo={`${num("original")}. ${esRemix ? "Clip original (el de TikTok, sin editar)" : "Video original"}`}>
        <input type="file" accept="video/*" onChange={elegirOriginal} disabled={!id || ocupOrig} />
        <Barra t={trabajos.original} />
        {original && (
          <>
            <video ref={videoRef} src={original.url} controls playsInline className="w-full rounded bg-black" />
            <EditorTramos duracion={original.duracion} tramos={tramos} onCambio={cambioTramos} videoRef={videoRef} />
          </>
        )}
      </Seccion>

      <Seccion titulo={`${num("gancho")}. ${esRemix ? "Tu gancho nuevo" : "Tu gancho"}`}>
        <input type="file" accept="video/*" onChange={elegirGancho} disabled={!id || ocupGancho} />
        <Barra t={trabajos.gancho} />
        {avisoGancho && <p className="rounded bg-yellow-200 p-2">{avisoGancho}</p>}
        {gancho && <p className="text-sm text-black/70">Subido: {gancho.nombre}</p>}
      </Seccion>

      {tipo === "pantallazos" && (
        <Seccion titulo={`${num("pantallazos")}. Pantallazos`}>
          <input type="file" accept="image/*" multiple onChange={elegirPants} disabled={!id} />
          {Object.entries(trabajos)
            .filter(([k]) => k.startsWith("pant"))
            .map(([k, t]) => (
              <Barra key={k} t={t} />
            ))}
          <ListaPantallazos pants={pants} onMover={moverPant} onQuitar={quitarPant} />
        </Seccion>
      )}

      <Seccion titulo={`${num("estilo")}. ${esRemix ? "Título" : "Estilo y título"}`}>
        {esRemix ? (
          <p className="text-sm text-black/60">El estilo y el color del karaoke salen al contrario del publicado (salsa ↔ merengue).</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {ESTILOS.map((s) => (
              <button
                key={s}
                onClick={() => elegirEstilo(s)}
                className={`rounded border-2 p-3 ${estilo === s ? "border-[#E10600] bg-[#E10600] font-bold text-white" : "border-black/30 bg-white"}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título (opcional)"
          onBlur={() => patch({ titulo }).catch((err) => setErrorGlobal(err.message))}
          className="rounded border border-black/30 bg-white p-3"
        />
      </Seccion>

      <button className={boton} disabled={subiendo || falta || enviando} onClick={enviar}>
        {enviando ? "Enviando…" : subiendo ? "Subiendo…" : "Enviar pedido"}
      </button>
      {falta && !subiendo && id && <p className="text-sm text-black/60">Falta: {faltan.join(", ")}.</p>}
    </div>
  );
}
```

- [ ] **Paso 2: «Subir pantallazos» para remix.** En `SubirPantallazos.jsx`, línea 8:

```jsx
export default function SubirPantallazos({ id, nombre, motivo, remix = false }) {
```

Línea 50 (texto de «Listo»):

```jsx
        <p className="text-xl font-bold">
          {remix ? "Listo: el remix sale a las 2 p. m. con estos pantallazos." : "Listo: sale a las 2 p. m. como pedido con pantallazos."}
        </p>
```

Línea 61 (dentro del `<p className="rounded bg-yellow-200 p-2 text-sm">`):

```jsx
        {nombre}: {motivo || "TikTok no dejó leer los comentarios"}.{" "}
        {remix
          ? "Sube pantallazos de los comentarios en TikTok, en cualquier orden: el PC los empareja con las tarjetas de tu video publicado."
          : "Sube los pantallazos en el orden que quieres; el video, el bucle y el gancho ya los tiene el PC."}
```

En `[id]/pantallazos/page.jsx`, línea 1 y línea 20:

```jsx
import { nombreVisible, tipoDe } from "../../../lib/pedido.js";
```

```jsx
  return <SubirPantallazos id={p.id} nombre={nombreVisible(p)} motivo={p.motivo || ""} remix={tipoDe(p) === "remix"} />;
```

- [ ] **Paso 3: verificación.** `npx eslint --ignore-pattern ".claude/**"` → sin salida. `npm run build` → «Compiled successfully» y las rutas `/admin/cantados/nuevo` y `/admin/cantados/[id]/pantallazos` en la tabla. `npm test` → 149 pasan.
- [ ] **Paso 4: verificación a ojo** (sin pruebas automáticas de pantalla): en la vista previa del PR (la de Vercel; Oscar entra con su clave) o en `npm run dev` si `.env.local` ya existe (no abrirlo), en vista de teléfono: «Nuevo video» muestra **Remix** habilitado; al tocarlo salen 1. Link de TikTok del video original, 2. Tu video ya publicado, 3. Clip original (con «Marca inicio/fin»), 4. Tu gancho nuevo, 5. Título (sin botones de estilo); «Enviar pedido» se activa solo con los cinco y debajo dice qué falta. Anotar lo visto en el informe de la tarea (si no se pudo entrar, decirlo; no inventarlo).
- [ ] **Paso 5: commit**

```bash
git add src/app/admin/cantados/nuevo/NuevoPedido.jsx "src/app/admin/cantados/[id]/pantallazos/SubirPantallazos.jsx" "src/app/admin/cantados/[id]/pantallazos/page.jsx"
git commit -m "Admin remix: pantalla de nuevo remix (publicado, clip, gancho nuevo) y pantallazos del remix

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Documentación del remix en `docs/admin.md` y PR

**Files:**
- Modify: `docs/admin.md` (estados línea 29; nueva sección antes de «## Cómo se usa desde el celular» línea 31; filas de la tabla de API líneas 71, 72, 76, 77 y 85; «Lo verificado» línea 105; «Lo que NO se ha probado» línea 113)
- Add: `docs/plans/2026-10-22-admin-remix.md` (este plan)

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: documentación; PR abierto (sin fusionar).

- [ ] **Paso 1:** en `docs/admin.md` reemplaza la línea 29 por:

```markdown
`subiendo` → `listo` → `en_pc` → (por link) `en_revision` → `aprobado` → (borrado al entregar); (remix) `en_pc` → (borrado al entregar), sin revisión. Ramas: `en_pc` → `necesita_pantallazos` → `en_pc` (por link o remix); `fallido`. No se puede cancelar en `en_pc`, `en_revision` ni `aprobado` (el PC ya tiene el proyecto); `necesita_pantallazos` sí, hasta que el PC lo baje.
```

Justo antes de `## Cómo se usa desde el celular` inserta:

```markdown
## Remix (fase 2, spec `docs/superpowers/specs/2026-10-22-admin-fase2-design.md` §2.4–8, §5, §7)

1. **Nuevo video → Remix.** Pega el link del TikTok **original**, sube **tu video ya publicado** (el cantado tal como salió; también sirve el corte corto de YouTube), el **clip original** sin editar (marca los tramos como siempre) y tu **gancho nuevo**. Título opcional; no hay estilo: sale al contrario del publicado (salsa ↔ merengue) y con otro color de karaoke. No lleva pantallazos.
2. **Franja de las 2 p. m. (el mismo día, sin revisión).** El PC baja los tres videos (la web los borra) y busca los comentarios:
   - Si el publicado lo hizo este sistema (mismo link o mismo video de TikTok y un corte que dura lo mismo ±1 s), salen de su proyecto, con sus textos ya revisados: queda aprobado enseguida.
   - Si no (p. ej. un video de Premiere), lee las tarjetas del publicado (un cuadro cada 0,5 s + OCR), las empareja con los comentarios de TikTok (usuario, likes y foto reales) y las que no aparecen en TikTok se **dibujan** con el texto real, un usuario inventado, sin likes y con el avatar genérico. Claude corrige cada texto dudoso contra el cuadro y la transcripción del audio antes de cantarlo; nunca se inventa texto.
   - Reordena (el primero sigue siendo de los más graciosos; ninguno queda en su puesto), hace la canción, edita y entrega los dos cortes. El resumen del bot dice cuántas tarjetas se dibujaron.
3. **TikTok pide sesión o captcha:** llega el aviso con `…/admin/cantados/<id>/pantallazos`; sube pantallazos de los comentarios en TikTok **en cualquier orden** (el PC los empareja con las tarjetas) y toca «Enviar pantallazos».
4. **No se leyeron tarjetas del publicado:** el pedido queda `fallido` con el motivo; pídelo «Con pantallazos» con fotos de sus tarjetas en el orden que quieras.
5. **Riesgo de monetización (spec §2.8):** el primer remix se publica como prueba y se mira el panel de riesgo de monetización de Meta antes de hacer más.

En Redis el remix solo agrega `publicado` (archivo `cantados/<id>/publicado.<ext>`, solo mientras no se baja).

```

En la tabla de API reemplaza las filas de las líneas 71, 72, 76, 77 y 85 por, respectivamente:

```markdown
| `POST /admin/api/cantados` | Sesión | Crea pedido `subiendo`; cuerpo `{tipo}`: `pantallazos` (por defecto), `link` o `remix` |
| `PATCH /admin/api/cantados/<id>` | Sesión | Guarda link, tramos, título, estilo, pantallazos, archivos subidos (`original`, `gancho` y, solo en remix, `publicado`) (en `necesita_pantallazos` solo acepta pantallazos) |
| `GET /admin/api/pc/pedidos` | Solo PC | Pedidos `listo` (con `tipo`, `link`, `estado` y `publicado` firmado en remix) y `necesita_pantallazos` con pantallazos enviados (`original`/`gancho`/`publicado` en `null`), con enlaces firmados; limpia borradores > 48 h |
| `POST /admin/api/pc/pedidos/<id>/bajado` | Solo PC | Pasa `listo` y `necesita_pantallazos` a `en_pc`, borra sus blobs (también el publicado) y deja los archivos en `null` |
| `POST /admin/api/pc/pedidos/<id>/necesita-pantallazos` | Solo PC | Pedido por link o remix bloqueado por TikTok (`en_pc` → `necesita_pantallazos`): pide pantallazos con aviso. Repetido sobre un pedido que ya está en `necesita_pantallazos` → 200 sin cambios ni aviso nuevo |
```

Después de la línea 105 (`- Fase 2 por link (2026-10-22): …`) agrega:

```markdown
- Remix (2026-10-22): `npm test` 149 pasan, 0 fallan; `npx eslint --ignore-pattern ".claude/**"` sin salida; `npm run build` OK.
```

Después de la línea 113 (`- **Fase 2 por link:** …`) agrega:

```markdown
- **Remix:** un remix real de punta a punta (uno de un video de este sistema y uno de Premiere), la lectura de tarjetas sobre videos nuevos y el emparejamiento con TikTok real.
```

- [ ] **Paso 2:** `npm test` → 149 pasan; `npx eslint --ignore-pattern ".claude/**"` → sin salida; `npm run build` → OK.
- [ ] **Paso 3: commit**

```bash
git add docs/admin.md docs/plans/2026-10-22-admin-remix.md
git commit -m "Docs: remix en el admin (flujo, estados, API) y su plan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Paso 4: PR (sin fusionar).** En Git Bash:

```bash
git push -u origin feat/admin-remix
gh pr create --base main --title "Admin fase 2: remix de un cantado publicado" --body "$(cat <<'EOF'
Remix desde /admin: link del original + video publicado + clip original + tramos + gancho nuevo. El PC (PREMIERE-CLAUDE/cantados, sin commit en ese repo) lo hace el mismo día sin revisión.

- Modelo: tipo `remix` disponible, ranura `publicado` (se verifica su tamaño, se firma para el PC y se borra al bajar).
- API: aviso de remix, `necesita-pantallazos` también para remix.
- Pantallas: «Nuevo video → Remix» y «Subir pantallazos» del remix.
- Pruebas: `npm test` 149 pasan; eslint sin salida; build OK. Solo archivos de `src/app/admin/**` y `docs/`.

Falta: ver la pantalla en el celular (vista previa) y un remix real de punta a punta.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Esperado: la URL del PR. **No fusionar**: lo decide Oscar después de ver la vista previa en el celular (Task 3, paso 4). Mientras tanto la franja deja los remix en la web («el PC todavía no lo sabe hacer») hasta que esté la Parte B.

---

## Parte B · PC (`D:\METACHO CLAUDE\PREMIERE-CLAUDE\cantados`)

- [ ] **Preparación:** `python -m pytest -q` → 314 pasan. Sin commits en este repo (Decisión 14). Comprobar que no es entre 1:50 p. m. y el fin de la franja (Decisión 15). Los números de línea de esta parte son los de los archivos **antes de la Task 6** (2026-10-22): después de editar, ubica cada cambio por el texto citado.

### Task 5: Núcleo del remix: contrario, otro color, nuevo orden y usuario inventado

**Files:**
- Create: `herramientas/remix.py`
- Test: `tests/test_remix.py`

**Interfaces:**
- Consumes: nada nuevo.
- Produces (en `herramientas/remix.py`): `contrario(estilo: str|None) -> "salsa"|"merengue"|None`; `otro_color(color: str|None, paleta: list[str], indice: int = 0) -> str`; `reordenar(graciosidad: list[int|None]) -> list[int]` (índices del orden publicado en el orden nuevo); `usuario_inventado(k: int, usados=()) -> str`; constantes `PASO = 0.5`, `UMBRAL = 0.75`, `UMBRAL_CON_USUARIO = 0.55`, `TOL_DURACION = 1.0`, `MAX_TIKTOK = 300`, `ESTILOS = ("salsa", "merengue")`, `USUARIOS` (16 nombres).

- [ ] **Paso 1: prueba que falla.** Crea `tests/test_remix.py`:

```python
"""Remix de un cantado publicado: piezas sin red ni GPU (spec web 2026-10-22-admin-fase2-design §2.4–8, §5, §7)."""
import random
from pathlib import Path

import pytest

from herramientas import remix

F = Path(__file__).parent / "fixtures" / "pantallazos"


# ---------- Task 5: estilo, color, orden y usuario ----------
def test_contrario_salsa_y_merengue():
    assert remix.contrario("Salsa") == "merengue"
    assert remix.contrario("merengue") == "salsa"
    assert remix.contrario("Salsa, merengue") == "merengue"
    assert remix.contrario("merengue y salsa") == "salsa"
    assert remix.contrario("") is None and remix.contrario(None) is None and remix.contrario("cumbia") is None


def test_otro_color_nunca_es_el_mismo():
    pal = ["#fde68a", "#d8b4fe", "#8fd3ff"]
    assert remix.otro_color("#fde68a", pal) == "#d8b4fe"
    assert remix.otro_color("#8FD3FF", pal) == "#fde68a"
    assert remix.otro_color("#123456", pal) == "#fde68a"
    assert remix.otro_color(None, pal, indice=4) == "#d8b4fe"


@pytest.mark.parametrize("n", range(1, 21))
def test_reordenar_nadie_en_su_puesto_y_el_primero_entre_los_mas_graciosos(n):
    azar = random.Random(n)
    for _ in range(40):
        g = [azar.choice([None, None, *range(0, 5000, 7)]) for _ in range(n)]
        orden = remix.reordenar(g)
        assert sorted(orden) == list(range(n))
        if n == 1:
            assert orden == [0]
            continue
        assert all(orden[k] != k for k in range(n)), (g, orden)
        top3 = sorted(range(n), key=lambda i: (-(g[i] if g[i] is not None else -1), i))[:3]
        assert orden[0] in top3


def test_reordenar_casos_conocidos():
    assert remix.reordenar([900, 50, 3000, 10]) == [2, 0, 3, 1]
    assert remix.reordenar([3000, 50, 900, 10]) == [2, 0, 3, 1]     # el más gracioso ya iba primero: va el segundo
    assert remix.reordenar([None, None, None]) == [1, 2, 0]           # sin likes manda el puesto
    assert remix.reordenar([5, 9]) == [1, 0]


def test_usuario_inventado_neutro_y_sin_chocar():
    assert remix.usuario_inventado(0) == remix.USUARIOS[0]
    assert remix.usuario_inventado(1, usados={remix.USUARIOS[1]}) == remix.USUARIOS[1] + "2"
    assert remix.usuario_inventado(len(remix.USUARIOS)) == remix.USUARIOS[0]
```

- [ ] **Paso 2:** `python -m pytest tests/test_remix.py -q` → FALLA con `ImportError: cannot import name 'remix' from 'herramientas'`.
- [ ] **Paso 3: implementación.** Crea `herramientas/remix.py`:

```python
"""Remix de un cantado ya publicado (spec web docs/superpowers/specs/2026-10-22-admin-fase2-design.md §2.4–8, §5, §7).

Mismos comentarios reales del video publicado, otro orden, estilo (salsa ↔ merengue) y color de karaoke contrarios y
gancho nuevo; sin revisión de Oscar. Los comentarios salen del proyecto.json viejo si el video lo hizo este sistema;
si no, de las tarjetas del video (cuadros cada 0,5 s + RapidOCR, el método de la prueba de §7) emparejadas con TikTok
(o con los pantallazos de Oscar si TikTok pidió sesión). Lo que no se empareja se dibuja con el texto leído, un usuario
inventado, sin likes y con avatar genérico; Claude lo corrobora con whisper y con el cuadro antes de cantarlo. Nunca se
inventa texto."""
import difflib
import json
import re
import shutil
import subprocess
import unicodedata
import urllib.request
from pathlib import Path

from . import proyecto

PASO = 0.5               # s entre cuadros (prueba §7)
UMBRAL = 0.75            # parecido de texto para emparejar una tarjeta con un comentario (prueba §7)
UMBRAL_CON_USUARIO = 0.55   # basta este parecido si además el usuario coincide
TOL_DURACION = 1.0       # s: el publicado dura lo mismo que el corte renderizado de su proyecto
MAX_TIKTOK = 300         # comentarios que se intentan leer de TikTok para emparejar
ESTILOS = ("salsa", "merengue")
USUARIOS = ("luna_rodriguez22", "el_parcero_77", "caro.mendez", "juanes_10", "la_mona_feliz", "pipe.gomez",
            "sofi_vargas", "andres_m_93", "la_negra_bella", "camilo.rios", "valen_ortiz", "dani_castro_88",
            "mafe.lopez", "santi_herrera", "nata.ruiz", "tato_mejia")


# ---------- estilo, color, orden y usuario ----------
def contrario(estilo):
    """salsa ↔ merengue. Con los dos («Salsa, merengue») manda el primero. Sin estilo conocido: None."""
    e = (estilo or "").lower()
    s, m = e.find("salsa"), e.find("merengue")
    if s >= 0 and (m < 0 or s < m):
        return "merengue"
    if m >= 0:
        return "salsa"
    return None


def otro_color(color, paleta, indice=0):
    """El color que sigue al del publicado en la paleta (nunca el mismo). Color desconocido: el de la paleta por índice."""
    bajas = [c.lower() for c in paleta]
    if not color:
        return paleta[indice % len(paleta)]
    if color.lower() in bajas:
        return paleta[(bajas.index(color.lower()) + 1) % len(paleta)]
    return paleta[0]


def reordenar(graciosidad):
    """Nuevo orden (índices del orden publicado). El primero sale de los 3 más graciosos (más likes; sin likes cuenta el
    puesto: el de arriba es más gracioso) sin ser el primero de antes; los demás, de más a menos graciosos, y ninguno
    queda en su puesto original (se cambia con el vecino)."""
    n = len(graciosidad)
    if n < 2:
        return list(range(n))
    puntos = [g if isinstance(g, int) else -1 for g in graciosidad]
    rango = sorted(range(n), key=lambda i: (-puntos[i], i))
    primero = next(i for i in rango[:3] if i != 0)
    orden = [primero] + [i for i in rango if i != primero]
    for k in range(1, n):
        if orden[k] == k:
            j = k + 1 if k + 1 < n else k - 1
            orden[k], orden[j] = orden[j], orden[k]
    return orden


def usuario_inventado(k, usados=()):
    """Usuario neutro para una tarjeta sin pareja en TikTok (Oscar 2026-10-22: «no pasa nada»)."""
    nombre = USUARIOS[k % len(USUARIOS)]
    return nombre if nombre not in set(usados) else f"{nombre}{k + 1}"
```

- [ ] **Paso 4:** `python -m pytest tests/test_remix.py -q` → 24 pasan. `python -m pytest -q` → 338 pasan.
- [ ] **Paso 5: sin commit** (Decisión 14). Anotar en el informe de la tarea: «herramientas/remix.py y tests/test_remix.py nuevos; 338 pasan».

### Task 6: Remix de un video hecho por este sistema, de punta a punta (registro, proyecto previo, aprobado y Suno)

**Files:**
- Modify: `herramientas/web.py` (`bajar`, línea 68), `herramientas/pasada.py` (`nuevos_pedidos` líneas 632-645 y función nueva `_nuevo_remix` antes de ella; `LARGO_S` línea 812; `leer_web` líneas 842-844 y 881-884), `herramientas/remix.py` (al final), `docs/runbook-pasada.md` (§1, después de la línea 21)
- Create: `tests/test_web_remix.py`

**Interfaces:**
- Consumes: Task 5 (`contrario`, `otro_color`, `reordenar`, `ESTILOS`, `TOL_DURACION`); `pasada._mismo_link(a, b)`, `pasada._duracion(f)`, `sondear.video_id_de(url)`, `sondear.slug_de(titulo, id)`, `sondear.transformacion_de(indice)`, `pantallazos._hay_texto_quemado(video)`, `proyecto.cargar/guardar`; web: `GET pc/pedidos` con `publicado` (Task 2).
- Produces: `web.bajar(pedido, destino)` también baja `publicado` → `rutas["publicado"]`; `pasada.TIPOS_WEB = ("pantallazos", "link", "remix")`; pedido local `web:<id>` con `modo: "remix"`, `tipo: "remix"`, `link`, `publicado` (ruta local); `pasada._nuevo_remix(P, url, d, fecha, informe)`; en `remix.py`: `video_id(link, abrir=None) -> str|None`, `buscar_previo(raiz, link, dur_publicado, vid=None, enlaces=None, duracion=None) -> {"carpeta": Path, "n": int}|None`, `comentarios_de_previo(vieja, nueva, n) -> (list[dict], dict)`, `armar_proyecto(carpeta, url, comentarios, datos, indice, paleta, previo=None) -> dict` (proyecto con `origen: "remix"`, `remix: {orden_publicado, dibujadas}`, comentarios con `origen_remix`). Campos del pedido local tras el camino proyecto.json: `estado: "aprobado"`, `carpeta`, `revisado: True`, `remix_de`, `tarjetas`, `dibujadas: 0`.

- [ ] **Paso 1: pruebas que fallan.** Crea `tests/test_web_remix.py`:

```python
"""Remix pedido desde elmetacho.com/admin: la pasada (spec web docs/superpowers/specs/2026-10-22-admin-fase2-design.md
§3, §5, §6, §7). Sin red: la web, TikTok, whisper y ffmpeg van falsos."""
from pathlib import Path

import pytest

from herramientas import pasada, proyecto, remix, web
from tests.test_pasada import entorno  # noqa: F401  (fixture)
from tests.test_proyecto import base

LINK = "https://vt.tiktok.com/ZSremix/"
LARGO = "https://www.tiktok.com/@perrito/video/7400000000000000001"
PALETA = ["#fde68a", "#d8b4fe", "#8fd3ff"]
DUR = {"original.mp4": 40.0, "publicado.mp4": 61.2, "salida.mp4": 61.0, "salida-YT.mp4": 38.0}


def _arch(n, **extra):
    return {"pathname": f"cantados/c_r/{n}", "tamano": 5, "url": f"https://firmado/{n}", **extra}


def _pedido(tipo="remix", **extra):
    p = {"id": "c_r", "estado": "listo", "tipo": tipo, "link": LINK, "creado": "2026-10-22T18:30:00Z",
         "titulo": "lo grabaron paseando al perro", "estilo": "Salsa, merengue", "tramos": [[0, 4]],
         "original": _arch("original.mp4", duracion=40), "gancho": _arch("gancho.mov"), "pantallazos": [],
         "publicado": _arch("publicado.mp4", duracion=61)}
    if tipo != "remix":
        p.pop("publicado")
    return {**p, **extra}


@pytest.fixture
def web_remix(entorno, monkeypatch, tmp_path):
    estado = {"pedidos": [_pedido()], "bajados": [], "necesita": [], "fallidos": [], "entregados": []}
    monkeypatch.setattr(web, "pedidos", lambda: estado["pedidos"])

    def bajar(p, destino, descargar=None):
        destino = Path(destino)
        destino.mkdir(parents=True, exist_ok=True)
        rutas = {"pantallazos": []}
        for clave in ("original", "gancho", "publicado"):
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
    monkeypatch.setattr(web, "necesita_pantallazos", lambda i, m: estado["necesita"].append((i, m)))
    monkeypatch.setattr(web, "fallido", lambda i, m: estado["fallidos"].append((i, m)))
    monkeypatch.setattr(web, "entregado", lambda i: estado["entregados"].append(i))
    monkeypatch.setattr(web, "aprobados", lambda: [])
    monkeypatch.setattr(pasada, "_duracion", lambda f: DUR.get(Path(f).name, 40.0))
    monkeypatch.setattr(pasada.config, "cargar", lambda: {
        "proyectos_dir": str(entorno["raiz"]), "listos_dir": str(tmp_path / "LISTOS"), "paleta": PALETA,
        "bandeja_suno": str(tmp_path / "BANDEJA"), "descargas": str(tmp_path / "DESCARGAS"), "chrome_cdp": "http://localhost:9"})
    monkeypatch.setattr(remix, "video_id", lambda link, abrir=None: None)          # sin red
    monkeypatch.setattr("herramientas.pantallazos._hay_texto_quemado", lambda v: True)
    return estado


def _viejo(entorno, nombre="2026-10-20-perro", url=LARGO, likes=(500, 4000, 90, 1200)):
    """Proyecto de este sistema ya renderizado (los dos cortes) del que sale el publicado."""
    d = entorno["raiz"] / nombre
    (d / "avatares").mkdir(parents=True)
    p = base()
    p.update(url=url, estado="renderizado", estilo_suno="Salsa", karaoke={"color": "#fde68a"}, corto_yt={"n": 2, "qa": True})
    p["comentarios"] = [{"id": f"v{i}", "usuario": f"user{i}", "avatar": f"avatares/{i:02d}.jpg", "fecha": "2025-1-1",
                         "likes": lk, "texto_tarjeta": f"texto {i}", "linea_letra": f"linea {i},", "gif": None, "incluido": True}
                        for i, lk in enumerate(likes)]
    p["comentarios"].append({"id": "vx", "usuario": "fuera", "avatar": None, "fecha": "", "likes": 1, "texto_tarjeta": "no",
                             "linea_letra": "no,", "gif": None, "incluido": False})
    for i in range(len(likes)):
        (d / "avatares" / f"{i:02d}.jpg").write_bytes(b"jpg")
    (d / "salida.mp4").write_bytes(b"fb")
    (d / "salida-YT.mp4").write_bytes(b"yt")
    proyecto.guardar(d, p)
    return d


def _correr(fecha="2026-10-22"):
    inf = []
    pasada.leer_web(pasada._P(), inf)
    pasada.nuevos_pedidos(pasada._P(), inf, fecha=fecha)
    return inf


# ---------- Task 6: registro del remix y regresión de los otros tipos ----------
def test_leer_web_registra_el_remix_con_el_publicado(entorno, web_remix):
    inf = []
    pasada.leer_web(pasada._P(), inf)
    d = pasada._P().get("web:c_r")
    assert d["estado"] == "recibido" and d["modo"] == "remix" and d["tipo"] == "remix" and d["link"] == LINK
    assert Path(d["publicado"]).name == "publicado.mp4" and Path(d["original"]).name == "original.mp4"
    assert web_remix["bajados"] == ["c_r"] and any("(remix)" in x for x in inf)


def test_remix_sin_publicado_o_tipo_desconocido_se_queda_en_la_web(entorno, web_remix):
    web_remix["pedidos"] = [_pedido(publicado=None), _pedido(tipo="otro", id="c_o")]
    inf = []
    pasada.leer_web(pasada._P(), inf)
    assert not pasada._P().d and web_remix["bajados"] == [] and len([x for x in inf if "todavía no" in x]) == 2


def test_la_franja_sigue_con_pantallazos_link_y_remix_juntos(entorno, web_remix):
    web_remix["pedidos"] = [
        _pedido(tipo="pantallazos", id="c_p", link=None, pantallazos=[_arch("p01.jpg")]),
        _pedido(tipo="link", id="c_l", link="https://vt.tiktok.com/ZSotro/"),
        _pedido()]
    pasada.leer_web(pasada._P(), [])
    P = pasada._P()
    assert [(u, P.get(u)["modo"]) for u in ("web:c_p", "web:c_l", "web:c_r")] == [
        ("web:c_p", "pantallazos"), ("web:c_l", "link"), ("web:c_r", "remix")]
    assert len(P.get("web:c_p")["fotos"]) == 1 and "publicado" not in P.get("web:c_l")
    assert web_remix["bajados"] == ["c_p", "c_l", "c_r"]


def test_telegram_con_el_link_de_un_remix_vivo_es_repetido(entorno, web_remix):
    pasada.leer_web(pasada._P(), [])
    assert pasada._repetido_de_web(pasada._P(), LINK, None, None) == "web:c_r"


# ---------- Task 6: remix de un video hecho por este sistema (proyecto.json) ----------
def test_remix_de_un_video_del_sistema_sale_aprobado_y_reordenado(entorno, web_remix):
    viejo = _viejo(entorno, url=LINK)
    inf = _correr()
    d = pasada._P().get("web:c_r")
    assert d["estado"] == "aprobado" and d["remix_de"] == viejo.name and d["dibujadas"] == 0 and d["tarjetas"] == 4
    c = entorno["raiz"] / d["carpeta"]
    p = proyecto.cargar(c)
    assert d["carpeta"] == "2026-10-22-remix-lo-grabaron-paseando-al-perro"
    assert [x["id"] for x in p["comentarios"]] == ["v1", "v3", "v0", "v2"]           # reordenar([500, 4000, 90, 1200])
    assert [x["texto_tarjeta"] for x in p["comentarios"]] == ["texto 1", "texto 3", "texto 0", "texto 2"]
    assert p["estilo_suno"] == "merengue" and p["karaoke"]["color"] == "#d8b4fe" and p["estado"] == "listo_suno"
    assert p["origen"] == "remix" and p["titulo"] == "lo grabaron paseando al perro" and p["bucle"]["fin"] == 4
    assert (c / "avatares" / "01.jpg").exists() and (c / "original.mp4").exists()
    assert any("sale hoy sin revisión" in x for x in inf)


def test_remix_aprobado_entra_a_suno_el_mismo_dia(entorno, web_remix):
    _viejo(entorno, url=LINK)
    _correr()
    pasada._P().poner("web:c_r", gancho=True)
    [s] = pasada.pendientes_suno()
    assert s["t"] == "2026-10-22-remix-lo-grabaron-paseando-al-perro" and s["e"] == "merengue"
    assert s["l"].splitlines()[3] == "linea 1,"


def test_remix_del_corte_de_youtube_usa_solo_sus_comentarios(entorno, web_remix, monkeypatch):
    """Review Focus 2: Oscar sube el corte corto (YouTube): solo los n del corto, no los 4 del largo."""
    dur_yt = {**DUR, "publicado.mp4": 38.3}
    monkeypatch.setattr(pasada, "_duracion", lambda f: dur_yt.get(Path(f).name, 40.0))
    _viejo(entorno, url=LINK)
    _correr()
    p = proyecto.cargar(entorno["raiz"] / pasada._P().get("web:c_r")["carpeta"])
    assert [x["id"] for x in p["comentarios"]] == ["v1", "v0"]


def test_previo_con_otro_link_corto_se_halla_por_id_y_duracion(entorno, web_remix, monkeypatch):
    """Review Focus 1: el link corto de cada «compartir» cambia; el proyecto se halla por el id del video y la duración,
    y uno del mismo video con otra duración (otro corte o una edición distinta) no se usa."""
    _viejo(entorno, nombre="2026-10-19-perro", url=LARGO)
    otro = _viejo(entorno, nombre="2026-10-21-perro", url=LARGO)
    (otro / "salida.mp4").write_bytes(b"otra")
    monkeypatch.setattr(remix, "video_id", lambda link, abrir=None: "7400000000000000001")
    dur = {**DUR}
    monkeypatch.setattr(pasada, "_duracion", lambda f: 75.0 if Path(f).parent.name == otro.name else dur.get(Path(f).name, 40.0))
    _correr()
    assert pasada._P().get("web:c_r")["remix_de"] == "2026-10-19-perro"


def test_video_id_del_link_largo_o_por_redireccion():
    assert remix.video_id(LARGO) == "7400000000000000001"
    assert remix.video_id(LINK, abrir=lambda u: LARGO + "?is_from_webapp=1") == "7400000000000000001"
    assert remix.video_id(LINK, abrir=lambda u: (_ for _ in ()).throw(OSError("sin red"))) is None


def test_remix_de_un_video_que_no_es_del_sistema_espera_la_lectura_de_tarjetas(entorno, web_remix):
    inf = _correr()
    assert pasada._P().get("web:c_r")["estado"] == "recibido" and any("espera la lectura de tarjetas" in x for x in inf)
```

- [ ] **Paso 2:** `python -m pytest tests/test_web_remix.py -q` → 10 en rojo: 9 `ERROR` al preparar el fixture `web_remix` (`AttributeError: <module 'herramientas.remix' …> has no attribute 'video_id'`) y 1 `FAILED` (`test_video_id_del_link_largo_o_por_redireccion`, el mismo `AttributeError`).
- [ ] **Paso 3: `web.bajar` baja también el publicado.** En `herramientas/web.py`, reemplaza la línea 68 (el `for clave, arch in [...] + \`) por:

```python
        for clave, arch in [("original", pedido.get("original")), ("gancho", pedido.get("gancho")),
                            ("publicado", pedido.get("publicado"))] + \
```

(la línea siguiente, `[("pantallazos", a) for a in pedido.get("pantallazos") or []]:`, queda igual).

- [ ] **Paso 4: `leer_web` registra el remix.** En `herramientas/pasada.py`, debajo de `LARGO_S = 7.0 …` (línea 812) agrega:

```python
TIPOS_WEB = ("pantallazos", "link", "remix")
```

Reemplaza las líneas 842-844 (`if tipo not in ("pantallazos", "link") …` y sus dos líneas) por:

```python
            sin_publicado = tipo == "remix" and ped.get("estado") != "necesita_pantallazos" and not ped.get("publicado")
            if tipo not in TIPOS_WEB or (tipo in ("link", "remix") and not ped.get("link")) or sin_publicado:
                informe.append(f"Pedido web {id_} de tipo «{tipo}»: el PC todavía no lo sabe hacer; queda en la web")
                continue
```

Reemplaza las líneas 881-884 (`if tipo == "link": …` hasta el `informe.append(f"Pedido de la web…")`) por:

```python
                if tipo == "link":       # Claude escoge los comentarios de TikTok; Oscar los revisa en la web
                    datos.update(modo="link", link=ped["link"])
                elif tipo == "remix":    # mismos comentarios del publicado, otro orden y otra canción; sin revisión de Oscar
                    datos.update(modo="remix", link=ped["link"], publicado=str(rutas["publicado"]))
                P.nuevo(url, datos, msg=None)
                que = {"link": " por link", "remix": " (remix)"}.get(tipo, "")
                informe.append(f"Pedido de la web{que}: {ped.get('titulo') or id_}")
```

- [ ] **Paso 5: proyecto previo en `remix.py`.** Agrega al final de `herramientas/remix.py`:

```python
# ---------- proyecto previo (video hecho por este sistema) ----------
def _duracion(f):
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                           capture_output=True, text=True)
        return float(r.stdout.strip())
    except Exception:
        return None


def video_id(link, abrir=None):
    """Id del video de TikTok: del link largo o siguiendo la redirección del link corto (vm./vt.). None si no se pudo."""
    from .sondear import video_id_de
    vid = video_id_de(link or "")
    if vid:
        return vid
    abrir = abrir or (lambda u: urllib.request.urlopen(
        urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=20).geturl())
    try:
        return video_id_de(abrir(link) or "")
    except Exception:
        return None


def buscar_previo(raiz, link, dur_publicado, vid=None, enlaces=None, duracion=None):
    """El proyecto de este sistema que hizo el video publicado: mismo link (o mismo id de video) y un corte renderizado
    que dura lo mismo (±1 s). Devuelve {"carpeta": Path, "n": comentarios de ese corte} o None. Si hay varios, el más
    reciente (las carpetas empiezan por la fecha)."""
    from .pasada import _mismo_link
    from .sondear import video_id_de
    if dur_publicado is None or not Path(raiz).is_dir():
        return None
    duracion = duracion or _duracion
    enlaces = enlaces or {}
    for c in sorted(Path(raiz).iterdir(), reverse=True):
        f = c / "proyecto.json"
        if not f.exists():
            continue
        try:
            p = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if p.get("estado") != "renderizado":
            continue
        urls = [u for u in (p.get("url"), enlaces.get(c.name)) if u]
        if not any(_mismo_link(u, link) or (vid and video_id_de(u) == vid) for u in urls):
            continue
        inc = [x for x in p.get("comentarios") or [] if x.get("incluido")]
        for archivo, n in (("salida.mp4", len(inc)), ("salida-YT.mp4", (p.get("corto_yt") or {}).get("n"))):
            if n and (c / archivo).exists():
                d = duracion(c / archivo)
                if d is not None and abs(d - dur_publicado) <= TOL_DURACION:
                    return {"carpeta": c, "n": n}
    return None


def comentarios_de_previo(vieja, nueva, n):
    """Los n comentarios cantados del proyecto viejo, en el orden del publicado, con sus avatares e imágenes copiados.
    Devuelve (comentarios, proyecto viejo)."""
    vieja, nueva = Path(vieja), Path(nueva)
    p = proyecto.cargar(vieja)
    out = []
    for c in [c for c in p["comentarios"] if c.get("incluido")][:n]:
        for rel in (c.get("avatar"), c.get("gif"), c.get("gif_original")):
            if rel and (vieja / rel).exists():
                (nueva / rel).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(vieja / rel, nueva / rel)
        out.append({**c, "incluido": True, "origen_remix": "proyecto"})
    return out, p


def armar_proyecto(carpeta, url, comentarios, datos, indice, paleta, previo=None):
    """proyecto.json del remix: comentarios (en el orden del publicado) reordenados con `reordenar`, estilo y color
    contrarios a los del proyecto previo (sin previo: estilo y color por índice, como un pedido nuevo)."""
    from .pantallazos import _hay_texto_quemado
    from .sondear import transformacion_de
    carpeta = Path(carpeta)
    previo = previo or {}
    orden = reordenar([c.get("likes") for c in comentarios])
    trans = transformacion_de(indice)
    if trans["espejo"] and _hay_texto_quemado(carpeta / "original.mp4"):
        trans["espejo"] = False
    tramos = [tuple(t) for t in datos.get("tramos") or [(0.0, 7.0)]]
    p = {"slug": carpeta.name.split("-", 3)[-1], "url": url, "estado": "capturado", "titulo": datos.get("titulo") or "",
         "bucle": {"inicio": tramos[0][0], "fin": tramos[-1][1], **({"tramos": [list(t) for t in tramos]} if len(tramos) > 1 else {})},
         "bucle_confirmado": True, "gancho": None,
         "estilo_suno": contrario(previo.get("estilo_suno")) or ESTILOS[indice % 2],
         "karaoke": {"color": otro_color((previo.get("karaoke") or {}).get("color"), paleta, indice)},
         "transformacion": trans, "pedido_telegram": True, "origen": "remix",
         "remix": {"orden_publicado": [str(c["id"]) for c in comentarios],
                   "dibujadas": sum(1 for c in comentarios if c.get("origen_remix") == "dibujada")},
         "comentarios": [comentarios[i] for i in orden]}
    if datos.get("bucle_largo"):
        p["bucle_largo"] = True
    if datos.get("bucle_sin_tope"):
        p["bucle_sin_tope"] = True
    proyecto.guardar(carpeta, p)
    return p
```

- [ ] **Paso 6: `_nuevo_remix` y su lugar en `nuevos_pedidos`.** En `herramientas/pasada.py`, justo antes de `def nuevos_pedidos(` (línea 632) agrega:

```python
def _nuevo_remix(P, url, d, fecha, informe):
    """Remix (spec fase 2 §3 y §5): comentarios del video publicado, otro orden, estilo y color contrarios, gancho nuevo
    y sin revisión de Oscar. Si el video lo hizo este sistema salen de su proyecto.json y queda aprobado enseguida
    (Suno el mismo día); si no, de las tarjetas del publicado."""
    from . import remix, sondear
    cfg = config.cargar()
    carpeta = Path(cfg["proyectos_dir"]) / f"{fecha}-remix-{sondear.slug_de(d.get('titulo') or '', d['clave'])}"
    if any(v.get("carpeta") == carpeta.name for u, v in P.d.items() if u != url):
        carpeta = carpeta.with_name(carpeta.name + f"-{d['clave']}")
    carpeta.mkdir(parents=True, exist_ok=True)
    shutil.copy(d["original"], carpeta / "original.mp4")
    tramos = sorted(tuple(t) for t in d.get("tramos") or [(0.0, 7.0)])
    dur = _duracion(carpeta / "original.mp4")
    if dur and tramos[-1][1] > dur + 0.05:
        P.poner(url, estado="fallido", motivo=f"el bucle llega a {tramos[-1][1]:g} s y el video dura {dur:.1f} s")
        return
    datos = {**d, "tramos": tramos}
    paleta = cfg.get("paleta") or ["#fde68a", "#d8b4fe"]
    enlaces = {v["carpeta"]: (v.get("link") or u) for u, v in P.d.items() if v.get("carpeta") and u != url}
    previo = remix.buscar_previo(cfg["proyectos_dir"], d["link"], _duracion(d["publicado"]), vid=remix.video_id(d["link"]),
                                 enlaces=enlaces, duracion=_duracion)
    if not previo:            # Task 10 lo cambia por la lectura de tarjetas; mientras tanto espera (no falla)
        informe.append(f"Remix {url}: el publicado no es de este sistema; espera la lectura de tarjetas")
        return
    comentarios, viejo = remix.comentarios_de_previo(previo["carpeta"], carpeta, previo["n"])
    p = remix.armar_proyecto(carpeta, url, comentarios, datos, indice=len(P.d), paleta=paleta, previo=viejo)
    p["estado"] = "listo_suno"
    proyecto.guardar(carpeta, p)
    P.poner(url, estado="aprobado", carpeta=carpeta.name, revisado=True, aprobado_en=_ahora(), automatico=False,
            hoja_ok=False, intentos_render=0, remix_de=previo["carpeta"].name, tarjetas=len(comentarios), dibujadas=0)
    informe.append(f"Remix de {previo['carpeta'].name}: {carpeta.name} ({len(comentarios)} comentarios de su proyecto, "
                   f"estilo {p['estilo_suno']}); sale hoy sin revisión")
```

En `nuevos_pedidos`, reemplaza el bloque de las líneas 637-645 (`if d.get("modo") == "pantallazos": … continue`) por:

```python
        if d.get("modo") in ("pantallazos", "remix"):
            hacer, que = (_nuevo_por_pantallazos, "los pantallazos") if d["modo"] == "pantallazos" else (_nuevo_remix, "el remix")
            try:
                hacer(P, url, d, fecha, informe)
            except Exception as e:
                P.poner(url, intentos=(d.get("intentos") or 0) + 1, motivo=str(e)[:200])
                if (P.get(url).get("intentos") or 0) >= REINTENTOS_SONDEO:
                    P.poner(url, estado="fallido")
                informe.append(f"Error con {que} de {url}: {e}")
            continue
```

(El mensaje de los pantallazos queda igual: «Error con los pantallazos de <url>: …».) El gancho nuevo lo asigna `ganchos_web` sin cambios (pedido `origen: web` con carpeta y sin gancho), y `pendientes-suno` lo toma ese mismo día por estar `aprobado`.

- [ ] **Paso 7: runbook.** En `docs/runbook-pasada.md`, después del párrafo **«Pedidos web por link (fase 2).»** (línea 21) agrega:

```markdown
**Remix (fase 2).** Clave `web:<id>`, `tipo: remix`, `modo: remix`, `link` (del TikTok original) y `publicado` (el video ya publicado, en `logs/web/<id>/`). Sin revisión de Oscar: sale el mismo día. En `leer`, si el publicado lo hizo este sistema (mismo link o mismo id de video y un corte `salida.mp4`/`salida-YT.mp4` que dura lo mismo ±1 s), se arma `PROYECTOS\<fecha>-remix-<slug>` con los comentarios de ese proyecto reordenados, estilo contrario (salsa ↔ merengue) y otro color, y queda `aprobado` (el informe dice «Remix de <carpeta vieja>: … sale hoy sin revisión»): pasa directo a §3 cuando llegue su gancho nuevo (`ganchos_web`). Si no es de este sistema, ver §2 «Remix por tarjetas».
```

- [ ] **Paso 8:** `python -m pytest tests/test_web_remix.py -q` → 10 pasan. `python -m pytest -q` → 348 pasan (incluye `test_web.py`, `test_web_link.py`, `test_pasada.py` y `test_pantallazos*.py` sin cambios: Telegram, pantallazos y por link siguen igual).
- [ ] **Paso 9: sin commit** (Decisión 14). Informe: archivos tocados y «348 pasan».

### Task 7: Tarjetas del video publicado (cuadros cada 0,5 s + OCR)

**Files:**
- Modify: `herramientas/remix.py` (constantes `_PIE`, `_RUIDO`, `_COLA` debajo de `USUARIOS`; funciones al final)
- Test: `tests/test_remix.py` (al final)

**Interfaces:**
- Consumes: `texto._ocr()` (RapidOCR compartido), OpenCV, ffmpeg.
- Produces: `cuadros(video, destino, paso=PASO) -> list[(t: float, archivo: Path)]`; `caja_tarjeta(img) -> (x, y, w, h)|None`; `tarjeta_de_cuadro(img, res, t, archivo=None, margen=8) -> {t, usuario, texto, conf, archivo}|None`; `similitud(a, b) -> float`; `agrupar(candidatas, hueco=1.6, umbral=0.6) -> list[list]`; `tarjetas_de(candidatas) -> list[{t0, t1, n, usuario, texto, conf, archivo}]`; `leer_tarjetas(lista_cuadros, ocr=None) -> list[tarjeta]` (mismo formato que `tarjetas_de`).

- [ ] **Paso 1: pruebas que fallan** (al final de `tests/test_remix.py`):

```python
# ---------- Task 7: tarjetas del video publicado ----------
def _lienzo(con_tarjeta=True):
    import numpy as np
    img = np.full((1920, 1080, 3), 30, np.uint8)
    if con_tarjeta:
        img[1000:1300, 60:1020] = 255
    return img


def _ocr_falso(*lineas):
    """Renglones de RapidOCR [(caja, texto, confianza)] con el centro en (x, y)."""
    return [([[x - 50, y - 15], [x + 50, y - 15], [x + 50, y + 15], [x - 50, y + 15]], t, c) for x, y, t, c in lineas]


def test_tarjeta_de_cuadro_con_ocr_falso():
    res = _ocr_falso((200, 1040, "ana_perez", 0.99), (400, 1100, "el perro paseando al dueño", 0.95),
                     (200, 1250, "2025-11-16", 0.99), (420, 1250, "Responder", 0.99), (900, 1250, "1.2M", 0.98),
                     (500, 300, "TITULO DEL VIDEO", 0.99))
    t = remix.tarjeta_de_cuadro(_lienzo(), res, 3.5, "f_0008.jpg")
    assert t["usuario"] == "ana_perez" and t["texto"] == "el perro paseando al dueño"
    assert t["t"] == 3.5 and t["archivo"] == "f_0008.jpg"
    assert remix.tarjeta_de_cuadro(_lienzo(), res[:2], 3.5) is None          # sin pie no es tarjeta
    assert remix.tarjeta_de_cuadro(_lienzo(con_tarjeta=False), res, 3.5) is None


def test_tarjeta_real_del_render_con_ocr_de_verdad():
    import cv2
    tarjeta = cv2.imread(str(F / "tarjeta-pan.png"))
    img = _lienzo(con_tarjeta=False)
    img[900:1320, 0:1080] = tarjeta
    from herramientas.texto import _ocr
    t = remix.tarjeta_de_cuadro(img, _ocr()(img)[0], 0.0)
    assert t["usuario"] == "Kris"
    assert "masa madre" in t["texto"] and "Tira esa madre" in t["texto"]
    assert "Responder" not in t["texto"] and "1.2M" not in t["texto"] and "2025" not in t["texto"]


def _c(t, usuario, texto, conf=0.95):
    return {"t": t, "usuario": usuario, "texto": texto, "conf": conf, "archivo": f"f_{int(t * 2) + 1:04d}.jpg"}


def test_tarjetas_de_junta_la_animacion_y_quita_fragmentos():
    cands = [_c(0.0, "ana", "el perro"), _c(0.5, "ana", "el perro paseando al dueño"), _c(1.0, "ana", "el perro paseando al dueño"),
             _c(1.5, "ana", "el perro paseando al dueño", 0.8), _c(1.9, "", "un paseo"),
             _c(2.0, "luis", "que lindo un paseo por bluetooth"), _c(2.5, "luis", "que lindo un paseo por bluetooth")]
    ts = remix.tarjetas_de(cands)
    assert [(x["usuario"], x["texto"], x["t0"], x["t1"]) for x in ts] == [
        ("ana", "el perro paseando al dueño", 0.0, 1.5), ("luis", "que lindo un paseo por bluetooth", 2.0, 2.5)]
    assert ts[0]["archivo"] == "f_0002.jpg"          # el cuadro con más texto y más confianza


def test_leer_tarjetas_lee_cada_cuadro(tmp_path):
    import cv2
    lista = []
    for k in range(3):
        f = tmp_path / f"f_{k + 1:04d}.jpg"
        cv2.imwrite(str(f), _lienzo())
        lista.append((k * 0.5, f))
    res = _ocr_falso((200, 1040, "ana", 0.99), (400, 1100, "el perro paseando al dueño", 0.95), (420, 1250, "Responder", 0.99))
    ts = remix.leer_tarjetas(lista, ocr=lambda img: res)
    assert len(ts) == 1 and ts[0]["n"] == 3 and ts[0]["t1"] == 1.0


def test_cuadros_llama_a_ffmpeg_cada_medio_segundo(tmp_path, monkeypatch):
    vistos = []

    def run(cmd, check=False, **k):
        vistos.append(cmd)
        for n in (1, 2, 3):
            (tmp_path / "c" / f"f_{n:04d}.jpg").write_bytes(b"x")
    monkeypatch.setattr(remix.subprocess, "run", run)
    out = remix.cuadros(tmp_path / "publicado.mp4", tmp_path / "c")
    assert "fps=2" in vistos[0] and [t for t, _ in out] == [0.0, 0.5, 1.0]
```

(`test_tarjeta_real_del_render_con_ocr_de_verdad` corre RapidOCR local sobre `tests/fixtures/pantallazos/tarjeta-pan.png` —una tarjeta real del render— pegada en un fondo oscuro de 1080×1920, como `test_pantallazos.py`; no sale a la red. Comprobado el 2026-10-22: lee usuario «Kris» y «Pan der masa madre Tira esa madre».)

- [ ] **Paso 2:** `python -m pytest tests/test_remix.py -q` → FALLAN 5 con `AttributeError: module 'herramientas.remix' has no attribute 'tarjeta_de_cuadro'` (y `tarjetas_de`, `leer_tarjetas`, `cuadros`).
- [ ] **Paso 3: implementación.** En `herramientas/remix.py`, debajo de `USUARIOS = (…)` agrega:

```python
_PIE = re.compile(r"respond|reply|^\d+\s*[dhsmw]$|\d{4}-\d+-\d+", re.IGNORECASE)
_RUIDO = re.compile(r"^(el\s*meta.{0,5}|ver\s*\d+\s*resp.*|\d+([.,]\d+)?\s*mil|\d{2,4}-\d.*|\d+\s*(sem|min|[dhsmw])"
                    r"|responder|reply|\d+([.,]\d+)?\s*[KkMm]?|.{0,2})$", re.IGNORECASE)
_COLA = re.compile(r"\s*(ver\s*\d+\s*resp\w*)?\s*(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}-\d{1,2}|\d+\s*sem)?\s*(Responder|Reply).*$",
                   re.IGNORECASE)
```

y al final del archivo:

```python
# ---------- tarjetas del video publicado (OCR) ----------
def cuadros(video, destino, paso=PASO):
    """Un cuadro cada `paso` s del video publicado → [(t, archivo)]."""
    destino = Path(destino)
    destino.mkdir(parents=True, exist_ok=True)
    for f in destino.glob("f_*.jpg"):
        f.unlink()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", f"fps={1 / paso:g}", "-q:v", "3",
                    str(destino / "f_%04d.jpg")], check=True)
    return [(round(k * paso, 3), f) for k, f in enumerate(sorted(destino.glob("f_*.jpg")))]


def caja_tarjeta(img):
    """La tarjeta blanca más grande del cuadro: (x, y, ancho, alto) o None."""
    import cv2
    import numpy as np
    H, W = img.shape[:2]
    m = (img.min(axis=2) > 232).astype(np.uint8) * 255
    k = max(9, W // 60)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
    contornos, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    mejor = None
    for c in contornos:
        x, y, w, h = cv2.boundingRect(c)
        if w > 0.4 * W and h > 0.045 * H and cv2.contourArea(c) > 0.4 * w * h and (mejor is None or w * h > mejor[2] * mejor[3]):
            mejor = (x, y, w, h)
    return mejor


def tarjeta_de_cuadro(img, res, t, archivo=None, margen=8):
    """La tarjeta de comentario de un cuadro → {t, usuario, texto, conf, archivo} o None. `res` es la salida de RapidOCR
    [(caja, texto, confianza)]. Sin pie («Responder», fecha) no es una tarjeta."""
    import numpy as np
    caja = caja_tarjeta(img)
    if not caja:
        return None
    x, y, w, h = caja
    lineas = []
    for b, txt, conf in res or []:
        b = np.array(b, dtype=float)
        cx, cy = b[:, 0].mean(), b[:, 1].mean()
        if x - margen <= cx <= x + w + margen and y - margen <= cy <= y + h + margen:
            lineas.append((cy, str(txt), float(conf)))
    lineas.sort()
    if not any(_PIE.search(l[1]) for l in lineas):
        return None
    lineas = [l for l in lineas if l[2] >= 0.5 and not _RUIDO.match(l[1].strip())]
    if not lineas:
        return None
    if len(lineas) >= 2 and len(lineas[0][1].strip()) <= 28:
        usuario, resto = lineas[0][1].strip(), lineas[1:]
    else:                      # usuario ilegible (solo avatar o emoji): todo es texto
        usuario, resto = "", lineas
    texto = _COLA.sub("", " ".join(l[1].strip() for l in resto)).strip()
    return {"t": t, "usuario": usuario, "texto": texto, "conf": float(np.mean([l[2] for l in lineas])),
            "archivo": str(archivo) if archivo else None}


def _norm(a):
    a = unicodedata.normalize("NFKD", (a or "").lower())
    a = "".join(c for c in a if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "", a)     # sin emojis, espacios ni puntuación (el OCR no lee emojis y junta palabras)


def similitud(a, b):
    return difflib.SequenceMatcher(None, _norm(a), _norm(b)).ratio()


def agrupar(candidatas, hueco=1.6, umbral=0.6):
    """Cuadros seguidos con la misma tarjeta (texto parecido, o mismo usuario mientras la tarjeta entra animada)."""
    grupos = []
    for c in candidatas:
        for g in reversed(grupos[-2:]):
            largo = max(g, key=lambda z: len(z["texto"]))["texto"]
            if c["t"] - g[-1]["t"] <= hueco and (similitud(c["texto"], g[-1]["texto"]) >= umbral or (
                    similitud(c["usuario"], g[-1]["usuario"]) >= 0.8 and similitud(c["texto"], largo) >= 0.45)):
                g.append(c)
                break
        else:
            grupos.append([c])
    return grupos


def tarjetas_de(candidatas):
    """Una entrada por tarjeta, en el orden del video: {t0, t1, n, usuario, texto, conf, archivo} con el cuadro que más
    texto leyó (los cuadros de la animación salen cortados)."""
    res = []
    for g in agrupar(candidatas):
        mejor = max(g, key=lambda z: len(z["texto"]) * z["conf"] ** 2)
        res.append({"t0": g[0]["t"], "t1": g[-1]["t"], "n": len(g), "usuario": mejor["usuario"], "texto": mejor["texto"],
                    "conf": round(mejor["conf"], 2), "archivo": mejor["archivo"]})
    quedan = []
    for i, r in enumerate(res):      # un cuadro suelto contenido en una tarjeta vecina = esa tarjeta entrando o saliendo
        if r["n"] == 1:
            vecinos = [res[j]["texto"] for j in (i - 1, i + 1) if 0 <= j < len(res)
                       and (r["t0"] - res[j]["t1"] <= PASO if j < i else res[j]["t0"] - r["t1"] <= PASO)]
            if _norm(r["texto"]) and any(_norm(r["texto"]) in _norm(v) for v in vecinos):
                continue
        quedan.append(r)
    return quedan


def leer_tarjetas(lista_cuadros, ocr=None):
    """[(t, archivo)] → tarjetas en el orden del video publicado."""
    import cv2
    if ocr is None:
        from .texto import _ocr
        ocr = lambda img: _ocr()(img)[0]
    candidatas = []
    for t, f in lista_cuadros:
        img = cv2.imread(str(f))
        if img is None:
            continue
        c = tarjeta_de_cuadro(img, ocr(img), t, f)
        if c:
            candidatas.append(c)
    return tarjetas_de(candidatas)
```

- [ ] **Paso 4:** `python -m pytest tests/test_remix.py -q` → 29 pasan. `python -m pytest -q` → 353 pasan.
- [ ] **Paso 5: sin commit** (Decisión 14). Informe: «353 pasan».

### Task 8: Emparejar con TikTok o con pantallazos; tarjetas reales y dibujadas

**Files:**
- Modify: `herramientas/remix.py` (al final)
- Test: `tests/test_remix.py` (al final)

**Interfaces:**
- Consumes: Task 7 (`similitud`, `_norm`); `sondear.leer_comentarios(ctx, url, minimo)`, `sondear._normalizar(crudo)`, `sondear._bajar(url, destino)`, `sondear._preparar_medio(crudo)`, `pantallazos.leer(imagen)`, `pantallazos.recortar(imagen, caja, destino)`, `letra.limpiar_linea(texto)`.
- Produces: `fuente_tiktok(link, cfg, leer=None) -> (list[dict], "ok"|"captcha"|"sin_comentarios"|"error")`; `fuente_pantallazos(fotos, leer=None) -> list[dict]` (cada uno con `foto`); `emparejar(tarjetas, fuente) -> list[int|None]`; `comentario_real(c, carpeta, k, tarjeta, bajar=None) -> dict`; `comentario_dibujado(t, k, usados) -> dict`; `comentarios_de_tarjetas(tarjetas, fuente, carpeta, bajar=None) -> (list[dict], dibujadas: int)`. Comentario con `origen_remix` ∈ {`tiktok`, `pantallazo`, `dibujada`}; los de pantallazo y los dibujados llevan `corroborar: {ocr, cuadro, t0, t1, (foto | usuario_ocr)}`.

- [ ] **Paso 1: pruebas que fallan** (al final de `tests/test_remix.py`):

```python
# ---------- Task 8: emparejar con TikTok o pantallazos ----------
TIKTOK = [{"id": "111", "texto": "El perro paseando al dueño 😂😂", "usuario": "Ana Pérez", "likes": 900, "fecha": "2025-1-2",
           "avatar_url": "https://a/1.jpg", "gif_url": None, "respuestas": 3},
          {"id": "222", "texto": "que lindo un paseo por bluetooth KSJDKDHDJ", "usuario": "luisito", "likes": 40, "fecha": "2025-1-3",
           "avatar_url": None, "gif_url": None, "respuestas": 0},
          {"id": "333", "texto": "", "usuario": "sticker_man", "likes": 7, "fecha": "", "avatar_url": None, "gif_url": "https://g/1.gif"}]


def _t(texto, usuario="", t0=0.0):
    return {"t0": t0, "t1": t0 + 2.0, "n": 4, "usuario": usuario, "texto": texto, "conf": 0.9, "archivo": None}


def test_emparejar_por_texto_una_sola_vez():
    ts = [_t("el perro paseando al dueno"), _t("que lindo un paseo por bluetooth"), _t("el perro paseando al dueño"),
          _t("esto no esta en tiktok")]
    assert remix.emparejar(ts, TIKTOK) == [0, 1, None, None]


def test_emparejar_con_el_mismo_usuario_acepta_un_texto_mas_roto():
    roto = _t("perro paseando jaja", usuario="Ana Perez")
    assert remix.emparejar([roto], TIKTOK) == [0]
    assert remix.emparejar([{**roto, "usuario": "otra"}], TIKTOK) == [None]


def test_tarjeta_sin_texto_legible_no_se_empareja_con_un_comentario_vacio():
    """Review Focus 3: una tarjeta de solo emoji o sticker no toma el usuario y los likes de un sticker de TikTok."""
    assert remix.emparejar([_t(""), _t("😂😂")], TIKTOK) == [None, None]


def test_reales_de_tiktok_y_dibujadas_con_usuario_inventado(tmp_path):
    bajadas = []

    def bajar(url, destino):
        bajadas.append(url)
        Path(destino).write_bytes(b"x")
        return True
    ts = [_t("que lindo un paseo por bluetooth", t0=0.0), _t("nadie lo comento en tiktok", usuario="real_user", t0=3.0)]
    cs, dibujadas = remix.comentarios_de_tarjetas(ts, TIKTOK, tmp_path, bajar=bajar)
    real, dib = cs
    assert dibujadas == 1
    assert real["texto_tarjeta"] == TIKTOK[1]["texto"] and real["usuario"] == "luisito" and real["likes"] == 40
    assert real["origen_remix"] == "tiktok" and "corroborar" not in real and real["linea_letra"].endswith(",")
    assert dib["texto_tarjeta"] == "nadie lo comento en tiktok"               # el texto leído, nunca inventado
    assert dib["usuario"] in remix.USUARIOS and dib["usuario"] != "real_user"
    assert dib["likes"] is None and dib["avatar"] is None and dib["fecha"] == ""
    assert dib["corroborar"]["ocr"] == "nadie lo comento en tiktok" and dib["corroborar"]["t0"] == 3.0


def test_pantallazos_reemplazan_a_tiktok_y_quedan_para_corroborar(tmp_path):
    foto = tmp_path / "p01.jpg"
    foto.write_bytes(b"x")
    leidos = [{"usuario": "Kris", "texto": "Pan de masa madre Tira esa madre", "fecha": "2025-11-16", "likes": 1_200_000,
               "caja_avatar": None, "caja_imagen": None}]
    fuente = remix.fuente_pantallazos([foto], leer=lambda f: leidos)
    cs, dibujadas = remix.comentarios_de_tarjetas([_t("Pan der masa madre Tira esa madre", "Kris")], fuente, tmp_path)
    assert dibujadas == 0 and cs[0]["usuario"] == "Kris" and cs[0]["likes"] == 1_200_000
    assert cs[0]["origen_remix"] == "pantallazo" and cs[0]["corroborar"]["foto"] == str(foto)


def test_fuente_tiktok_traduce_captcha_y_errores():
    assert remix.fuente_tiktok("L", {}, leer=lambda u: (None, "captcha")) == ([], "captcha")
    assert remix.fuente_tiktok("L", {}, leer=lambda u: (None, "sin_comentarios")) == ([], "sin_comentarios")
    assert remix.fuente_tiktok("L", {}, leer=lambda u: (_ for _ in ()).throw(OSError("9223 cerrado"))) == ([], "error")
    crudo = {"cid": "9", "text": "hola", "digg_count": 3, "reply_comment_total": 0, "user": {"nickname": "n"}, "create_time": 0}
    lista, est = remix.fuente_tiktok("L", {}, leer=lambda u: ({"url": u, "crudos": [crudo], "respuestas": {}}, "ok"))
    assert est == "ok" and lista[0]["texto"] == "hola" and lista[0]["usuario"] == "n"
```

- [ ] **Paso 2:** `python -m pytest tests/test_remix.py -q` → FALLAN 6 con `AttributeError: module 'herramientas.remix' has no attribute 'emparejar'` (y `comentarios_de_tarjetas`, `fuente_pantallazos`, `fuente_tiktok`).
- [ ] **Paso 3: implementación** (al final de `herramientas/remix.py`):

```python
# ---------- emparejar con TikTok o con los pantallazos ----------
def fuente_tiktok(link, cfg, leer=None):
    """Comentarios que TikTok muestre del link (Chrome de captura 9223) normalizados como en sondear →
    (lista, "ok" | "captcha" | "sin_comentarios" | "error")."""
    from . import sondear
    if leer is None:
        def leer(url):
            from playwright.sync_api import sync_playwright
            with sync_playwright() as pw:
                ctx = pw.chromium.connect_over_cdp(cfg["chrome_cdp"]).contexts[0]
                return sondear.leer_comentarios(ctx, url, minimo=MAX_TIKTOK)
    try:
        datos, est = leer(link)
    except Exception:
        return [], "error"
    if est != "ok" or not datos:
        return [], est if est in ("captcha", "sin_comentarios") else "error"
    return [sondear._normalizar(c) for c in datos["crudos"]], "ok"


def fuente_pantallazos(fotos, leer=None):
    """Comentarios de los pantallazos de Oscar (reemplazan la búsqueda en TikTok), cada uno con su foto."""
    from . import pantallazos
    leer = leer or pantallazos.leer
    return [{**c, "foto": str(f)} for f in map(Path, fotos) for c in leer(f)]


def emparejar(tarjetas, fuente):
    """Por tarjeta, el índice del comentario de `fuente` con el texto más parecido (≥ UMBRAL, o ≥ UMBRAL_CON_USUARIO con
    el mismo usuario) o None. Cada comentario se usa una vez; una tarjeta sin texto legible nunca se empareja."""
    usados, out = set(), []
    for t in tarjetas:
        mejor, elegido = 0.0, None
        if _norm(t.get("texto")):
            for j, c in enumerate(fuente):
                if j in usados or not _norm(c.get("texto")):
                    continue
                s = similitud(t["texto"], c["texto"])
                mismo = bool(_norm(t.get("usuario"))) and similitud(t["usuario"], c.get("usuario")) >= 0.8
                if (s >= UMBRAL or (mismo and s >= UMBRAL_CON_USUARIO)) and s > mejor:
                    mejor, elegido = s, j
        if elegido is not None:
            usados.add(elegido)
        out.append(elegido)
    return out


def _linea(texto):
    from .letra import limpiar_linea
    return limpiar_linea(texto) if (texto or "").strip() else ","


def _tarjeta(t):
    return {"cuadro": t.get("archivo"), "t0": t["t0"], "t1": t["t1"]}


def comentario_real(c, carpeta, k, tarjeta, bajar=None):
    """Comentario emparejado: texto, usuario, likes, fecha, avatar e imagen reales (de TikTok o del pantallazo). El texto
    de un pantallazo también es OCR: queda para corroborar (contra la foto)."""
    carpeta = Path(carpeta)
    for sub in ("avatares", "gifs"):
        (carpeta / sub).mkdir(parents=True, exist_ok=True)
    texto = c.get("texto") or ""
    linea = _linea(texto)
    out = {"id": str(c.get("id") or f"r{k:02d}"), "usuario": c.get("usuario") or "", "avatar": None,
           "fecha": c.get("fecha") or "", "likes": c["likes"] if isinstance(c.get("likes"), int) else None,
           "respuestas": c.get("respuestas") or 0, "texto_tarjeta": texto, "linea_letra": linea, "gif": None,
           "medio_tipo": None, "incluido": bool(linea.strip(" ,")), "solo_gif": False}
    if c.get("foto"):
        from .pantallazos import recortar
        if c.get("caja_avatar"):
            out["avatar"] = f"avatares/{recortar(c['foto'], c['caja_avatar'], carpeta / 'avatares' / f'r{k:02d}.jpg').name}"
        if c.get("caja_imagen"):
            img = recortar(c["foto"], c["caja_imagen"], carpeta / "gifs" / f"r{k:02d}.png")
            out.update(gif=f"gifs/{img.name}", medio_tipo="imagen")
        out.update(origen_remix="pantallazo", corroborar={"ocr": texto, "foto": c["foto"], **_tarjeta(tarjeta)})
        return out
    from .sondear import _bajar, _preparar_medio
    bajar = bajar or _bajar
    av = carpeta / "avatares" / f"r{k:02d}.jpg"
    if c.get("avatar_url") and bajar(c["avatar_url"], av):
        out["avatar"] = f"avatares/{av.name}"
    if c.get("gif_url"):
        crudo = carpeta / "gifs" / f"r{k:02d}.bin"
        if bajar(c["gif_url"], crudo):
            rel, _, tipo = _preparar_medio(crudo)
            if rel:
                out.update(gif=rel, medio_tipo=tipo)
    out["origen_remix"] = "tiktok"
    return out


def comentario_dibujado(t, k, usados):
    """Tarjeta sin pareja: texto real leído del video, usuario inventado, sin likes ni fecha y avatar genérico
    (spec §2.6). Queda para que Claude la corrobore con whisper y el cuadro antes de cantarla (§7)."""
    linea = _linea(t["texto"])
    return {"id": f"r{k:02d}", "usuario": usuario_inventado(k, usados), "avatar": None, "fecha": "", "likes": None,
            "respuestas": 0, "texto_tarjeta": t["texto"], "linea_letra": linea, "gif": None, "medio_tipo": None,
            "incluido": bool(linea.strip(" ,")), "solo_gif": False, "origen_remix": "dibujada",
            "corroborar": {"ocr": t["texto"], "usuario_ocr": t.get("usuario") or "", **_tarjeta(t)}}


def comentarios_de_tarjetas(tarjetas, fuente, carpeta, bajar=None):
    """Comentarios del remix en el orden del publicado (reales si la tarjeta tiene pareja; si no, dibujados).
    Devuelve (comentarios, cuántos se dibujaron)."""
    parejas = emparejar(tarjetas, fuente)
    usados = {fuente[j].get("usuario") for j in parejas if j is not None}
    out = []
    for k, (t, j) in enumerate(zip(tarjetas, parejas), 1):
        c = comentario_dibujado(t, k, usados) if j is None else comentario_real(fuente[j], carpeta, k, t, bajar)
        usados.add(c["usuario"])
        out.append(c)
    return out, sum(1 for c in out if c["origen_remix"] == "dibujada")
```

- [ ] **Paso 4:** `python -m pytest tests/test_remix.py -q` → 35 pasan. `python -m pytest -q` → 359 pasan.
- [ ] **Paso 5: sin commit** (Decisión 14). Informe: «359 pasan».

### Task 9: Corroborar con el audio del publicado (whisper)

**Files:**
- Modify: `herramientas/remix.py` (al final)
- Test: `tests/test_remix.py` (al final)

**Interfaces:**
- Consumes: `PREMIERE-CLAUDE/subtitular.py` (`extraer_audio(archivo) -> wav`, `transcribir_palabras(wav, letra_prompt) -> [{texto, ini, fin}]`, como lo usa `alinear.py`), `gpu.preparar_gpu()`; Task 8 (`corroborar` en los comentarios).
- Produces: `transcribir_audio(video, prompt="") -> list[{texto, ini, fin}]`; `cantado_en(palabras, t0, t1) -> str`; `corroborar(comentarios, palabras, carpeta=None) -> comentarios` (agrega `corroborar.whisper` y copia el cuadro a `<carpeta>/remix/<id>.jpg`, `corroborar.cuadro = "remix/<id>.jpg"`); `pendientes_de_corroborar(p) -> list[dict]` (cantados con `corroborar` sin `ok`).

- [ ] **Paso 1: pruebas que fallan** (al final de `tests/test_remix.py`):

```python
# ---------- Task 9: corroborar con el audio ----------
PALABRAS = [{"texto": "hey", "ini": 0.2, "fin": 0.5}, {"texto": "el", "ini": 3.1, "fin": 3.3},
            {"texto": "perro", "ini": 3.3, "fin": 3.7}, {"texto": "paseando", "ini": 3.7, "fin": 4.4},
            {"texto": "que", "ini": 6.4, "fin": 6.6}, {"texto": "lindo", "ini": 6.6, "fin": 7.0}]


def test_cantado_en_toma_el_tramo_de_la_tarjeta_con_medio_cuadro():
    assert remix.cantado_en(PALABRAS, 3.5, 5.5) == "el perro paseando"
    assert remix.cantado_en(PALABRAS, 7.5, 9.0) == "lindo"
    assert remix.cantado_en(PALABRAS, 20.0, 22.0) == ""


def test_corroborar_solo_toca_las_que_lo_necesitan_y_copia_el_cuadro(tmp_path):
    cuadro = tmp_path / "f_0008.jpg"
    cuadro.write_bytes(b"jpg")
    cs = [{"id": "r01", "corroborar": {"ocr": "el perro", "cuadro": str(cuadro), "t0": 3.5, "t1": 5.5}}, {"id": "r02"}]
    remix.corroborar(cs, PALABRAS, tmp_path / "proy")
    assert cs[0]["corroborar"]["whisper"] == "el perro paseando" and cs[0]["corroborar"]["cuadro"] == "remix/r01.jpg"
    assert (tmp_path / "proy" / "remix" / "r01.jpg").exists() and "corroborar" not in cs[1]


def test_pendientes_de_corroborar():
    p = {"comentarios": [{"incluido": True, "corroborar": {"ocr": "a"}}, {"incluido": True, "corroborar": {"ok": True}},
                         {"incluido": False, "corroborar": {}}, {"incluido": True}]}
    assert len(remix.pendientes_de_corroborar(p)) == 1
```

- [ ] **Paso 2:** `python -m pytest tests/test_remix.py -q` → FALLAN 3 con `AttributeError: … has no attribute 'cantado_en'` (y `corroborar`, `pendientes_de_corroborar`).
- [ ] **Paso 3: implementación** (al final de `herramientas/remix.py`):

```python
# ---------- corroborar con el audio ----------
def transcribir_audio(video, prompt=""):
    """Palabras cantadas del publicado con el whisper de alinear.py (subtitular.transcribir_palabras, modelo medium):
    [{texto, ini, fin}] en minúsculas y sin tildes. Sirven para corroborar; no se copian a la tarjeta."""
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))   # PREMIERE-CLAUDE, para subtitular.py
    from .gpu import preparar_gpu
    preparar_gpu()
    import subtitular as S
    return S.transcribir_palabras(S.extraer_audio(str(video)), prompt)


def cantado_en(palabras, t0, t1):
    """Lo que se canta mientras la tarjeta está en pantalla (con medio cuadro de margen a cada lado)."""
    return " ".join(w["texto"] for w in palabras if w["fin"] >= t0 - PASO and w["ini"] <= t1 + PASO)


def corroborar(comentarios, palabras, carpeta=None):
    """A cada comentario por corroborar le agrega `whisper` (lo cantado en su tramo) y copia su cuadro a <carpeta>/remix/."""
    for c in comentarios:
        r = c.get("corroborar")
        if r is None:
            continue
        r["whisper"] = cantado_en(palabras, r["t0"], r["t1"])
        if carpeta and r.get("cuadro") and Path(r["cuadro"]).exists():
            destino = Path(carpeta) / "remix" / f"{c['id']}{Path(r['cuadro']).suffix}"
            destino.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(r["cuadro"], destino)
            r["cuadro"] = f"remix/{destino.name}"
    return comentarios


def pendientes_de_corroborar(p):
    """Comentarios cantados que Claude todavía no corroboró (corroborar.ok)."""
    return [c for c in p["comentarios"] if c.get("incluido") and c.get("corroborar") and not c["corroborar"].get("ok")]
```

- [ ] **Paso 4:** `python -m pytest tests/test_remix.py -q` → 38 pasan. `python -m pytest -q` → 362 pasan.
- [ ] **Paso 5: sin commit** (Decisión 14). Informe: «362 pasan».

### Task 10: Remix por tarjetas en la pasada (TikTok, pantallazos, sin tarjetas, `revisado` exige corroborar)

**Files:**
- Modify: `herramientas/pasada.py` (`_nuevo_remix`: las 3 líneas `if not previo: …` de la Task 6; función nueva `_remix_por_tarjetas` después de `_nuevo_remix`; `_pantallazos_de_web` líneas 946-949; `revisado` justo después de `p = proyecto.cargar(c)` en la línea 1019), `docs/runbook-pasada.md` (§2, después de la línea 39)
- Test: `tests/test_web_remix.py` (borrar `test_remix_de_un_video_que_no_es_del_sistema_espera_la_lectura_de_tarjetas`; agregar al final)

**Interfaces:**
- Consumes: Tasks 7-9 (`cuadros`, `leer_tarjetas`, `fuente_tiktok`, `fuente_pantallazos`, `comentarios_de_tarjetas`, `transcribir_audio`, `corroborar`, `pendientes_de_corroborar`), Task 6 (`armar_proyecto`, `_nuevo_remix`); `pasada._pedir_pantallazos(P, url, d, motivo, informe)`, `pasada._json/_guardar_json`; web `necesita-pantallazos` para remix (Task 2).
- Produces: `pasada._remix_por_tarjetas(P, url, d, carpeta, datos, paleta, informe)`; caché `logs/web/<id>/tarjetas.json`; pedido local `por_revisar` con `tarjetas` y `dibujadas`; `revisado` de un remix con algo sin `corroborar.ok` → no cambia nada e informa «faltan N tarjeta(s) por corroborar»; pantallazos de un remix → sigue `modo: "remix"` con `fotos`.

- [ ] **Paso 1: pruebas que fallan.** En `tests/test_web_remix.py` borra la prueba `test_remix_de_un_video_que_no_es_del_sistema_espera_la_lectura_de_tarjetas` y agrega al final:

```python
# ---------- Task 10: remix por tarjetas (OCR), TikTok, pantallazos y corroborar ----------
TARJETAS = [{"t0": 3.0, "t1": 5.0, "n": 5, "usuario": "Ana", "texto": "el perro paseando al dueño", "conf": 0.95, "archivo": None},
            {"t0": 6.0, "t1": 8.0, "n": 5, "usuario": "nadie", "texto": "esto no lo encuentra tiktok", "conf": 0.9, "archivo": None},
            {"t0": 9.0, "t1": 11.0, "n": 5, "usuario": "luis", "texto": "que lindo un paseo por bluetooth", "conf": 0.9, "archivo": None}]
TIKTOK = [{"id": "111", "texto": "El perro paseando al dueño 😂", "usuario": "Ana", "likes": 900, "fecha": "2025-1-2",
           "avatar_url": None, "gif_url": None, "respuestas": 0},
          {"id": "222", "texto": "que lindo un paseo por bluetooth", "usuario": "luis", "likes": 4000, "fecha": "2025-1-3",
           "avatar_url": None, "gif_url": None, "respuestas": 0}]


@pytest.fixture
def ocr(monkeypatch):
    estado = {"cuadros": 0, "tiktok": [(TIKTOK, "ok")], "whisper": 0}

    def cuadros(video, destino, paso=0.5):
        estado["cuadros"] += 1
        return [(0.0, Path(destino) / "f_0001.jpg")]
    monkeypatch.setattr(remix, "cuadros", cuadros)
    monkeypatch.setattr(remix, "leer_tarjetas", lambda lista, ocr=None: [dict(t) for t in estado.get("tarjetas", TARJETAS)])
    monkeypatch.setattr(remix, "fuente_tiktok", lambda link, cfg, leer=None: estado["tiktok"].pop(0))

    def whisper(video, prompt=""):
        estado["whisper"] += 1
        return [{"texto": "esto", "ini": 6.2, "fin": 6.5}, {"texto": "no", "ini": 6.5, "fin": 6.7}]
    monkeypatch.setattr(remix, "transcribir_audio", whisper)
    return estado


def test_remix_por_tarjetas_empareja_dibuja_y_queda_para_claude(entorno, web_remix, ocr):
    _correr()
    d = pasada._P().get("web:c_r")
    assert d["estado"] == "por_revisar" and d["tarjetas"] == 3 and d["dibujadas"] == 1
    p = proyecto.cargar(entorno["raiz"] / d["carpeta"])
    por_id = {c["id"]: c for c in p["comentarios"]}
    assert por_id["111"]["texto_tarjeta"] == "El perro paseando al dueño 😂" and por_id["111"]["likes"] == 900
    dib = por_id["r02"]
    assert dib["texto_tarjeta"] == "esto no lo encuentra tiktok" and dib["usuario"] in remix.USUARIOS and dib["likes"] is None
    assert dib["corroborar"]["whisper"] == "esto no" and ocr["whisper"] == 1
    assert [c["id"] for c in p["comentarios"]][0] == "222"        # el más gracioso (4000) que no iba primero
    assert all(c["id"] != o for c, o in zip(p["comentarios"], ["111", "r02", "222"]))
    assert p["estilo_suno"] in ("salsa", "merengue") and p["karaoke"]["color"] in PALETA


def test_revisado_de_remix_exige_corroborar(entorno, web_remix, ocr):
    """Review Focus 4: Claude no puede aprobar un remix con tarjetas sin corroborar: nunca se canta texto sin mirar."""
    _correr()
    d = pasada._P().get("web:c_r")
    c = entorno["raiz"] / d["carpeta"]
    inf = []
    pasada.revisado(d["carpeta"], inf)
    assert pasada._P().get("web:c_r")["estado"] == "por_revisar" and any("por corroborar" in x for x in inf)
    p = proyecto.cargar(c)
    for x in p["comentarios"]:
        if x.get("corroborar"):
            x["corroborar"]["ok"] = True
    proyecto.guardar(c, p)
    pasada.revisado(d["carpeta"], [])
    assert pasada._P().get("web:c_r")["estado"] == "aprobado" and proyecto.cargar(c)["estado"] == "listo_suno"


def test_todas_emparejadas_no_gasta_whisper(entorno, web_remix, ocr):
    ocr["tarjetas"] = [TARJETAS[0], TARJETAS[2]]
    _correr()
    assert ocr["whisper"] == 0 and pasada._P().get("web:c_r")["dibujadas"] == 0


def test_sin_tarjetas_legibles_queda_fallido_con_motivo(entorno, web_remix, ocr):
    ocr["tarjetas"] = []
    _correr()
    d = pasada._P().get("web:c_r")
    assert d["estado"] == "fallido" and "tarjetas del video publicado" in d["motivo"]
    pasada.avisar_fallidos_web(pasada._P(), [])
    assert web_remix["fallidos"][0][0] == "c_r"


def test_remix_con_captcha_vuelve_con_pantallazos_y_empareja_contra_ellos(entorno, web_remix, ocr, monkeypatch):
    """Review Focus 5: TikTok pide sesión → necesita_pantallazos; las fotos reemplazan a TikTok, sigue siendo remix y el
    OCR del publicado no se repite."""
    ocr["tiktok"] = [([], "captcha")]
    _correr()
    assert pasada._P().get("web:c_r")["estado"] == "necesita_pantallazos" and web_remix["necesita"][0][0] == "c_r"
    leidos = [{"usuario": "Ana", "texto": "el perro paseando al dueño", "fecha": "", "likes": 12, "caja_avatar": None,
               "caja_imagen": None}]
    monkeypatch.setattr("herramientas.pantallazos.leer", lambda f: leidos if f.name == "p01.jpg" else [])
    web_remix["pedidos"] = [_pedido(estado="necesita_pantallazos", original=None, gancho=None, publicado=None,
                                    pantallazos=[_arch("p01.jpg")])]
    _correr(fecha="2026-10-23")
    d = pasada._P().get("web:c_r")
    assert d["modo"] == "remix" and d["estado"] == "por_revisar" and ocr["cuadros"] == 1
    p = proyecto.cargar(entorno["raiz"] / d["carpeta"])
    origenes = sorted(c["origen_remix"] for c in p["comentarios"])
    assert origenes == ["dibujada", "dibujada", "pantallazo"] and d["dibujadas"] == 2
    assert web_remix["bajados"] == ["c_r", "c_r"]


def test_error_de_tiktok_se_reintenta_y_no_pide_pantallazos(entorno, web_remix, ocr):
    ocr["tiktok"] = [([], "error")]
    _correr()
    d = pasada._P().get("web:c_r")
    assert d["estado"] == "recibido" and d["intentos"] == 1 and web_remix["necesita"] == []
```

- [ ] **Paso 2:** `python -m pytest tests/test_web_remix.py -q` → FALLAN 6 (el remix se queda `recibido` con «espera la lectura de tarjetas»; `revisado` aprueba sin mirar `corroborar`).
- [ ] **Paso 3: el camino OCR en `_nuevo_remix`.** En `herramientas/pasada.py`, reemplaza en `_nuevo_remix`:

```python
    if not previo:            # Task 10 lo cambia por la lectura de tarjetas; mientras tanto espera (no falla)
        informe.append(f"Remix {url}: el publicado no es de este sistema; espera la lectura de tarjetas")
        return
```

por:

```python
    if not previo:
        _remix_por_tarjetas(P, url, d, carpeta, datos, paleta, informe)
        return
```

y agrega, justo después de `_nuevo_remix`:

```python
def _remix_por_tarjetas(P, url, d, carpeta, datos, paleta, informe):
    """El publicado no lo hizo este sistema (o no se halló su proyecto): tarjetas del video (OCR cada 0,5 s) emparejadas
    con TikTok, o con los pantallazos de Oscar si TikTok pidió sesión (spec §3). Lo dibujado y lo leído de fotos se
    corrobora con whisper; Claude lo revisa contra el cuadro (por_revisar → revisado lo aprueba, sin Oscar)."""
    from . import remix
    publicado = Path(d["publicado"])
    cache = publicado.parent / "tarjetas.json"            # el OCR no se repite si el pedido vuelve con pantallazos
    tarjetas = _json(cache, None)
    if tarjetas is None:
        tarjetas = remix.leer_tarjetas(remix.cuadros(publicado, publicado.parent / "cuadros"))
        _guardar_json(cache, tarjetas)
    if not tarjetas:
        P.poner(url, estado="fallido", carpeta=carpeta.name,
                motivo="no pude leer las tarjetas del video publicado; pídelo «Con pantallazos» con fotos de sus tarjetas")
        informe.append(f"Remix sin tarjetas legibles: {url}")
        return
    if d.get("fotos"):
        fuente = remix.fuente_pantallazos([f["archivo"] for f in d["fotos"]])
    else:
        fuente, est = remix.fuente_tiktok(d["link"], config.cargar())
        if est in ("captcha", "sin_comentarios"):
            _pedir_pantallazos(P, url, d, "TikTok pidió iniciar sesión o captcha" if est == "captcha"
                               else "TikTok no mostró los comentarios (pide iniciar sesión)", informe)
            return
        if est != "ok":
            raise RuntimeError(f"no pude leer los comentarios de TikTok ({est})")   # se reintenta (máx. 3)
    comentarios, dibujadas = remix.comentarios_de_tarjetas(tarjetas, fuente, carpeta)
    if any(c.get("corroborar") for c in comentarios):
        remix.corroborar(comentarios, remix.transcribir_audio(publicado, " ".join(t["texto"] for t in tarjetas)), carpeta)
    remix.armar_proyecto(carpeta, url, comentarios, datos, indice=len(P.d), paleta=paleta)
    P.poner(url, estado="por_revisar", carpeta=carpeta.name, revisado=False, tarjetas=len(comentarios), dibujadas=dibujadas)
    informe.append(f"Remix por tarjetas: {carpeta.name} ({len(comentarios)} tarjetas, {dibujadas} dibujadas con usuario "
                   "inventado); Claude lo corrobora y lo aprueba con `revisado`")
```

- [ ] **Paso 4: los pantallazos de un remix siguen siendo remix.** En `_pantallazos_de_web`, reemplaza las líneas 946-949 (`if d.get("modo") == "link" and …` hasta el `P.poner(url, modo="pantallazos", …, intentos=0)`) por:

```python
    if d.get("modo") in ("link", "remix") and d.get("estado") in ("recibido", "necesita_pantallazos"):
        rutas = web.bajar(ped, LOGS / "web" / ped["id"] / "pantallazos")
        # remix: las fotos reemplazan la búsqueda en TikTok (se empareja contra ellas) y sigue siendo remix
        P.poner(url, modo="remix" if d["modo"] == "remix" else "pantallazos",
                fotos=[{"archivo": str(f)} for f in rutas["pantallazos"]], estado="recibido", motivo=None, intentos=0)
```

(la línea siguiente, `informe.append(f"Pantallazos del pedido web …")`, queda igual).

- [ ] **Paso 5: `revisado` exige corroborar en un remix.** En `revisado`, justo después de `p = proyecto.cargar(c)` (línea 1019) agrega:

```python
    if P.get(url).get("modo") == "remix":
        from .remix import pendientes_de_corroborar
        faltan = pendientes_de_corroborar(p)
        if faltan:            # nunca se canta un texto que nadie miró contra el cuadro (spec §7)
            informe.append(f"{c.name}: faltan {len(faltan)} tarjeta(s) por corroborar (corroborar.ok); no lo apruebo")
            return
```

- [ ] **Paso 6: runbook.** En `docs/runbook-pasada.md` §2, después del último caso de «Pedidos web por link» (línea 39, «**TikTok con captcha o sin comentarios:** …») agrega:

```markdown
- **Remix por tarjetas** (`"modo": "remix"`, estado `por_revisar`; el publicado no lo hizo este sistema): los comentarios salieron del OCR de las tarjetas del publicado (`logs/web/<id>/tarjetas.json`) emparejadas con TikTok (`origen_remix: tiktok`, texto real de TikTok), con los pantallazos de Oscar (`pantallazo`) o **dibujadas** (`dibujada`: texto leído, usuario inventado, sin likes). El orden, el estilo y el color ya los puso el código: **no quitar ni reordenar**. Por cada comentario con `corroborar`: abrir el cuadro (`PROYECTOS\<carpeta>\<corroborar.cuadro>`, o la foto `corroborar.foto` en los de pantallazo), compararlo con `corroborar.ocr` y con `corroborar.whisper` (lo que se canta mientras la tarjeta está en pantalla, en minúsculas y sin tildes) y dejar en `texto_tarjeta` el texto **exacto del cuadro** (tildes, emojis, palabras) — nunca inventar: si no se lee ni se oye, `incluido: false` —; rehacer `linea_letra` con el reglamento (formato, ortografía, (sí)/(no)) y poner `"ok": true` dentro de `corroborar`. Los demás (`tiktok`) solo pasan por el reglamento de `linea_letra`. Cerrar con `python -m herramientas.pasada revisado <carpeta>`: lo aprueba directo (sin Oscar, Suno hoy); si dice «faltan N tarjeta(s) por corroborar», falta algún `ok`. **TikTok con captcha** → `necesita_pantallazos` (Oscar sube pantallazos de TikTok en cualquier orden y el siguiente `leer` empareja contra ellos). **Sin tarjetas legibles** → `fallido` con motivo (Oscar lo pide «Con pantallazos»). El primer remix es una prueba de monetización (spec §2.8): decirlo en el resumen.
```

- [ ] **Paso 7:** `python -m pytest tests/test_web_remix.py -q` → 15 pasan. `python -m pytest -q` → 367 pasan.
- [ ] **Paso 8: sin commit** (Decisión 14). Informe: «367 pasan».

### Task 11: Resumen con las tarjetas dibujadas, bitácora y prueba real

**Files:**
- Modify: `herramientas/pasada.py` (`resumen`, justo antes de `if tasa is not None:` línea 1427), `BITACORA-CANTADOS.md` (§0, después de la viñeta «**Pedidos por link en la web (2026-10-22): CONSTRUIDO el lado del PC**»)
- Test: `tests/test_web_remix.py` (al final)

**Interfaces:**
- Consumes: Tasks 6 y 10 (campos `tarjetas`, `dibujadas` del pedido local).
- Produces: línea del resumen «Remix <carpeta>: N de M tarjetas dibujadas (usuario inventado, sin likes)», una vez por remix (`remix_resumido: True`).

- [ ] **Paso 1: prueba que falla** (al final de `tests/test_web_remix.py`):

```python
# ---------- Task 11: resumen ----------
def test_resumen_dice_cuantas_tarjetas_se_dibujaron_una_sola_vez(entorno, web_remix, ocr):
    _correr()
    pasada.resumen(["x"])
    assert "Remix 2026-10-22-remix-lo-grabaron-paseando-al-perro: 1 de 3 tarjetas dibujadas" in entorno["enviados"][-1]
    pasada.resumen(["x"])
    assert "Remix " not in entorno["enviados"][-1]
```

- [ ] **Paso 2:** `python -m pytest tests/test_web_remix.py::test_resumen_dice_cuantas_tarjetas_se_dibujaron_una_sola_vez -q` → FALLA (`assert 'Remix 2026-10-22-…' in '📋 Pasada …'`).
- [ ] **Paso 3: implementación.** En `resumen`, justo antes de `if tasa is not None:` agrega:

```python
    remixes = [u for u, v in P.d.items() if v.get("modo") == "remix" and v.get("tarjetas") and not v.get("remix_resumido")]
    for u in remixes:
        v = P.d[u]
        t.append(f"Remix {v['carpeta']}: {v.get('dibujadas', 0)} de {v['tarjetas']} tarjetas dibujadas "
                 "(usuario inventado, sin likes)")
        v["remix_resumido"] = True
    if remixes:
        P._guardar()
```

- [ ] **Paso 4:** `python -m pytest -q` → 368 pasan.
- [ ] **Paso 5: bitácora.** En `BITACORA-CANTADOS.md` §0, después de la viñeta «**Pedidos por link en la web (2026-10-22): CONSTRUIDO el lado del PC**…» agrega:

```markdown
- **Remix por la web (2026-10-22): CONSTRUIDO el lado del PC** (spec `C:\Users\delga\Documents\elmetacho-web\docs\superpowers\specs\2026-10-22-admin-fase2-design.md` §2.4–8, §5, §7; plan `C:\Users\delga\Documents\elmetacho-web\docs\plans\2026-10-22-admin-remix.md`; `python -m pytest -q` → 368 pasan). `herramientas/remix.py`: si el publicado lo hizo este sistema (mismo link o id de video + corte de igual duración ±1 s) los comentarios salen de su `proyecto.json` y queda `aprobado` al instante; si no, OCR de tarjetas cada 0,5 s → emparejar con TikTok (o pantallazos si hay captcha) → dibujadas con usuario inventado → whisper → Claude corrobora (runbook §2 «Remix por tarjetas») y `revisado` lo aprueba. Orden nuevo (el primero de los 3 más graciosos, nadie en su puesto), estilo y color contrarios, gancho nuevo; el resumen dice cuántas tarjetas se dibujaron. Sin commit (cambios de otra sesión en PREMIERE-CLAUDE). Falta: un remix real de cada camino; el primero es prueba de monetización (mirar el panel de Meta antes de hacer más).
```

- [ ] **Paso 6: prueba real (con Oscar, no automática; spec §8 «un pedido real de cada tipo»).** Con la web de la Parte A en producción (PR fusionado por Oscar):
  1. Oscar pide en el celular un **remix de un video hecho por este sistema** (link del original, el publicado bajado de Facebook, el clip y un gancho nuevo).
  2. En la franja (o a mano: `PYTHONIOENCODING=utf-8 python -m herramientas.pasada leer`), el informe debe decir «Pedido de la web (remix): …» y «Remix de <carpeta vieja>: … sale hoy sin revisión». Si dice «Remix por tarjetas», el proyecto previo no se halló: anotar por qué (link, duración del publicado con `ffprobe` contra `salida.mp4`) antes de seguir.
  3. Seguir §3–§5 del runbook; al entregar, comprobar en el admin que el pedido ya no está y pedirle a Oscar que mire Blob (`cantados/<id>/` vacío).
  4. Repetir con un **video de Premiere**: revisar en `PROYECTOS\<carpeta>\remix\` los cuadros de las tarjetas dibujadas, corroborar y `revisado`.
  5. Anotar en `BITACORA-CANTADOS.md` lo que pasó (lo visto, no lo esperado) y recordarle a Oscar que el primero es la prueba de monetización.
- [ ] **Paso 7: sin commit** (Decisión 14). Avisarle a Oscar: «Los cambios del PC (`herramientas/remix.py`, `pasada.py`, `web.py`, pruebas, runbook y bitácora) quedaron sin commit porque PREMIERE-CLAUDE tiene cambios de otra sesión; dime si los comiteo aparte».
