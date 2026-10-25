# Instagram: DM → Cabina y palabras clave en comentarios — plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** los reels/links que la comunidad manda por DM a elmetacho_ llegan a `PENDIENTES.txt` del PC, y en metacholabs un comentario con palabra clave recibe respuesta pública + DM con link (con «Ya te sigo» opcional), listo para una sola revisión de Meta.

**Arquitectura:** el receptor `src/app/api/instagram/webhook` (ya en producción, PR #18) pasa a repartir cada aviso por cuenta (`entry.id`). La lógica vive en módulos pequeños y puros en `src/app/admin/lib/instagram/` que reciben un cliente Redis y un cliente de Meta inyectados (en pruebas: falsos en memoria). Rutas finas en `src/app/admin/api/…` y `src/app/api/instagram/…`; páginas en `/admin/dm-links` y `/admin/palabras`; páginas legales en `mlabs.elmetacho.com`. El PC baja la cola en `pasada leer`.

**Tecnología:** Next.js 16 (App Router, runtime `nodejs`), `redis` 6.3.0 (node-redis), Graph API de Instagram `graph.instagram.com/v26.0`, cron de Vercel, pruebas `node --test`; PC en Python 3.11 con pytest.

**Spec:** `docs/superpowers/specs/2026-10-25-instagram-dm-comentarios-design.md` (léelo antes de cada tarea).

## Restricciones globales

- Repo web: rama nueva desde `main` por bloque de trabajo (§9 del spec), commits pequeños en español terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. El dueño hace el push y aprueba el merge (CLAUDE.md de la web); si Oscar autoriza en el chat, Claude puede fusionar.
- Nunca leer `.env*` ni pedir tokens en el chat. Variables nuevas (las pega Oscar en Vercel → Production): `IG_CUENTA_CABINA=17841402790807435`, `IG_CUENTA_PALABRAS=17841480070378472`, `IG_TOKEN_LABS`, `CRON_SECRET`. Ya existen: `IG_WEBHOOK_VERIFY_TOKEN`, `IG_APP_SECRET`, `META_APP_SECRET`, `KV_REDIS_URL`, `ADMIN_CLAVE`, `ADMIN_PC_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- Graph API: host `https://graph.instagram.com/v26.0`, cabecera `Authorization: Bearer <token>`. Respuesta privada: `POST /<cuenta>/messages` con `{recipient:{comment_id}, message}` — un solo mensaje, ≤ 7 días. Texto de mensaje ≤ 1000 bytes UTF-8. Respuestas rápidas: `quick_replies:[{content_type:"text", title, payload}]`, título ≤ 20 caracteres; el toque llega en `message.quick_reply.payload`. Seguimiento: `GET /<igsid>?fields=is_user_follow_business` (solo tras un mensaje del usuario). Renovar: `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=…` → `{access_token, token_type, expires_in}` (token ≥ 24 h de edad).
- Redis (node-redis 6.3.0): `set(k, v, { condition: "NX", expiration: { type: "EX", value: segundos } })` devuelve `"OK"` o `null`.
- Privacidad: no guardar texto de comentarios ni de mensajes, ni nombres de usuario; del usuario solo su id durante la espera de 24 h.
- Coincidencia de palabra clave: el comentario contiene la palabra/frase completa, sin mayúsculas ni tildes («recursos» NO dispara «curso»); la primera de la lista gana.
- Todo lo legal y el webhook bajo `https://mlabs.elmetacho.com`; el panel sigue en `https://www.elmetacho.com/admin` (la cookie va con `Path=/admin`).
- Antes de cada PR: `npm test`, `npx eslint src`, `npm run build` sin errores.

## Foco de revisión

1. **Bucle de respuestas:** la respuesta pública de la propia cuenta («Te envié el curso») contiene la palabra clave y Meta la avisa como comentario nuevo → no debe responderse (se filtra por id de la cuenta Y por texto igual a una respuesta configurada). Prueba en la Tarea 7.
2. **`entry.id` que no coincide con las variables** (si Meta mandara otro id de cuenta): no se procesa nada en silencio → el receptor registra «cuenta sin uso: <id>» para descubrirlo en los logs. Prueba en la Tarea 2.
3. **Aviso repetido de Meta (reintentos hasta 36 h):** el mismo comentario no se responde dos veces. Prueba en la Tarea 7.
4. **Token pegado hace menos de 24 h:** la primera renovación falla; el aviso por Telegram debe decir que es normal y el token sigue sirviendo. Prueba en la Tarea 6.
5. **PC caído entre bajar y confirmar los links:** el siguiente `leer` los vuelve a recibir y no los duplica en `PENDIENTES.txt`. Prueba en la Tarea 4.

---

## Bloque A (PR 1): receptor por cuenta + parte 1

Rama: `feat/instagram-reparto-dm` desde `origin/main`.

### Tarea 1: Redis falso, claves y cola de DM

**Archivos:**
- Crear: `src/app/admin/lib/instagram/claves.js`, `src/app/admin/lib/instagram/redis-memoria.js`, `src/app/admin/lib/instagram/dm.js`, `src/app/admin/lib/instagram/conexion.js`
- Probar: `src/app/admin/lib/instagram/dm.test.js`
- Modificar: `src/app/api/instagram/webhook/meta.js` (las constantes salen de `claves.js`)

**Interfaces:**
- Produce: `COLA`, `VISTOS`, `ENTREGADOS`, `clave(cuenta, ...partes) → "ig:<cuenta>:…"`; `redisMemoria(reloj?)` con `get,set,del,incr,expire,sAdd,lPush,lRange,hSet,hGetAll`; `listaDm(r) → [{link, recibido, entregado|null}]` (más nuevo primero); `pendientesDm(r) → [link]` (más viejo primero, sin entregados); `confirmarDm(r, links, ahoraIso) → n`; `conRedis(fn)`.

- [ ] **Paso 1: prueba que falla** — `src/app/admin/lib/instagram/dm.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { redisMemoria } from "./redis-memoria.js";
import { confirmarDm, listaDm, pendientesDm } from "./dm.js";
import { guardarLinks } from "../../../api/instagram/webhook/meta.js";

test("la cola de DM: pendientes en orden de llegada, confirmar los saca", async () => {
  const r = redisMemoria();
  await guardarLinks(r, ["https://vt.tiktok.com/A/"], "2026-10-25T10:00:00.000Z");
  await guardarLinks(r, ["https://www.instagram.com/reel/B/"], "2026-10-25T11:00:00.000Z");
  assert.deepEqual(await pendientesDm(r), ["https://vt.tiktok.com/A/", "https://www.instagram.com/reel/B/"]);
  assert.equal(await confirmarDm(r, ["https://vt.tiktok.com/A/", "", 7], "2026-10-26T05:00:00.000Z"), 1);
  assert.deepEqual(await pendientesDm(r), ["https://www.instagram.com/reel/B/"]);
  const lista = await listaDm(r);
  assert.equal(lista[0].link, "https://www.instagram.com/reel/B/");
  assert.equal(lista[1].entregado, "2026-10-26T05:00:00.000Z");
});

test("redis falso: SET NX con vencimiento", async () => {
  const reloj = { t: 0 };
  const r = redisMemoria(() => reloj.t);
  assert.equal(await r.set("k", "1", { condition: "NX", expiration: { type: "EX", value: 10 } }), "OK");
  assert.equal(await r.set("k", "2", { condition: "NX" }), null);
  reloj.t = 11_000;
  assert.equal(await r.get("k"), null);
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/instagram/dm.test.js` → FALLA (módulos no existen).

- [ ] **Paso 3: implementar.** `claves.js`:

```js
// claves.js — nombres de las claves de Redis de Instagram (spec 2026-10-25 §5). Todo lo de palabras clave va por cuenta.
export const COLA = "cabina:dm:links";            // lista de {link, recibido}
export const VISTOS = "cabina:dm:vistos";         // links que ya entraron alguna vez
export const ENTREGADOS = "cabina:dm:entregados"; // hash link → hora en que el PC confirmó
export const clave = (cuenta, ...partes) => ["ig", cuenta, ...partes].join(":");
```

`redis-memoria.js`:

```js
// redis-memoria.js — lo justo de node-redis 6 para las pruebas, con vencimientos según un reloj inyectable.
export function redisMemoria(reloj = () => Date.now()) {
  const datos = new Map();
  const vivo = (k) => {
    const e = datos.get(k);
    if (e && e.vence && e.vence <= reloj()) { datos.delete(k); return undefined; }
    return e;
  };
  const val = (k, def) => vivo(k)?.v ?? def;
  const poner = (k, v, vence = 0) => void datos.set(k, { v, vence });
  return {
    get: async (k) => { const v = val(k); return typeof v === "string" ? v : null; },
    set: async (k, v, o = {}) => {
      if (o.condition === "NX" && vivo(k)) return null;
      poner(k, String(v), o.expiration ? reloj() + o.expiration.value * 1000 : 0);
      return "OK";
    },
    del: async (k) => (datos.delete(k) ? 1 : 0),
    incr: async (k) => { const e = vivo(k); const n = Number(e?.v || 0) + 1; poner(k, String(n), e?.vence || 0); return n; },
    expire: async (k, s) => { const e = vivo(k); if (!e) return 0; e.vence = reloj() + s * 1000; return 1; },
    sAdd: async (k, m) => { const s = val(k, new Set()); if (s.has(m)) return 0; s.add(m); poner(k, s); return 1; },
    lPush: async (k, m) => { const l = val(k, []); l.unshift(m); poner(k, l); return l.length; },
    lRange: async (k, a, b) => val(k, []).slice(a, b === -1 ? undefined : b + 1),
    hSet: async (k, f, v) => { const h = val(k, {}); h[f] = String(v); poner(k, h); return 1; },
    hGetAll: async (k) => ({ ...val(k, {}) }),
  };
}
```

`dm.js`:

```js
// dm.js — cola de links de DM para el PC (spec §4.2): el PC pide, guarda en PENDIENTES.txt y confirma.
import { COLA, ENTREGADOS } from "./claves.js";

export async function listaDm(r) {
  const [crudos, entregados] = await Promise.all([r.lRange(COLA, 0, -1), r.hGetAll(ENTREGADOS)]);
  return crudos.map((s) => JSON.parse(s)).map((x) => ({ ...x, entregado: entregados[x.link] ?? null }));
}

export async function pendientesDm(r) {
  return (await listaDm(r)).filter((x) => !x.entregado).reverse().map((x) => x.link);
}

export async function confirmarDm(r, links, ahoraIso) {
  let n = 0;
  for (const l of Array.isArray(links) ? links : []) {
    if (typeof l !== "string" || !l) continue;
    await r.hSet(ENTREGADOS, l, ahoraIso);
    n++;
  }
  return n;
}
```

`conexion.js`:

```js
// conexion.js — abre y cierra el Redis de la cuenta para una sola operación.
import { createClient } from "redis";
import { urlRedisDirecta } from "../../../api/lead/config.js";

export async function conRedis(fn) {
  const url = urlRedisDirecta(process.env);
  if (!url) throw new Error("Sin Redis (KV_REDIS_URL)");
  const r = createClient({ url });
  await r.connect();
  try {
    return await fn(r);
  } finally {
    r.quit().catch(() => {});
  }
}
```

En `meta.js`, cambiar las dos líneas `export const COLA = …` / `export const VISTOS = …` por:

```js
import { COLA, VISTOS } from "../../../admin/lib/instagram/claves.js";
export { COLA, VISTOS };
```

- [ ] **Paso 4:** `npm test` → todo PASA (incluidas las 5 pruebas de `meta.test.js`).
- [ ] **Paso 5: commit** `git add src/app/admin/lib/instagram src/app/api/instagram/webhook/meta.js && git commit -m "Instagram: cola de DM con entrega en dos pasos y Redis falso para pruebas"`

### Tarea 2: repartir avisos por cuenta

**Archivos:**
- Crear: `src/app/api/instagram/webhook/reparto.js`, `src/app/api/instagram/webhook/reparto.test.js`
- Modificar: `src/app/api/instagram/webhook/route.js`

**Interfaces:**
- Consume: `linksDe(evento)`, `guardarLinks(r, links)` (meta.js), `conRedis` (Tarea 1).
- Produce: `repartir(evento, { cabina, palabras }) → { acciones, desconocidas }` con acciones `{tipo:"links", cuenta, links}`, `{tipo:"comentario", cuenta, id, usuario, texto}`, `{tipo:"mensaje", cuenta, usuario, payload}`. La Tarea 7 conecta `comentario` y `mensaje`.

- [ ] **Paso 1: prueba que falla** — `reparto.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { repartir } from "./reparto.js";

const C = { cabina: "111", palabras: "222" };

test("DM a la cuenta de la Cabina → links; a la de palabras → mensaje; eco → nada", () => {
  const ev = { object: "instagram", entry: [
    { id: "111", messaging: [{ sender: { id: "9" }, message: { attachments: [{ type: "ig_reel", payload: { url: "https://www.instagram.com/reel/X/?igsh=1" } }] } }] },
    { id: "222", messaging: [
      { sender: { id: "8" }, message: { text: "Ya te sigo", quick_reply: { payload: "YA_TE_SIGO" } } },
      { sender: { id: "222" }, message: { is_echo: true, text: "eco" } },
    ] },
  ] };
  assert.deepEqual(repartir(ev, C).acciones, [
    { tipo: "links", cuenta: "111", links: ["https://www.instagram.com/reel/X/"] },
    { tipo: "mensaje", cuenta: "222", usuario: "8", payload: "YA_TE_SIGO" },
  ]);
});

test("comentarios solo de la cuenta de palabras; id como value.id o value.comment_id", () => {
  const ev = { entry: [
    { id: "222", changes: [
      { field: "comments", value: { id: "c1", from: { id: "7", username: "ana" }, text: "Curso!!", media: { id: "m" } } },
      { field: "comments", value: { comment_id: "c2", from: { id: "6" }, text: "curso" } },
      { field: "live_comments", value: { id: "c3", from: { id: "5" }, text: "curso" } },
    ] },
    { id: "111", changes: [{ field: "comments", value: { id: "c4", from: { id: "4" }, text: "curso" } }] },
  ] };
  assert.deepEqual(repartir(ev, C).acciones, [
    { tipo: "comentario", cuenta: "222", id: "c1", usuario: "7", texto: "Curso!!" },
    { tipo: "comentario", cuenta: "222", id: "c2", usuario: "6", texto: "curso" },
  ]);
});

test("cuentas que no están en las variables quedan como desconocidas; sin variables no se procesa nada", () => {
  const ev = { entry: [{ id: "333", messaging: [{ sender: { id: "1" }, message: { text: "https://vt.tiktok.com/A/" } }] }] };
  assert.deepEqual(repartir(ev, C), { acciones: [], desconocidas: ["333"] });
  assert.deepEqual(repartir({ entry: [{ id: "111", messaging: [] }] }, {}).desconocidas, ["111"]);
  assert.deepEqual(repartir(null, C), { acciones: [], desconocidas: [] });
});
```

- [ ] **Paso 2:** `node --test src/app/api/instagram/webhook/reparto.test.js` → FALLA.

- [ ] **Paso 3: implementar** `reparto.js`:

```js
// reparto.js — cada aviso de Meta trae entry.id = la cuenta de Instagram que lo recibe (spec §4.1).
// IG_CUENTA_CABINA (elmetacho_): DM → cola de la Cabina. IG_CUENTA_PALABRAS (metacholabs): comentarios y mensajes.
import { linksDe } from "./meta.js";

export function repartir(evento, { cabina, palabras }) {
  const acciones = [], desconocidas = [];
  for (const e of evento?.entry ?? []) {
    const cuenta = String(e?.id ?? "");
    if (!cuenta || (cuenta !== cabina && cuenta !== palabras)) { if (cuenta) desconocidas.push(cuenta); continue; }
    for (const m of e.messaging ?? []) {
      const msg = m?.message;
      if (!msg || msg.is_echo) continue;
      if (cuenta === cabina) {
        const links = linksDe({ entry: [{ messaging: [m] }] });
        if (links.length) acciones.push({ tipo: "links", cuenta, links });
      } else {
        acciones.push({ tipo: "mensaje", cuenta, usuario: String(m.sender?.id ?? ""), payload: msg.quick_reply?.payload ?? null });
      }
    }
    if (cuenta !== palabras) continue;
    for (const c of e.changes ?? []) {
      if (c?.field !== "comments") continue;
      const v = c.value ?? {};
      acciones.push({ tipo: "comentario", cuenta, id: String(v.id ?? v.comment_id ?? ""), usuario: String(v.from?.id ?? ""), texto: String(v.text ?? "") });
    }
  }
  return { acciones, desconocidas };
}
```

- [ ] **Paso 4:** reemplazar en `route.js` todo desde `const links = linksDe(evento);` hasta el final de `POST` por:

```js
  const { acciones, desconocidas } = repartir(evento, { cabina: process.env.IG_CUENTA_CABINA, palabras: process.env.IG_CUENTA_PALABRAS });
  if (desconocidas.length) console.log(`webhook instagram: cuenta sin uso ${desconocidas.join(", ")}`);
  if (!acciones.length) return new Response("ok");
  try {
    await conRedis(async (r) => {
      for (const a of acciones) {
        if (a.tipo === "links") {
          const n = await guardarLinks(r, a.links);
          console.log(`webhook instagram: ${a.links.length} link(s), ${n} nuevo(s) en la cola`);
        }
      }
    });
    return new Response("ok");
  } catch (e) {
    console.error("webhook instagram redis", e);
    return new Response("Error", { status: 500 });   // Meta reintenta hasta 36 h
  }
}
```

y ajustar los imports del archivo a:

```js
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { firmaValida, guardarLinks, respuestaVerificacion } from "./meta.js";
import { repartir } from "./reparto.js";
```

(se quitan `createClient` y `urlRedisDirecta`). Actualizar el comentario de cabecera: añadir `IG_CUENTA_CABINA` e `IG_CUENTA_PALABRAS` a la lista de variables.

- [ ] **Paso 5:** `npm test` → PASA. `npx eslint src/app/api/instagram` → limpio.
- [ ] **Paso 6: commit** `git commit -am "Webhook de Instagram: reparto por cuenta (Cabina y palabras clave)"` (con `git add` de `reparto*.js`).

### Tarea 3: rutas del PC y página «Links por DM»

**Archivos:**
- Crear: `src/app/admin/api/pc/dm-links/route.js`, `src/app/admin/api/pc/dm-links/recibidos/route.js`, `src/app/admin/dm-links/page.jsx`
- Modificar: `src/app/admin/page.jsx` (enlaces a las páginas nuevas), `docs/admin.md` (tabla de API y variables)

**Interfaces:**
- Consume: `pendientesDm`, `confirmarDm`, `listaDm`, `conRedis` (Tarea 1); `tokenPcValido`, `sesionValida`, `COOKIE` (`src/app/admin/lib/sesion.js`).
- Produce (contrato con el PC, Tarea 4): `GET /admin/api/pc/dm-links` → `{ links: [string] }`; `POST /admin/api/pc/dm-links/recibidos` con `{ links: [string] }` → `{ ok: true, confirmados: n }`; ambas con `Authorization: Bearer <ADMIN_PC_TOKEN>`, si no 401 `{error}`.

- [ ] **Paso 1:** `src/app/admin/api/pc/dm-links/route.js`:

```js
// Links de DM aún no confirmados por el PC (spec 2026-10-25 §4.2). No marca nada: el PC confirma con …/recibidos.
import { tokenPcValido } from "../../../lib/sesion.js";
import { conRedis } from "../../../lib/instagram/conexion.js";
import { pendientesDm } from "../../../lib/instagram/dm.js";

export const runtime = "nodejs";

export async function GET(req) {
  if (!tokenPcValido(req.headers.get("authorization"), process.env.ADMIN_PC_TOKEN)) return Response.json({ error: "No autorizado." }, { status: 401 });
  return Response.json({ links: await conRedis(pendientesDm) });
}
```

`src/app/admin/api/pc/dm-links/recibidos/route.js`:

```js
// El PC confirma los links que ya guardó en PENDIENTES.txt.
import { tokenPcValido } from "../../../../lib/sesion.js";
import { conRedis } from "../../../../lib/instagram/conexion.js";
import { confirmarDm } from "../../../../lib/instagram/dm.js";

export const runtime = "nodejs";

export async function POST(req) {
  if (!tokenPcValido(req.headers.get("authorization"), process.env.ADMIN_PC_TOKEN)) return Response.json({ error: "No autorizado." }, { status: 401 });
  let c = {};
  try { c = await req.json(); } catch { /* cuerpo vacío o malo: no confirma nada */ }
  const confirmados = await conRedis((r) => confirmarDm(r, c?.links, new Date().toISOString()));
  return Response.json({ ok: true, confirmados });
}
```

- [ ] **Paso 2:** `src/app/admin/dm-links/page.jsx`:

```jsx
import { cookies } from "next/headers";
import { COOKIE, sesionValida } from "../lib/sesion.js";
import { conRedis } from "../lib/instagram/conexion.js";
import { listaDm } from "../lib/instagram/dm.js";

export const dynamic = "force-dynamic";
const fecha = (iso) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

export default async function LinksDm() {
  if (!sesionValida((await cookies()).get(COOKIE)?.value, process.env.ADMIN_CLAVE, Date.now())) return null;
  let lista = [], error = "";
  try { lista = await conRedis(listaDm); } catch { error = "No pude leer la cola."; }
  return (
    <section>
      <a href="/admin" className="text-sm underline">← Admin</a>
      <h1 className="mt-2 text-2xl font-black">Links por DM</h1>
      <p className="mt-1 text-sm opacity-70">Reels y links que la comunidad le manda a elmetacho_. El PC los baja en la franja de las 5 a. m. y van a la Cabina si pasan el filtro.</p>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {!error && !lista.length && <p className="mt-4">Todavía no llega ninguno.</p>}
      <ul className="mt-4 space-y-2">
        {lista.map((x) => (
          <li key={x.link} className="rounded-lg border p-3 text-sm">
            <a href={x.link} target="_blank" rel="noreferrer" className="break-all underline">{x.link}</a>
            <div className="mt-1 opacity-70">Llegó {fecha(x.recibido)} · {x.entregado ? `en el PC desde ${fecha(x.entregado)}` : "esperando al PC"}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Paso 3:** en `src/app/admin/page.jsx`, dentro del elemento raíz que devuelve `Admin()`, como primer hijo, añadir:

```jsx
<nav className="mb-4 flex gap-4 text-sm underline">
  <a href="/admin/dm-links">Links por DM</a>
  <a href="/admin/palabras">Palabras clave</a>
</nav>
```

(el enlace a `/admin/palabras` da 404 hasta el Bloque C; es aceptable porque el PR del Bloque A y el del C salen el mismo día. Si no, quitarlo en este PR y añadirlo en la Tarea 8.)

- [ ] **Paso 4:** en `docs/admin.md` añadir a la tabla de API:

```md
| `GET /admin/api/pc/dm-links` | Solo PC | `{links}`: links de DM aún no confirmados, más viejo primero (no marca nada) |
| `POST /admin/api/pc/dm-links/recibidos` | Solo PC | `{links}` → los marca entregados (`cabina:dm:entregados`) → `{ok, confirmados}` |
```

y a la tabla de variables `IG_CUENTA_CABINA` / `IG_CUENTA_PALABRAS` (Vercel Production; ids de elmetacho_ y metacholabs).

- [ ] **Paso 5:** `npm test`, `npx eslint src`, `npm run build` → sin errores; el build lista `/admin/dm-links`, `/admin/api/pc/dm-links`, `/admin/api/pc/dm-links/recibidos`.
- [ ] **Paso 6: commit** `git add src/app/admin docs/admin.md && git commit -m "Admin: links de DM para el PC (dos pasos) y página «Links por DM»"`
- [ ] **Paso 7:** Oscar pega `IG_CUENTA_CABINA` y `IG_CUENTA_PALABRAS` en Vercel, hace push, PR, merge. Comprobar en vivo: `curl -s -o /dev/null -w "%{http_code}" https://www.elmetacho.com/admin/api/pc/dm-links` → `401`.

## Bloque B: el PC baja la cola (repo `PREMIERE-CLAUDE/cantados`)

### Tarea 4: `pasada leer` agrega los links de DM a `PENDIENTES.txt`

**Antes de tocar nada:** mandar un mensaje a la sesión «cantados-instagram» (`local_966fafa1-904f-43f8-9d52-2037a05896de`) avisando que se agregan `dm_links()` / `dm_links_recibidos()` a `herramientas/web.py` y la fase `_links_de_dm` a `leer` en `herramientas/pasada.py`, y preguntar si conviene hacerlo en su rama o en `main` de cantados. No editar mientras una pasada corra (`list_sessions`).

**Archivos:**
- Modificar: `herramientas/web.py` (dos funciones nuevas al final del bloque de la Cabina), `herramientas/pasada.py` (fase nueva en `leer`)
- Crear: `tests/test_links_dm.py`

**Interfaces:**
- Consume: contrato web de la Tarea 3; `links_telegram.agregar_pendientes(pendientes, links, vistos_txt) → n`.
- Produce: `web.dm_links() → [str]`, `web.dm_links_recibidos(links)`, `pasada._links_de_dm(informe)`.

- [ ] **Paso 1: prueba que falla** — `tests/test_links_dm.py`:

```python
"""Links que la comunidad manda por DM a elmetacho_ → PENDIENTES.txt (spec web 2026-10-25 §4.2)."""
from herramientas import pasada, web


def _cfg(tmp_path):
    return {"pendientes": str(tmp_path / "PENDIENTES.txt")}


def test_agrega_y_confirma(tmp_path, monkeypatch):
    monkeypatch.setattr(pasada.config, "cargar", lambda: _cfg(tmp_path))
    monkeypatch.setattr(web, "dm_links", lambda: ["https://vt.tiktok.com/A/", "https://www.instagram.com/reel/B/"])
    confirmados = []
    monkeypatch.setattr(web, "dm_links_recibidos", lambda links: confirmados.extend(links))
    informe = []
    pasada._links_de_dm(informe)
    assert (tmp_path / "PENDIENTES.txt").read_text(encoding="utf-8").split() == ["https://vt.tiktok.com/A/", "https://www.instagram.com/reel/B/"]
    assert confirmados == ["https://vt.tiktok.com/A/", "https://www.instagram.com/reel/B/"]
    assert informe == ["Links por DM: 2 recibido(s), 2 nuevo(s) en PENDIENTES.txt"]


def test_si_no_confirmo_la_vez_pasada_no_duplica(tmp_path, monkeypatch):
    (tmp_path / "PENDIENTES.txt").write_text("https://vt.tiktok.com/A/\n", encoding="utf-8")
    monkeypatch.setattr(pasada.config, "cargar", lambda: _cfg(tmp_path))
    monkeypatch.setattr(web, "dm_links", lambda: ["https://vt.tiktok.com/A/"])
    monkeypatch.setattr(web, "dm_links_recibidos", lambda links: None)
    pasada._links_de_dm([])
    assert (tmp_path / "PENDIENTES.txt").read_text(encoding="utf-8").split() == ["https://vt.tiktok.com/A/"]


def test_web_caida_no_tumba_la_pasada(tmp_path, monkeypatch):
    monkeypatch.setattr(pasada.config, "cargar", lambda: _cfg(tmp_path))

    def cae():
        raise web.ErrorWeb("GET /admin/api/pc/dm-links: timed out")
    monkeypatch.setattr(web, "dm_links", cae)
    informe = []
    pasada._links_de_dm(informe)
    assert informe and informe[0].startswith("No pude bajar los links por DM")
    assert not (tmp_path / "PENDIENTES.txt").exists()
```

- [ ] **Paso 2:** `python -m pytest tests/test_links_dm.py -q` → FALLA (`_links_de_dm` no existe).

- [ ] **Paso 3: implementar.** En `herramientas/web.py`, después de `cabina_entregado`:

```python
def dm_links():
    """Links que la comunidad mandó por DM a elmetacho_ y el PC aún no confirmó (más viejo primero)."""
    r = _llamar("GET", "/admin/api/pc/dm-links")
    if not isinstance(r, dict) or not isinstance(r.get("links"), list):
        raise ErrorWeb("respuesta inesperada de los links por DM")
    return [l for l in r["links"] if isinstance(l, str) and l]


def dm_links_recibidos(links):
    _llamar("POST", "/admin/api/pc/dm-links/recibidos", {"links": list(links)})
```

En `herramientas/pasada.py`, junto a `_links_del_bot`:

```python
def _links_de_dm(informe):
    """Links que la comunidad manda por DM a elmetacho_ (webhook de Instagram) → PENDIENTES.txt. Se confirma a la web
    solo después de escribirlos; si el PC se cae antes, vuelven mañana y agregar_pendientes no los repite."""
    from . import links_telegram
    try:
        links = web.dm_links()
    except web.ErrorWeb as e:
        informe.append(f"No pude bajar los links por DM: {e} (se reintenta en la próxima franja)")
        return
    if not links:
        return
    cfg = config.cargar()
    nuevos = links_telegram.agregar_pendientes(cfg["pendientes"], links, Path(cfg["pendientes"]).with_name("VISTOS.txt"))
    try:
        web.dm_links_recibidos(links)
    except web.ErrorWeb as e:
        informe.append(f"No pude confirmar los links por DM a la web: {e} (vuelven mañana sin repetirse)")
    informe.append(f"Links por DM: {len(links)} recibido(s), {nuevos} nuevo(s) en PENDIENTES.txt")
```

y en `leer`, en la tupla de fases, añadir `lambda: _links_de_dm(informe)` justo después de `lambda: _links_del_bot(informe)`.

- [ ] **Paso 4:** `python -m pytest tests/test_links_dm.py -q` → 3 PASAN; `python -m pytest -q` → todo PASA (anotar el total).
- [ ] **Paso 5:** actualizar `docs/runbook-pasada.md` §1 (una línea: «`leer` también baja los links que la comunidad manda por DM a elmetacho_ (webhook de Instagram en elmetacho.com) y los agrega a `PENDIENTES.txt`») y `BITACORA-CANTADOS.md` §0.
- [ ] **Paso 6: commit** en cantados: `git add herramientas/web.py herramientas/pasada.py tests/test_links_dm.py docs/runbook-pasada.md BITACORA-CANTADOS.md && git commit -m "feat: leer baja los links por DM de Instagram a PENDIENTES.txt"`

## Bloque C (PR 2): palabras clave en metacholabs

Rama: `feat/instagram-palabras-clave` desde `origin/main` (con el Bloque A ya fusionado).

### Tarea 5: palabras clave (coincidencia, validación y guardado)

**Archivos:**
- Crear: `src/app/admin/lib/instagram/palabras.js`, `src/app/admin/lib/instagram/palabras.test.js`

**Interfaces:**
- Consume: `clave` (Tarea 1).
- Produce: `buscarDisparador(texto, disparadores) → disparador|null`; `esRespuestaPropia(texto, disparadores) → bool`; `validarDisparadores(lista, nuevoId) → { disparadores, errores }`; `leerDisparadores(r, cuenta) → []`; `guardarDisparadores(r, cuenta, disparadores)`. Disparador: `{ id, palabra, respuesta_publica, mensaje_dm, link, pedir_seguir, activa }`.

- [ ] **Paso 1: prueba que falla** — `palabras.test.js`:

```js
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
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/instagram/palabras.test.js` → FALLA.

- [ ] **Paso 3: implementar** `palabras.js`:

```js
// palabras.js — disparadores por palabra clave (spec 2026-10-25 §4.3). Coincide la palabra o frase completa,
// sin mayúsculas ni tildes ni signos; la primera activa de la lista gana.
import { clave } from "./claves.js";

const MAX = 50;
const normal = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const tokens = (s) => (normal(s).match(/[\p{L}\p{N}]+/gu) ?? []).join(" ");

export function buscarDisparador(texto, disparadores) {
  const t = ` ${tokens(texto)} `;
  return disparadores.find((d) => { const p = tokens(d.palabra); return d.activa && p && t.includes(` ${p} `); }) ?? null;
}

// La respuesta pública de la cuenta vuelve como comentario nuevo: si es idéntica a una configurada, no se responde.
export function esRespuestaPropia(texto, disparadores) {
  const t = normal(texto).trim();
  return disparadores.some((d) => normal(d.respuesta_publica).trim() === t);
}

const texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validarDisparadores(lista, nuevoId) {
  if (!Array.isArray(lista) || lista.length > MAX) return { disparadores: [], errores: ["La lista no es válida."] };
  const errores = [], vistas = new Set(), disparadores = [];
  lista.forEach((x, k) => {
    const n = `#${k + 1}`;
    const d = {
      id: texto(x?.id, 40) || nuevoId(),
      palabra: texto(x?.palabra, 40),
      respuesta_publica: texto(x?.respuesta_publica, 300),
      mensaje_dm: texto(x?.mensaje_dm, 900),
      link: texto(x?.link, 500),
      pedir_seguir: Boolean(x?.pedir_seguir),
      activa: x?.activa !== false,
    };
    if (!tokens(d.palabra)) errores.push(`${n}: falta la palabra clave.`);
    else if (vistas.has(tokens(d.palabra))) errores.push(`${n}: palabra repetida («${d.palabra}»).`);
    vistas.add(tokens(d.palabra));
    if (!d.respuesta_publica || !d.mensaje_dm) errores.push(`${n}: faltan la respuesta pública o el mensaje del DM.`);
    let url = null;
    try { url = new URL(d.link); } catch { /* se avisa abajo */ }
    if (url?.protocol !== "https:") errores.push(`${n}: el link debe empezar por https://`);
    if (Buffer.byteLength(`${d.mensaje_dm}\n${d.link}`, "utf8") > 1000) errores.push(`${n}: el mensaje con el link pasa de 1000 bytes (límite de Instagram).`);
    disparadores.push(d);
  });
  return { disparadores: errores.length ? [] : disparadores, errores };
}

export async function leerDisparadores(r, cuenta) {
  const v = await r.get(clave(cuenta, "disparadores"));
  return v ? JSON.parse(v) : [];
}

export async function guardarDisparadores(r, cuenta, disparadores) {
  await r.set(clave(cuenta, "disparadores"), JSON.stringify(disparadores));
}
```

- [ ] **Paso 4:** `node --test src/app/admin/lib/instagram/palabras.test.js` → PASA (si falla «me da el cursooo», revisar que `tokens` separe por palabra completa).
- [ ] **Paso 5: commit** `git add src/app/admin/lib/instagram/palabras* && git commit -m "Instagram: palabras clave (coincidencia, validación y guardado por cuenta)"`

### Tarea 6: cliente de Meta, token y avisos

**Archivos:**
- Crear: `src/app/admin/lib/instagram/graph.js`, `src/app/admin/lib/instagram/estado.js`, `src/app/admin/lib/instagram/token.js`, `src/app/admin/lib/instagram/graph.test.js`, `src/app/admin/lib/instagram/token.test.js`
- Crear: `src/app/api/instagram/renovar-token/route.js`, `vercel.json`
- Modificar: `src/app/admin/lib/deps.js` (exportar `avisar`)

**Interfaces:**
- Consume: `clave`, `redisMemoria` (Tarea 1).
- Produce: `crearGraph({ token, fetch }) → { responderComentario(id, texto), privado(cuenta, comentarioId, message), mensaje(cuenta, usuario, message), sigue(usuario) → bool }`; `ErrorMeta(mensaje, codigo)`; `tokenInvalido(e) → bool`; `renovarToken(token, fetch) → { access_token, expires_in }`; `tokenDe(r, env, cuenta) → string|null`; `renovarSiHaceFalta({ r, env, cuenta, ahora, renovar, avisar }) → "vigente"|"renovado"|"sin token"|"error"`; `enPausa(r, cuenta)`; `crearManejoDeError({ r, cuenta, ahora, avisar }) → async (e) → void`.

- [ ] **Paso 1: pruebas que fallan** — `graph.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearGraph, ErrorMeta, renovarToken, tokenInvalido } from "./graph.js";

function fetchFalso(respuestas) {
  const llamadas = [];
  const f = async (url, init = {}) => {
    llamadas.push({ url, metodo: init.method || "GET", auth: init.headers?.Authorization, cuerpo: init.body ? JSON.parse(init.body) : null });
    const [status, d] = respuestas.shift() ?? [200, {}];
    return { ok: status < 400, status, json: async () => d };
  };
  return { f, llamadas };
}

test("respuesta pública, respuesta privada, mensaje y seguimiento", async () => {
  const { f, llamadas } = fetchFalso([[200, { id: "r1" }], [200, {}], [200, {}], [200, { is_user_follow_business: true }]]);
  const g = crearGraph({ token: "T", fetch: f });
  await g.responderComentario("c1", "¡Enviado!");
  await g.privado("222", "c1", { text: "hola" });
  await g.mensaje("222", "u9", { text: "link" });
  assert.equal(await g.sigue("u9"), true);
  assert.equal(llamadas[0].url, "https://graph.instagram.com/v26.0/c1/replies?message=%C2%A1Enviado!");
  assert.equal(llamadas[0].metodo, "POST");
  assert.equal(llamadas[0].auth, "Bearer T");
  assert.deepEqual(llamadas[1].cuerpo, { recipient: { comment_id: "c1" }, message: { text: "hola" } });
  assert.deepEqual(llamadas[2].cuerpo, { recipient: { id: "u9" }, message: { text: "link" } });
  assert.equal(llamadas[3].url, "https://graph.instagram.com/v26.0/u9?fields=is_user_follow_business");
});

test("errores de Meta con su código; 190 = token inválido", async () => {
  const { f } = fetchFalso([[400, { error: { message: "Invalid OAuth access token", code: 190 } }], [400, { error: { message: "otro", code: 10 } }]]);
  const g = crearGraph({ token: "T", fetch: f });
  await assert.rejects(g.privado("222", "c1", { text: "x" }), (e) => e instanceof ErrorMeta && tokenInvalido(e));
  await assert.rejects(g.sigue("u"), (e) => e instanceof ErrorMeta && !tokenInvalido(e));
});

test("renovar el token", async () => {
  const { f, llamadas } = fetchFalso([[200, { access_token: "N", token_type: "bearer", expires_in: 5184000 }]]);
  assert.deepEqual(await renovarToken("V", f), { access_token: "N", expires_in: 5184000 });
  assert.equal(llamadas[0].url, "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=V");
});
```

`token.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { redisMemoria } from "./redis-memoria.js";
import { renovarSiHaceFalta, tokenDe } from "./token.js";
import { crearManejoDeError, enPausa } from "./estado.js";
import { ErrorMeta } from "./graph.js";

const DIA = 86400e3;
const env = { IG_CUENTA_PALABRAS: "222", IG_TOKEN_LABS: "V" };

test("token: Redis gana sobre la variable; otra cuenta no tiene", async () => {
  const r = redisMemoria();
  assert.equal(await tokenDe(r, env, "222"), "V");
  assert.equal(await tokenDe(r, env, "111"), null);
  await r.set("ig:222:token", JSON.stringify({ token: "N", vence: 1 }));
  assert.equal(await tokenDe(r, env, "222"), "N");
});

test("renovar: vigente no llama; cerca de vencer renueva; error avisa con explicación", async () => {
  const r = redisMemoria(), avisos = [], ahora = () => 1000 * DIA;
  let llamadas = 0;
  const renovar = async () => { llamadas++; return { access_token: "N", expires_in: 60 * 86400 }; };
  assert.equal(await renovarSiHaceFalta({ r, env, cuenta: "222", ahora, renovar, avisar: async (t) => avisos.push(t) }), "renovado");
  assert.equal(JSON.parse(await r.get("ig:222:token")).token, "N");
  assert.equal(await renovarSiHaceFalta({ r, env, cuenta: "222", ahora, renovar, avisar: async (t) => avisos.push(t) }), "vigente");
  assert.equal(llamadas, 1);
  const falla = async () => { throw new Error("token demasiado nuevo"); };
  assert.equal(await renovarSiHaceFalta({ r: redisMemoria(), env, cuenta: "222", ahora, renovar: falla, avisar: async (t) => avisos.push(t) }), "error");
  assert.match(avisos.at(-1), /menos de 24 h/);
  assert.equal(await renovarSiHaceFalta({ r: redisMemoria(), env: {}, cuenta: "222", ahora, renovar, avisar: async (t) => avisos.push(t) }), "sin token");
});

test("errores: token inválido pausa 6 h y borra el token guardado; 3 fallos en una hora avisan una vez", async () => {
  const reloj = { t: 0 }, r = redisMemoria(() => reloj.t), avisos = [];
  const manejar = crearManejoDeError({ r, cuenta: "222", ahora: () => reloj.t, avisar: async (t) => avisos.push(t) });
  await r.set("ig:222:token", JSON.stringify({ token: "N", vence: 1 }));
  await manejar(new ErrorMeta("Invalid OAuth", 190));
  await manejar(new ErrorMeta("Invalid OAuth", 190));
  assert.equal(await enPausa(r, "222"), true);
  assert.equal(await r.get("ig:222:token"), null);
  assert.equal(avisos.length, 1);
  reloj.t = 6 * 3600e3 + 1;
  assert.equal(await enPausa(r, "222"), false);
  for (let k = 0; k < 4; k++) await manejar(new ErrorMeta("otro", 10));
  assert.equal(avisos.length, 2);
  assert.match(avisos[1], /3 fallos/);
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/instagram/graph.test.js src/app/admin/lib/instagram/token.test.js` → FALLA.

- [ ] **Paso 3: implementar** `graph.js`:

```js
// graph.js — llamadas a la Graph API de Instagram (Instagram Login), con fetch inyectable para las pruebas.
// Doc (2026-10-25): host graph.instagram.com, Authorization: Bearer; respuesta privada con recipient.comment_id;
// is_user_follow_business solo tras un mensaje del usuario; refresh_access_token con ig_refresh_token.
const BASE = "https://graph.instagram.com/v26.0";
const PLAZO = 8000;

export class ErrorMeta extends Error {
  constructor(mensaje, codigo) { super(mensaje); this.codigo = codigo; }
}
export const tokenInvalido = (e) => e instanceof ErrorMeta && e.codigo === 190;

async function leer(r) {
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d?.error) throw new ErrorMeta(d?.error?.message || `HTTP ${r.status}`, d?.error?.code ?? null);
  return d;
}

export function crearGraph({ token, fetch: f = fetch }) {
  const llamar = async (metodo, ruta, cuerpo) => leer(await f(`${BASE}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(PLAZO),
  }));
  return {
    responderComentario: (id, texto) => llamar("POST", `/${id}/replies?message=${encodeURIComponent(texto)}`),
    privado: (cuenta, comentarioId, message) => llamar("POST", `/${cuenta}/messages`, { recipient: { comment_id: comentarioId }, message }),
    mensaje: (cuenta, usuario, message) => llamar("POST", `/${cuenta}/messages`, { recipient: { id: usuario }, message }),
    sigue: async (usuario) => (await llamar("GET", `/${usuario}?fields=is_user_follow_business`)).is_user_follow_business === true,
  };
}

export async function renovarToken(token, f = fetch) {
  const d = await leer(await f(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(PLAZO) }));
  return { access_token: d.access_token, expires_in: Number(d.expires_in) };
}
```

`estado.js`:

```js
// estado.js — pausa (token inválido o faltante) y conteo de fallos por hora, con avisos por Telegram (spec §6).
import { clave } from "./claves.js";
import { tokenInvalido } from "./graph.js";

const PAUSA_S = 6 * 3600;

export const enPausa = async (r, cuenta) => Boolean(await r.get(clave(cuenta, "pausa")));

export async function pausar(r, cuenta, avisar, motivo) {
  await r.del(clave(cuenta, "token"));   // la próxima vez se usa IG_TOKEN_LABS (el que Oscar pegue nuevo)
  const nueva = await r.set(clave(cuenta, "pausa"), "1", { condition: "NX", expiration: { type: "EX", value: PAUSA_S } });
  if (nueva) await avisar(`⚠️ Instagram (${cuenta}): palabras clave en pausa 6 h — ${motivo}. Genera un token nuevo en Meta y pégalo en Vercel como IG_TOKEN_LABS.`);
}

export function crearManejoDeError({ r, cuenta, ahora, avisar }) {
  return async (e) => {
    console.error(`instagram ${cuenta}:`, e?.message);
    if (tokenInvalido(e)) return pausar(r, cuenta, avisar, "el token no sirve");
    const k = clave(cuenta, "fallos", new Date(ahora()).toISOString().slice(0, 13));
    const n = await r.incr(k);
    if (n === 1) await r.expire(k, 7200);
    if (n === 3) await avisar(`⚠️ Instagram (${cuenta}): 3 fallos en una hora al responder. Último: ${e?.message}`);
  };
}
```

`token.js`:

```js
// token.js — token de la cuenta de palabras clave (spec §4.6): el renovado en Redis gana sobre IG_TOKEN_LABS.
import { clave } from "./claves.js";

const DIA = 86400e3;

export async function tokenDe(r, env, cuenta) {
  const g = await r.get(clave(cuenta, "token"));
  if (g) return JSON.parse(g).token;
  return cuenta === env.IG_CUENTA_PALABRAS ? env.IG_TOKEN_LABS || null : null;
}

export async function renovarSiHaceFalta({ r, env, cuenta, ahora, renovar, avisar }) {
  const g = await r.get(clave(cuenta, "token"));
  const guardado = g ? JSON.parse(g) : null;
  if (guardado && guardado.vence - ahora() > 15 * DIA) return "vigente";
  const actual = guardado?.token || (cuenta === env.IG_CUENTA_PALABRAS ? env.IG_TOKEN_LABS : null);
  if (!actual) { await avisar(`⚠️ Instagram (${cuenta}): falta el token (IG_TOKEN_LABS en Vercel).`); return "sin token"; }
  try {
    const n = await renovar(actual);
    await r.set(clave(cuenta, "token"), JSON.stringify({ token: n.access_token, vence: ahora() + n.expires_in * 1000 }));
    return "renovado";
  } catch (e) {
    await avisar(`⚠️ Instagram (${cuenta}): no pude renovar el token (${e.message}). Si lo generaste en Meta hace menos de 24 h es normal: sigue sirviendo y mañana se reintenta.`);
    return "error";
  }
}
```

En `src/app/admin/lib/deps.js`, cambiar `async function avisar(texto) {` por `export async function avisar(texto) {`.

`src/app/api/instagram/renovar-token/route.js`:

```js
// Cron diario de Vercel (vercel.json): renueva el token de metacholabs si le faltan menos de 15 días.
// Vercel manda Authorization: Bearer <CRON_SECRET> cuando la variable existe.
import { avisar } from "../../../admin/lib/deps.js";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { renovarToken } from "../../../admin/lib/instagram/graph.js";
import { renovarSiHaceFalta } from "../../../admin/lib/instagram/token.js";

export const runtime = "nodejs";

export async function GET(req) {
  const s = process.env.CRON_SECRET;
  if (!s || req.headers.get("authorization") !== `Bearer ${s}`) return new Response("No autorizado", { status: 401 });
  const cuenta = process.env.IG_CUENTA_PALABRAS;
  if (!cuenta) return Response.json({ estado: "sin cuenta" });
  const estado = await conRedis((r) => renovarSiHaceFalta({ r, env: process.env, cuenta, ahora: Date.now, renovar: renovarToken, avisar }));
  return Response.json({ estado });
}
```

`vercel.json` (13:00 UTC = 8:00 a. m. en Colombia):

```json
{
  "crons": [{ "path": "/api/instagram/renovar-token", "schedule": "0 13 * * *" }]
}
```

- [ ] **Paso 4:** antes de dar por buena la autorización del cron, verificar en la documentación actual de Vercel («Securing cron jobs») que sigue mandando `Authorization: Bearer <CRON_SECRET>`; si cambió, ajustar la ruta y anotar la fuente en el comentario.
- [ ] **Paso 5:** `npm test` → PASA.
- [ ] **Paso 6: commit** `git add src/app/admin/lib/instagram src/app/admin/lib/deps.js src/app/api/instagram/renovar-token vercel.json && git commit -m "Instagram: cliente de Meta, token renovado por cron y avisos de fallos"`

### Tarea 7: atender comentarios y «Ya te sigo», conectado al receptor

**Archivos:**
- Crear: `src/app/admin/lib/instagram/automatizacion.js`, `src/app/admin/lib/instagram/automatizacion.test.js`
- Modificar: `src/app/api/instagram/webhook/route.js`

**Interfaces:**
- Consume: `buscarDisparador`, `esRespuestaPropia`, `leerDisparadores` (T5); `crearGraph`, `crearManejoDeError`, `enPausa`, `pausar`, `tokenDe` (T6); acciones `comentario`/`mensaje` de `repartir` (T2).
- Produce: `atenderComentario(deps, accion) → "propio"|"pausa"|"sin palabra"|"repetido"|"enviado"|"fallo"`; `atenderMensaje(deps, accion) → "sin espera"|"pausa"|"sin disparador"|"enviado"|"no sigue"|"fallo"`; `deps = { r, graph, disparadores, fallo }`; constantes `BOTON = "Ya te sigo"`, `PAYLOAD = "YA_TE_SIGO"`.

- [ ] **Paso 1: prueba que falla** — `automatizacion.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { redisMemoria } from "./redis-memoria.js";
import { atenderComentario, atenderMensaje, BOTON } from "./automatizacion.js";

const curso = { id: "d1", palabra: "curso", respuesta_publica: "¡Enviado! Revisa tu DM 📩", mensaje_dm: "Aquí está el curso", link: "https://mlabs.elmetacho.com/recursos/curso", pedir_seguir: false, activa: true };
const conSeguir = { ...curso, id: "d2", palabra: "guia", pedir_seguir: true };

function montar({ sigue = true, falla = null } = {}) {
  const llamadas = [], fallos = [];
  const graph = {
    responderComentario: async (id, t) => { if (falla === "publica") throw new Error("no se puede"); llamadas.push(["publica", id, t]); },
    privado: async (c, id, m) => { if (falla === "privado") throw new Error("7 días"); llamadas.push(["privado", id, m]); },
    mensaje: async (c, u, m) => llamadas.push(["mensaje", u, m]),
    sigue: async () => sigue,
  };
  return { deps: { r: redisMemoria(), graph, disparadores: [curso, conSeguir], fallo: async (e) => fallos.push(e.message) }, llamadas, fallos };
}
const com = (texto, extra = {}) => ({ tipo: "comentario", cuenta: "222", id: "c1", usuario: "u1", texto, ...extra });

test("comentario con palabra: respuesta pública y DM con el link; repetido no responde dos veces", async () => {
  const { deps, llamadas } = montar();
  assert.equal(await atenderComentario(deps, com("quiero el CURSO")), "enviado");
  assert.deepEqual(llamadas, [
    ["publica", "c1", "¡Enviado! Revisa tu DM 📩"],
    ["privado", "c1", { text: "Aquí está el curso\nhttps://mlabs.elmetacho.com/recursos/curso" }],
  ]);
  assert.equal(await atenderComentario(deps, com("quiero el CURSO")), "repetido");
  assert.equal(llamadas.length, 2);
});

test("no se responde a sí misma (por id ni por texto igual a la respuesta) ni a comentarios sin palabra", async () => {
  const { deps, llamadas } = montar();
  deps.disparadores = [{ ...curso, respuesta_publica: "Te envié el curso 📩" }];   // la respuesta contiene la palabra
  assert.equal(await atenderComentario(deps, com("curso", { usuario: "222" })), "propio");
  assert.equal(await atenderComentario(deps, com("Te envié el curso 📩", { id: "c9", usuario: "u7" })), "sin palabra");
  assert.equal(await atenderComentario(deps, com("qué bonito", { id: "c8" })), "sin palabra");
  assert.equal(llamadas.length, 0);
});

test("si falla la respuesta pública igual va el DM; si falla el DM se anota", async () => {
  const a = montar({ falla: "publica" });
  assert.equal(await atenderComentario(a.deps, com("curso")), "enviado");
  assert.equal(a.llamadas[0][0], "privado");
  assert.deepEqual(a.fallos, ["no se puede"]);
  const b = montar({ falla: "privado" });
  assert.equal(await atenderComentario(b.deps, com("curso")), "fallo");
  assert.deepEqual(b.fallos, ["7 días"]);
});

test("pedir que siga: botón, y al escribir revisa si sigue", async () => {
  const { deps, llamadas } = montar({ sigue: false });
  assert.equal(await atenderComentario(deps, com("la guía")), "enviado");
  assert.equal(llamadas[1][2].quick_replies[0].title, BOTON);
  const msg = { tipo: "mensaje", cuenta: "222", usuario: "u1", payload: "YA_TE_SIGO" };
  assert.equal(await atenderMensaje(deps, msg), "no sigue");
  assert.match(llamadas[2][2].text, /Aún no me sigues/);
  deps.graph.sigue = async () => true;
  assert.equal(await atenderMensaje(deps, { ...msg, payload: null }), "enviado");   // cualquier mensaje sirve
  assert.deepEqual(llamadas[3], ["mensaje", "u1", { text: "Aquí está el curso\nhttps://mlabs.elmetacho.com/recursos/curso" }]);
  assert.equal(await atenderMensaje(deps, msg), "sin espera");
});

test("en pausa no responde nada", async () => {
  const { deps, llamadas } = montar();
  await deps.r.set("ig:222:pausa", "1");
  assert.equal(await atenderComentario(deps, com("curso")), "pausa");
  assert.equal(llamadas.length, 0);
});
```

- [ ] **Paso 2:** `node --test src/app/admin/lib/instagram/automatizacion.test.js` → FALLA.

- [ ] **Paso 3: implementar** `automatizacion.js`:

```js
// automatizacion.js — comentario con palabra clave → respuesta pública + respuesta privada; «Ya te sigo» → link
// (spec 2026-10-25 §4.4–4.5). La doc de Meta no dice si una respuesta privada admite botones: por eso cualquier
// mensaje del usuario con espera vigente cuenta como «Ya te sigo».
import { clave } from "./claves.js";
import { enPausa } from "./estado.js";
import { buscarDisparador, esRespuestaPropia } from "./palabras.js";

export const BOTON = "Ya te sigo";
export const PAYLOAD = "YA_TE_SIGO";
const DIA_S = 86400;
const conBoton = (text) => ({ text, quick_replies: [{ content_type: "text", title: BOTON, payload: PAYLOAD }] });
const conLink = (d) => ({ text: `${d.mensaje_dm}\n${d.link}` });

export async function atenderComentario({ r, graph, disparadores, fallo }, a) {
  if (!a.id || !a.usuario || a.usuario === a.cuenta) return "propio";
  if (await enPausa(r, a.cuenta)) return "pausa";
  const d = buscarDisparador(a.texto, disparadores);
  if (!d || esRespuestaPropia(a.texto, disparadores)) return "sin palabra";
  const nuevo = await r.set(clave(a.cuenta, "respondido", a.id), "1", { condition: "NX", expiration: { type: "EX", value: 8 * DIA_S } });
  if (!nuevo) return "repetido";
  try {
    await graph.responderComentario(a.id, d.respuesta_publica);
  } catch (e) {
    await fallo(e);   // p. ej. es respuesta a otro comentario: igual va el DM
  }
  try {
    if (d.pedir_seguir) {
      await graph.privado(a.cuenta, a.id, conBoton("Para recibirlo, sígueme y toca 👇"));
      await r.set(clave(a.cuenta, "esperando", a.usuario), d.id, { expiration: { type: "EX", value: DIA_S } });
    } else {
      await graph.privado(a.cuenta, a.id, conLink(d));
    }
    return "enviado";
  } catch (e) {
    await fallo(e);
    return "fallo";
  }
}

export async function atenderMensaje({ r, graph, disparadores, fallo }, a) {
  const k = clave(a.cuenta, "esperando", a.usuario);
  const idD = a.usuario ? await r.get(k) : null;
  if (!idD) return "sin espera";
  if (await enPausa(r, a.cuenta)) return "pausa";
  const d = disparadores.find((x) => x.id === idD);
  if (!d) { await r.del(k); return "sin disparador"; }
  try {
    if (await graph.sigue(a.usuario)) {
      await graph.mensaje(a.cuenta, a.usuario, conLink(d));
      await r.del(k);
      return "enviado";
    }
    await graph.mensaje(a.cuenta, a.usuario, conBoton("Aún no me sigues 🙂 Sígueme y vuelve a tocar el botón"));
    return "no sigue";
  } catch (e) {
    await fallo(e);
    return "fallo";
  }
}
```

- [ ] **Paso 4:** en `route.js`, dentro del `for (const a of acciones)` de `conRedis`, añadir después del caso `links`:

```js
        if (a.tipo === "comentario" || a.tipo === "mensaje") {
          const fallo = crearManejoDeError({ r, cuenta: a.cuenta, ahora: Date.now, avisar });
          const token = await tokenDe(r, process.env, a.cuenta);
          if (!token) { await pausar(r, a.cuenta, avisar, "falta IG_TOKEN_LABS"); continue; }
          const deps = { r, graph: crearGraph({ token }), disparadores: await leerDisparadores(r, a.cuenta), fallo };
          const res = a.tipo === "comentario" ? await atenderComentario(deps, a) : await atenderMensaje(deps, a);
          console.log(`webhook instagram: ${a.tipo} → ${res}`);
        }
```

con los imports:

```js
import { avisar } from "../../../admin/lib/deps.js";
import { atenderComentario, atenderMensaje } from "../../../admin/lib/instagram/automatizacion.js";
import { crearManejoDeError, pausar } from "../../../admin/lib/instagram/estado.js";
import { crearGraph } from "../../../admin/lib/instagram/graph.js";
import { leerDisparadores } from "../../../admin/lib/instagram/palabras.js";
import { tokenDe } from "../../../admin/lib/instagram/token.js";
```

(el log nunca incluye el texto del comentario ni el usuario: privacidad, spec §5).

- [ ] **Paso 5:** `npm test` → PASA; `npx eslint src` limpio.
- [ ] **Paso 6: commit** `git add src/app/admin/lib/instagram/automatizacion* src/app/api/instagram/webhook/route.js && git commit -m "Instagram: respuesta a palabras clave y «Ya te sigo» en el receptor"`

### Tarea 8: /admin → «Palabras clave»

**Archivos:**
- Crear: `src/app/admin/api/palabras/route.js`, `src/app/admin/palabras/page.jsx`, `src/app/admin/palabras/Palabras.jsx`
- Modificar: `docs/admin.md`

**Interfaces:**
- Consume: `validarDisparadores`, `leerDisparadores`, `guardarDisparadores` (T5); `enPausa` (T6); `conRedis` (T1); `sesionValida`, `leerCookie`, `COOKIE` (sesion.js).
- Produce: `GET /admin/api/palabras` → `{ cuenta, disparadores, pausa }`; `PUT /admin/api/palabras` con `{ disparadores }` → `{ disparadores }` o 400 `{ error }`; ambas con sesión, si no 401.

- [ ] **Paso 1:** `src/app/admin/api/palabras/route.js`:

```js
// Palabras clave de la cuenta de la agencia (IG_CUENTA_PALABRAS). Con sesión del admin. PUT reemplaza la lista completa.
import { randomUUID } from "node:crypto";
import { COOKIE, leerCookie, sesionValida } from "../../lib/sesion.js";
import { conRedis } from "../../lib/instagram/conexion.js";
import { enPausa } from "../../lib/instagram/estado.js";
import { guardarDisparadores, leerDisparadores, validarDisparadores } from "../../lib/instagram/palabras.js";

export const runtime = "nodejs";
const conSesion = (req) => sesionValida(leerCookie(req.headers.get("cookie"), COOKIE), process.env.ADMIN_CLAVE, Date.now());
const NO = () => Response.json({ error: "No autorizado." }, { status: 401 });

export async function GET(req) {
  if (!conSesion(req)) return NO();
  const cuenta = process.env.IG_CUENTA_PALABRAS;
  if (!cuenta) return Response.json({ error: "Falta IG_CUENTA_PALABRAS en Vercel." }, { status: 500 });
  return Response.json(await conRedis(async (r) => ({ cuenta, disparadores: await leerDisparadores(r, cuenta), pausa: await enPausa(r, cuenta) })));
}

export async function PUT(req) {
  if (!conSesion(req)) return NO();
  const cuenta = process.env.IG_CUENTA_PALABRAS;
  if (!cuenta) return Response.json({ error: "Falta IG_CUENTA_PALABRAS en Vercel." }, { status: 500 });
  let c = {};
  try { c = await req.json(); } catch { /* se valida abajo */ }
  const { disparadores, errores } = validarDisparadores(c?.disparadores, () => randomUUID().slice(0, 8));
  if (errores.length) return Response.json({ error: errores.join(" ") }, { status: 400 });
  await conRedis((r) => guardarDisparadores(r, cuenta, disparadores));
  return Response.json({ disparadores });
}
```

- [ ] **Paso 2:** `src/app/admin/palabras/page.jsx`:

```jsx
import Palabras from "./Palabras.jsx";

export const dynamic = "force-dynamic";
export default function Pagina() {
  return <Palabras />;   // el layout de /admin ya pide la clave
}
```

`src/app/admin/palabras/Palabras.jsx`:

```jsx
"use client";
import { useEffect, useState } from "react";

const vacio = () => ({ palabra: "", respuesta_publica: "¡Enviado! Revisa tu DM 📩", mensaje_dm: "", link: "https://mlabs.elmetacho.com/recursos/", pedir_seguir: false, activa: true });

export default function Palabras() {
  const [lista, setLista] = useState(null);
  const [pausa, setPausa] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    fetch("/admin/api/palabras").then((r) => r.json()).then((d) => { if (d.error) setMsg(d.error); else { setLista(d.disparadores); setPausa(d.pausa); } });
  }, []);
  const cambiar = (k, campo, valor) => setLista(lista.map((d, i) => (i === k ? { ...d, [campo]: valor } : d)));
  async function guardar() {
    setMsg("Guardando…");
    const r = await fetch("/admin/api/palabras", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disparadores: lista }) });
    const d = await r.json();
    if (!r.ok) return setMsg(d.error || "No se pudo guardar.");
    setLista(d.disparadores);
    setMsg("Guardado ✓");
  }
  if (!lista) return <p>{msg || "Cargando…"}</p>;
  return (
    <section>
      <a href="/admin" className="text-sm underline">← Admin</a>
      <h1 className="mt-2 text-2xl font-black">Palabras clave · metacholabs</h1>
      {pausa && <p className="mt-2 rounded bg-red-100 p-2 text-sm text-red-800">En pausa: el token no sirve o falta. Pega uno nuevo en Vercel (IG_TOKEN_LABS).</p>}
      <p className="mt-1 text-sm opacity-70">Si un comentario contiene la palabra (sin importar mayúsculas ni tildes), se responde en público y le llega el DM con el link. La primera de la lista gana.</p>
      {lista.map((d, k) => (
        <div key={d.id || k} className="mt-4 space-y-2 rounded-lg border p-3 text-sm">
          <label className="block">Palabra <input className="w-full rounded border p-1" value={d.palabra} onChange={(e) => cambiar(k, "palabra", e.target.value)} /></label>
          <label className="block">Respuesta en el comentario <input className="w-full rounded border p-1" value={d.respuesta_publica} onChange={(e) => cambiar(k, "respuesta_publica", e.target.value)} /></label>
          <label className="block">Mensaje del DM <textarea className="w-full rounded border p-1" rows={3} value={d.mensaje_dm} onChange={(e) => cambiar(k, "mensaje_dm", e.target.value)} /></label>
          <label className="block">Link <input className="w-full rounded border p-1" value={d.link} onChange={(e) => cambiar(k, "link", e.target.value)} /></label>
          <label className="mr-4"><input type="checkbox" checked={d.pedir_seguir} onChange={(e) => cambiar(k, "pedir_seguir", e.target.checked)} /> Pedir que me siga</label>
          <label className="mr-4"><input type="checkbox" checked={d.activa} onChange={(e) => cambiar(k, "activa", e.target.checked)} /> Activa</label>
          <button className="text-red-700 underline" onClick={() => setLista(lista.filter((_, i) => i !== k))}>Quitar</button>
        </div>
      ))}
      <div className="mt-4 flex gap-3">
        <button className="rounded border px-3 py-1" onClick={() => setLista([...lista, vacio()])}>+ Palabra</button>
        <button className="rounded bg-black px-3 py-1 text-white" onClick={guardar}>Guardar</button>
      </div>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </section>
  );
}
```

- [ ] **Paso 3:** `docs/admin.md`: filas `GET/PUT /admin/api/palabras` (Sesión), `GET /api/instagram/renovar-token` (cron de Vercel, `CRON_SECRET`), variables `IG_TOKEN_LABS` y `CRON_SECRET`; actualizar la fila de `POST /api/instagram/webhook` (reparto por cuenta, palabras clave).
- [ ] **Paso 4:** `npm test`, `npx eslint src`, `npm run build` → sin errores; el build lista `/admin/palabras`, `/admin/api/palabras`, `/api/instagram/renovar-token`.
- [ ] **Paso 5: commit** `git add src/app/admin docs/admin.md && git commit -m "Admin: página de palabras clave de metacholabs"`
- [ ] **Paso 6:** Oscar: en Meta, fila **metacholabs** → «Generar identificador» (iniciando sesión con metacholabs) → copia el token directo a Vercel como `IG_TOKEN_LABS`; activa la suscripción a webhook de metacholabs; crea `CRON_SECRET` (cualquier frase larga) en Vercel. Push, PR, merge.
- [ ] **Paso 7: prueba en vivo de los envíos con la app sin publicar.** Meta no manda avisos reales todavía, pero la API de envío sí funciona con cuentas que tienen rol. Desde elmetacho_ (con rol), Oscar comenta «curso» en el post más reciente de metacholabs. Claude escribe en el scratchpad `probar-envios.mjs`, que con el token de la variable de entorno `IG_TOKEN_PRUEBA`: (1) pide `GET https://graph.instagram.com/v26.0/me/media?fields=id,comments{id,text}&limit=1`, (2) toma el comentario cuyo texto contiene «curso», (3) llama `crearGraph({ token }).responderComentario(id, "¡Enviado! Revisa tu DM 📩")` y `.privado(<id de metacholabs>, id, { text: "Prueba\nhttps://mlabs.elmetacho.com/" })`, e imprime solo «ok» o el mensaje de error de Meta (nunca el token). **Oscar lo corre en su terminal** (así Claude no ve el token): `$env:IG_TOKEN_PRUEBA = "<token de metacholabs>"; node <ruta>/probar-envios.mjs`. Evidencia: la respuesta pública y el DM aparecen en Instagram; si Meta responde un error, se anota con su código antes de seguir.

## Bloque D (PR 3): páginas legales de MLABS y datos de la app

### Tarea 9: privacidad y eliminación de datos en mlabs.elmetacho.com

**Archivos:**
- Crear: `src/app/mlabs/privacidad/page.jsx`, `src/app/mlabs/eliminar-datos/page.jsx`

**Interfaces:**
- Consume: `MlabsHeader`, `MlabsFooter` (`src/app/mlabs/MlabsMarco.jsx`). Los datos legales (razón social, NIT si aparece, correo) se copian de `src/app/privacidad/page.jsx` — no inventar ninguno.

- [ ] **Paso 1:** leer `src/app/privacidad/page.jsx` y anotar razón social, identificación y correo de contacto que ya publica.
- [ ] **Paso 2:** `src/app/mlabs/privacidad/page.jsx` con el marco de MLABS (como `src/app/mlabs/pagar/page.jsx`) y estas secciones, en español con un resumen en inglés al final:
  1. **Quién responde:** «MLABS es un servicio de El Metacho S.A.S.» + datos copiados del Paso 1.
  2. **Qué datos usamos de Instagram (app «M LABS REPLY»):** en las cuentas de El Metacho y MLABS: links de reels o de TikTok/Instagram que nos envían por mensaje directo (solo el link y la hora); en comentarios de MLABS: el id del comentario y el id de Instagram de quien comenta, para responderle una sola vez y, si lo pide, mandarle por mensaje directo el recurso; la consulta de si sigue la cuenta, solo después de que nos escribe. No guardamos el texto de comentarios ni de mensajes ni nombres de usuario; el id se borra a las 24 h y la marca de comentario respondido a los 8 días.
  3. **Para qué:** responder a quien pide un recurso y proponer videos para el formato «comentarios cantados». No vendemos ni compartimos datos; no los usamos para publicidad.
  4. **Base legal y derechos:** Ley 1581 de 2012 (como la política actual); cómo pedir acceso o borrado → enlace a `/eliminar-datos`.
  5. **Resumen en inglés** (5–6 líneas) de los puntos 2–4.
- [ ] **Paso 3:** `src/app/mlabs/eliminar-datos/page.jsx`: «Cómo borrar tus datos»: escribir a <correo del Paso 1> desde el correo o la cuenta de Instagram con el asunto «Borrar mis datos de Instagram»; se borra en máximo 15 días hábiles y se confirma por el mismo medio; además todo se borra solo (24 h / 8 días). Resumen en inglés.
- [ ] **Paso 4:** `npm run build`; en local `npm run dev` y abrir `http://mlabs.localhost:3000/privacidad` y `/eliminar-datos` → se ven con el marco de MLABS.
- [ ] **Paso 5: commit** `git add src/app/mlabs/privacidad src/app/mlabs/eliminar-datos && git commit -m "MLABS: política de privacidad y eliminación de datos para la app de Instagram"`; Oscar: push, PR, merge. Comprobar en vivo: `curl -s -o /dev/null -w "%{http_code}" https://mlabs.elmetacho.com/privacidad` → `200` (igual `/eliminar-datos`).
- [ ] **Paso 6:** guiar a Oscar en Meta (app M LABS REPLY): **Información básica** → URL de privacidad `https://mlabs.elmetacho.com/privacidad`, eliminación de datos «URL de instrucciones» `https://mlabs.elmetacho.com/eliminar-datos`, dominio `mlabs.elmetacho.com`, categoría e ícono; **Webhooks** → URL `https://mlabs.elmetacho.com/api/instagram/webhook` + misma frase → «Verificar y guardar» (comprobar en Vercel el GET 200).

## Bloque E: revisión de Meta

### Tarea 10: textos y guion de los videos

**Archivos:**
- Crear: `docs/meta-revision-instagram.md`

- [ ] **Paso 1:** verificar en la documentación actual de Meta (App Review → «instagram_business_manage_messages», «instagram_business_manage_comments») qué piden por permiso (descripción, video, pasos para probar) y anotar las fuentes en el archivo.
- [ ] **Paso 2:** escribir en `docs/meta-revision-instagram.md`, en inglés, la descripción de uso de cada permiso (`instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`) según el flujo real de este plan, y en español el guion de los tres videos (spec §8): qué pantallas, en qué orden, qué cuenta hace cada cosa, y los pasos de prueba para el revisor.
- [ ] **Paso 3:** con Oscar: grabar los tres videos (con la app ya configurada, Tareas 3, 8 y 9), subirlos y enviar la revisión. Anotar la fecha de envío en `docs/BRIEF.md` («Resumen de sesiones»).
- [ ] **Paso 4: commit** `git add docs/meta-revision-instagram.md docs/BRIEF.md && git commit -m "Docs: textos y guion para la revisión de Meta (Instagram)"`

### Tarea 11: cuando Meta apruebe

- [ ] **Paso 1:** publicar la app (modo «en vivo») en Meta.
- [ ] **Paso 2:** prueba real de punta a punta: una cuenta cualquiera manda un reel por DM a elmetacho_ → aparece en `/admin/dm-links`; a las 5 a. m. pasa a `PENDIENTES.txt` (`logs/pasada.log`: «Links por DM: …»). Alguien comenta «curso» en metacholabs → respuesta pública + DM. Con «pedir que me siga»: el flujo «Ya te sigo» (sigue / no sigue).
- [ ] **Paso 3:** actualizar `docs/BRIEF.md`, `PREMIERE-CLAUDE/cantados/BITACORA-CANTADOS.md` §0 y la memoria del proyecto con el estado final.
