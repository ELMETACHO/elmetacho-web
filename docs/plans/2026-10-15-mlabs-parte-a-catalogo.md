# MLABS Parte A: catálogo, guías gratis y preventas · Plan de implementación

> **Para quien ejecute:** SUB-SKILL REQUERIDA: usa superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para llevar el avance.

**Objetivo:** que una persona que vio un video de Metacho Labs llegue desde el teléfono a su guía, la desbloquee con su correo, vea el producto relacionado y aparte un cupo en preventa, y que pueda encontrar cualquier guía con un buscador instantáneo.

**Arquitectura:** todo el contenido vive en archivos JS dentro de `src/app/mlabs/contenido/` y se valida al compilar: si hay un error, `npm run build` falla. La lógica pura (buscador, filtros, desbloqueo, envío de leads, precios) va en `src/app/mlabs/lib/` y se prueba con el corredor nativo de Node (`node --test`), sin dependencias nuevas. Las páginas son estáticas; solo `/api/*` corre en el servidor. Se reutiliza `/api/lead` (Redis + Telegram) para el desbloqueo y la preventa.

**Tecnología:** Next.js 16 (App Router), React 19, Tailwind v4, `node:test` (Node 24) y `@vercel/analytics`, que es la única dependencia nueva.

**Spec:** `docs/superpowers/specs/2026-10-15-mlabs-parte-a-catalogo-design.md` (aprobado por el dueño el 2026-10-15).

## Restricciones globales

- Habla de tú al usuario en todos los textos (nunca de vos). Español colombiano.
- Rutas internas de MLABS relativas a la raíz del subdominio: `/recursos`, `/productos/<slug>`, `/novedades`, `/para/<publico>` (nunca `/mlabs/...` en enlaces).
- Todo estático salvo `/api/*`. Sin librerías nuevas pesadas; el buscador es código propio de menos de 5 KB.
- LCP < 2,5 s y CLS < 0,1 en teléfono de gama media (Lighthouse en modo móvil antes del merge).
- Videos solo en inicio y en producto, con póster y `preload="none"` fuera de la primera pantalla.
- **Regla de verdad:** ninguna novedad ni dato sin fuente verificable. Los precios y las fechas de los productos los define el dueño: mientras no los dé, quedan en `null` y la página dice que se anuncian a quienes aparten cupo.
- Los contenidos detrás del correo se renderizan en el HTML y se ocultan solo visualmente.
- Por defecto se ven sin correo el resumen y la primera sección (`seccionesLibres: 1`).
- Leads con origen `guia-<slug>` (desbloqueo) y `preventa-<slug>` (preventa). `/api/lead` corta el origen a 60 caracteres.
- Nunca abras archivos `.env*`.
- Commits pequeños en español. El dueño hace el push y aprueba el merge.
- Diseño: rojo `#E10600` (`text-rojo`, `bg-rojo`), titulares `titular-ancho` (Archivo ancho), papel cuadriculado (`papel-cuad`). Se prioriza la vista de teléfono. **Anti-perfeccionismo:** primero el flujo completo (tareas 1–4), después lo demás. No se pule el diseño dentro de este plan.

## Foco de revisión

Estos casos no los cubre ninguna prueba unitaria y son los que más pueden fallarle a una persona real:

1. **Navegador sin `localStorage`** (Safari en privado, cookies bloqueadas, Instagram in-app): la guía debe cargar y el formulario debe funcionar. Solo deja de recordarse el desbloqueo. → Prueba en la tarea 2 (`almacen` nulo o que lanza error).
2. **`/api/lead` caído dos veces seguidas:** el primer fallo muestra el error con WhatsApp y no desbloquea. El segundo desbloquea y guarda el lead para reintentarlo en la siguiente visita. → Pruebas de `trasFallo`, `guardarPendiente` y `tomarPendiente` en la tarea 2.
3. **Palabra escrita como la comentan:** «reseña», «RESENA», « Reseña » o «resena » deben encontrar la guía de RESEÑA. → Pruebas de `normalizar` y `buscar` en la tarea 5.
4. **Contenido mal escrito por el dueño o por otra sesión** (producto relacionado que no existe, novedad sin URL, palabra repetida, `seccionesLibres` mayor que el número de secciones): el build debe fallar con un mensaje claro y no publicar una página rota. → Pruebas de `validarContenido` en la tarea 1.
5. **Usuario que ya desbloqueó y vuelve:** no debe ver un parpadeo del formulario ni un salto de diseño (CLS). → El estilo en línea antes de pintar (tarea 2) y la verificación en el navegador de la tarea 4.

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `package.json` | script `test` y dependencia `@vercel/analytics` |
| `src/app/mlabs/lib/texto.js` | `normalizar()`: quita tildes, pasa a minúsculas y recorta espacios |
| `src/app/mlabs/lib/buscar.js` | `crearIndice()`, `buscar()` |
| `src/app/mlabs/lib/filtrar.js` | `filtrar()` del catálogo por público y tipo |
| `src/app/mlabs/lib/desbloqueo.js` | recordar el desbloqueo, política de fallos y lead pendiente |
| `src/app/mlabs/lib/enviarLead.js` | `POST /api/lead` (con `fetch` inyectable para las pruebas) |
| `src/app/mlabs/lib/precio.js` | `formatoPrecio()` |
| `src/app/mlabs/lib/*.test.js` | pruebas de lo anterior |
| `src/app/mlabs/contenido/guias.js` | lista de guías (reemplaza `recursos/guias.js`) |
| `src/app/mlabs/contenido/productos.js` | productos en preventa |
| `src/app/mlabs/contenido/novedades.js` | novedades de IA con fuente |
| `src/app/mlabs/contenido/publicos.js` | públicos para las páginas pilar |
| `src/app/mlabs/contenido/validar.js` | `validarContenido()` |
| `src/app/mlabs/contenido/index.js` | valida al importar (rompe el build si hay errores) y exporta datos, buscadores e índice |
| `src/app/mlabs/contenido/contenido.test.js` | pruebas de la validación y del contenido real |
| `src/app/mlabs/componentes/Desbloqueo.jsx` | formulario de correo + contenido bloqueado (cliente) |
| `src/app/mlabs/componentes/Bloque.jsx` | render de bloques de guía (sale de la página de guía) |
| `src/app/mlabs/componentes/TarjetaProducto.jsx` | tarjeta del producto relacionado |
| `src/app/mlabs/componentes/TarjetaContenido.jsx` | tarjeta de guía para listados |
| `src/app/mlabs/componentes/Buscador.jsx` | buscador instantáneo (cliente) |
| `src/app/mlabs/componentes/Catalogo.jsx` | listado con filtros (cliente) |
| `src/app/mlabs/componentes/CatalogoInicio.jsx` | bloque de catálogo arriba en el inicio |
| `src/app/mlabs/recursos/[slug]/page.jsx` | guía (renombrada desde `[palabra]`) |
| `src/app/mlabs/productos/[slug]/page.jsx` | página de producto en preventa |
| `src/app/mlabs/novedades/page.jsx` | novedades de la semana |
| `src/app/mlabs/para/[publico]/page.jsx` | páginas pilar |
| `src/app/mlabs/not-found.jsx` | 404 de MLABS con buscador |
| `src/app/mlabs/FormularioLead.jsx` | usa `enviarLead` y acepta `mensajeOk` |
| `src/app/mlabs/enlaces.js` | `MLABS_WHATSAPP`, `MLABS_MAILTO` (para que los componentes de cliente no arrastren el contenido) |
| `src/app/mlabs/MlabsMarco.jsx` | header con buscador y enlaces nuevos |
| `src/app/mlabs/page.jsx` | inicio reorganizado |
| `src/app/mlabs/sitemap.xml/route.js`, `llms.txt/route.js` | todas las piezas |
| `src/app/layout.jsx` | `<Analytics />` |
| `src/app/globals.css` | `.contenido-bloqueado` |

---

## Tarea 0: Rama

- [ ] **Paso 1: crea la rama de trabajo.** Si el PR del spec y de este plan (`spec/mlabs-parte-a`) ya está fusionado en `main`, crea la rama desde `main`. Si todavía no está fusionado, créala desde `spec/mlabs-parte-a`. En los dos casos el PR final sale contra `main`.

```bash
git checkout main && git pull
git checkout -b feat/mlabs-parte-a
```

---

## Tarea 1: Modelo de contenido, validación y corredor de pruebas

**Archivos:**
- Crear: `src/app/mlabs/lib/texto.js`, `src/app/mlabs/contenido/{guias,productos,novedades,publicos,validar,index}.js`, `src/app/mlabs/contenido/contenido.test.js`, `src/app/mlabs/lib/texto.test.js`
- Modificar: `package.json` (script `test`), `src/app/mlabs/recursos/page.jsx`, `src/app/mlabs/recursos/[palabra]/page.jsx`, `src/app/mlabs/page.jsx`, `src/app/mlabs/sitemap.xml/route.js`, `src/app/mlabs/llms.txt/route.js` (cambiar el import)
- Borrar: `src/app/mlabs/recursos/guias.js` (se mueve a `contenido/guias.js`)

**Interfaces:**
- Produce: `normalizar(s: string): string` en `lib/texto.js`.
- Produce: `validarContenido({ guias, productos, novedades, publicos }): string[]` (lista de errores, vacía si todo está bien).
- Produce: en `contenido/index.js` se exportan `guias`, `productos`, `novedades`, `publicos` (arreglos), `guiaPorSlug(slug)`, `productoPorSlug(slug)`, `publicoPorSlug(slug)` (devuelven el objeto o `undefined`) y `novedadesRecientes` (arreglo ordenado por fecha, de la más nueva a la más vieja).
- Forma de una guía: `{ slug, palabra, titulo, resumen, tipo: "guia"|"prompt"|"mini-curso", publicos: string[], tiempo: number, actualizado: "AAAA-MM-DD", productoRelacionado?: string, howto?: boolean, seccionesLibres?: number, secciones: [{ titulo, bloques: [{p}|{lista}|{prompt}|{tabla}|{ojo}] }] }`
- Forma de un producto: `{ slug, nombre, promesa, paraQuien: string[], noEsPara: string[], queIncluye: string[], requisitos: string[], estado: "preventa"|"disponible", precioLanzamiento: number|null, precio: number|null, moneda: "COP"|"USD", fechaEstimada: string|null, video?: string, faq: [{q, a}] }`
- Forma de una novedad: `{ slug, titulo, fecha: "AAAA-MM-DD", fuente: { nombre, url }, queEs, paraQueTeSirve, guiaRelacionada?: string }`
- Forma de un público: `{ slug, nombre, titulo, intro }`

> Importante: dentro de `lib/` y `contenido/` los imports llevan siempre la extensión `.js` (`./texto.js`). Así los carga tanto Node en las pruebas como Next. Estos archivos no pueden importar nada de `next/*` ni JSX.

- [ ] **Paso 1: agrega el script de pruebas a `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "node --test \"src/**/*.test.js\""
}
```

(Node imprime un aviso `MODULE_TYPELESS_PACKAGE_JSON`. Es inofensivo y se deja así a propósito para no tocar el tipo de módulo del proyecto Next.)

- [ ] **Paso 2: escribe las pruebas que fallan**

`src/app/mlabs/lib/texto.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizar } from "./texto.js";

test("normalizar quita tildes y la virgulilla de la ñ, pasa a minúsculas y recorta", () => {
  assert.equal(normalizar(" RESEÑA "), "resena");
  assert.equal(normalizar("Fórmula"), "formula");
  assert.equal(normalizar(undefined), "");
});
```

`src/app/mlabs/contenido/contenido.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarContenido } from "./validar.js";

const publicos = [{ slug: "marcas", nombre: "Marcas", titulo: "t", intro: "i" }];
const guia = (extra = {}) => ({
  slug: "resena", palabra: "RESEÑA", titulo: "T", resumen: "R", tipo: "prompt",
  publicos: ["marcas"], tiempo: 3, actualizado: "2026-10-15",
  secciones: [{ titulo: "S1", bloques: [{ p: "x" }] }, { titulo: "S2", bloques: [{ ojo: "y" }] }],
  ...extra,
});
const producto = (extra = {}) => ({
  slug: "editor-automatico", nombre: "Editor", promesa: "P", paraQuien: ["a"], noEsPara: ["b"],
  queIncluye: ["c"], requisitos: ["d"], estado: "preventa", precioLanzamiento: null, precio: null,
  moneda: "COP", fechaEstimada: null, faq: [], ...extra,
});
const novedad = (extra = {}) => ({
  slug: "n1", titulo: "T", fecha: "2026-10-15", fuente: { nombre: "Fuente", url: "https://ejemplo.com" },
  queEs: "Q", paraQueTeSirve: "P", ...extra,
});
const base = (o = {}) => ({ guias: [guia()], productos: [producto()], novedades: [novedad()], publicos, ...o });

test("contenido válido no tiene errores", () => {
  assert.deepEqual(validarContenido(base()), []);
});

test("falta un campo obligatorio de la guía", () => {
  const e = validarContenido(base({ guias: [guia({ resumen: "" })] }));
  assert.ok(e.some((x) => x.includes("resena") && x.includes("resumen")), e.join("|"));
});

test("producto relacionado inexistente", () => {
  const e = validarContenido(base({ guias: [guia({ productoRelacionado: "no-existe" })] }));
  assert.ok(e.some((x) => x.includes("no-existe")), e.join("|"));
});

test("público desconocido", () => {
  const e = validarContenido(base({ guias: [guia({ publicos: ["astronautas"] })] }));
  assert.ok(e.some((x) => x.includes("astronautas")), e.join("|"));
});

test("seccionesLibres fuera de rango", () => {
  const e = validarContenido(base({ guias: [guia({ seccionesLibres: 5 })] }));
  assert.ok(e.some((x) => x.includes("seccionesLibres")), e.join("|"));
});

test("palabra repetida aunque cambien tildes o mayúsculas", () => {
  const e = validarContenido(base({ guias: [guia(), guia({ slug: "otra", palabra: "resena" })] }));
  assert.ok(e.some((x) => x.includes("palabra repetida")), e.join("|"));
});

test("bloque desconocido", () => {
  const e = validarContenido(base({ guias: [guia({ secciones: [{ titulo: "S", bloques: [{ video: "x" }] }] })] }));
  assert.ok(e.some((x) => x.includes("bloque desconocido")), e.join("|"));
});

test("novedad sin fuente o con URL que no es https", () => {
  for (const fuente of [undefined, { nombre: "X", url: "" }, { nombre: "X", url: "http://inseguro.com" }]) {
    const e = validarContenido(base({ novedades: [novedad({ fuente })] }));
    assert.ok(e.some((x) => x.includes("fuente")), e.join("|"));
  }
});

test("producto disponible sin precio", () => {
  const e = validarContenido(base({ productos: [producto({ estado: "disponible" })] }));
  assert.ok(e.some((x) => x.includes("precio")), e.join("|"));
});

test("producto en preventa puede ir sin precio ni fecha", () => {
  assert.deepEqual(validarContenido(base({ productos: [producto()] })), []);
});

test("slug repetido", () => {
  const e = validarContenido(base({ productos: [producto(), producto()] }));
  assert.ok(e.some((x) => x.includes("repetido")), e.join("|"));
});

test("el contenido real del sitio es válido", async () => {
  const c = await import("./index.js"); // lanza error si no es válido
  assert.ok(c.guias.length >= 4);
  assert.equal(c.guiaPorSlug("resena").palabra, "RESEÑA");
});
```

- [ ] **Paso 3: corre las pruebas para confirmar que fallan**

Run: `npm test`
Expected: FAIL con `Cannot find module ... texto.js` / `validar.js`.

- [ ] **Paso 4: implementa `lib/texto.js`**

```js
// Texto comparable: sin tildes (ñ → n), en minúsculas y sin espacios en los extremos. "RESEÑA" = "resena".
export const normalizar = (s) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
```

- [ ] **Paso 5: implementa `contenido/validar.js`**

```js
// Revisa todo el contenido de MLABS. Devuelve la lista de errores (vacía = todo bien).
// contenido/index.js la llama al importar: si hay errores, `npm run build` falla y no se publica nada roto.
import { normalizar } from "../lib/texto.js";

const TIPOS = ["guia", "prompt", "mini-curso"];
const BLOQUES = ["p", "lista", "prompt", "tabla", "ojo"];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validarContenido({ guias, productos, novedades, publicos }) {
  const e = [];
  const slugs = (lista) => new Set(lista.map((x) => x.slug));
  const slugsPublicos = slugs(publicos);
  const slugsProductos = slugs(productos);
  const slugsGuias = slugs(guias);

  const repetidos = (lista, que) => {
    const vistos = new Set();
    for (const x of lista) {
      if (vistos.has(x.slug)) e.push(`${que} repetido: ${x.slug}`);
      vistos.add(x.slug);
      if (!SLUG.test(x.slug ?? "")) e.push(`${que} ${x.slug}: slug inválido (minúsculas, números y guiones)`);
    }
  };
  repetidos(guias, "guía");
  repetidos(productos, "producto");
  repetidos(novedades, "novedad");
  repetidos(publicos, "público");

  const faltan = (obj, id, campos) => {
    for (const c of campos) if (!obj[c]) e.push(`${id}: falta ${c}`);
  };
  const listaLlena = (obj, id, campo) => {
    if (!Array.isArray(obj[campo]) || obj[campo].length === 0) e.push(`${id}: falta ${campo}`);
  };

  const palabras = new Set();
  for (const g of guias) {
    const id = `guía ${g.slug}`;
    faltan(g, id, ["palabra", "titulo", "resumen"]);
    if (!TIPOS.includes(g.tipo)) e.push(`${id}: tipo inválido (${g.tipo})`);
    listaLlena(g, id, "publicos");
    for (const p of g.publicos ?? []) if (!slugsPublicos.has(p)) e.push(`${id}: público desconocido ${p}`);
    if (!(g.tiempo > 0)) e.push(`${id}: falta tiempo`);
    if (!FECHA.test(g.actualizado ?? "")) e.push(`${id}: actualizado debe ser AAAA-MM-DD`);
    if (g.productoRelacionado && !slugsProductos.has(g.productoRelacionado))
      e.push(`${id}: producto relacionado inexistente ${g.productoRelacionado}`);
    listaLlena(g, id, "secciones");
    for (const s of g.secciones ?? []) {
      if (!s.titulo) e.push(`${id}: sección sin título`);
      for (const b of s.bloques ?? []) if (!BLOQUES.some((k) => k in b)) e.push(`${id}: bloque desconocido en «${s.titulo}»`);
    }
    const libres = g.seccionesLibres ?? 1;
    if (!Number.isInteger(libres) || libres < 0 || libres > (g.secciones?.length ?? 0))
      e.push(`${id}: seccionesLibres fuera de rango (${libres})`);
    const n = normalizar(g.palabra);
    if (n && palabras.has(n)) e.push(`palabra repetida: ${g.palabra}`);
    palabras.add(n);
  }

  for (const p of productos) {
    const id = `producto ${p.slug}`;
    faltan(p, id, ["nombre", "promesa"]);
    for (const c of ["paraQuien", "noEsPara", "queIncluye", "requisitos"]) listaLlena(p, id, c);
    if (!["preventa", "disponible"].includes(p.estado)) e.push(`${id}: estado inválido (${p.estado})`);
    if (p.estado === "disponible" && !(p.precio > 0)) e.push(`${id}: disponible sin precio`);
    if (!["COP", "USD"].includes(p.moneda)) e.push(`${id}: moneda inválida (${p.moneda})`);
    if (!Array.isArray(p.faq)) e.push(`${id}: faq debe ser una lista`);
  }

  for (const n of novedades) {
    const id = `novedad ${n.slug}`;
    faltan(n, id, ["titulo", "queEs", "paraQueTeSirve"]);
    if (!FECHA.test(n.fecha ?? "")) e.push(`${id}: fecha debe ser AAAA-MM-DD`);
    if (!n.fuente?.nombre || !/^https:\/\/\S+$/.test(n.fuente?.url ?? "")) e.push(`${id}: falta fuente con nombre y URL https`);
    if (n.guiaRelacionada && !slugsGuias.has(n.guiaRelacionada)) e.push(`${id}: guía relacionada inexistente ${n.guiaRelacionada}`);
  }

  for (const p of publicos) faltan(p, `público ${p.slug}`, ["nombre", "titulo", "intro"]);
  return e;
}
```

- [ ] **Paso 6: crea `contenido/publicos.js`**

```js
// Públicos de MLABS: cada uno tiene su página pilar en /para/<slug> (SEO) y sirve de filtro en el catálogo.
export const publicos = [
  {
    slug: "emprendedores",
    nombre: "Emprendedores",
    titulo: "IA para emprendedores: guías para vender más y trabajar menos",
    intro: "Prompts y guías cortas para que tu negocio responda clientes, venda y se organice con IA, sin saber programar.",
  },
  {
    slug: "marcas",
    nombre: "Marcas y negocios",
    titulo: "IA para marcas: contenido, reseñas y clientes",
    intro: "Lo que usamos en MLABS con marcas reales: reseñas, competencia, contenido y atención al cliente con IA.",
  },
  {
    slug: "creadores",
    nombre: "Creadores de contenido",
    titulo: "IA para creadores de contenido: graba una vez, publica siete",
    intro: "Cómo producimos videos todos los días en Metacho Labs: guiones, edición, reciclaje de contenido y calendario.",
  },
  {
    slug: "ia-y-developers",
    nombre: "IA y developers",
    titulo: "Claude y automatizaciones para quien quiere ir más allá",
    intro: "Guías técnicas de Claude, Claude Code y automatizaciones para agencias, developers e independientes.",
  },
];
```

- [ ] **Paso 7: mueve las guías a `contenido/guias.js`.** Usa `git mv src/app/mlabs/recursos/guias.js src/app/mlabs/contenido/guias.js` y conviértelas de objeto a arreglo. Cambios exactos:
  - La primera línea del archivo pasa a ser: `// Guías gratis de MLABS (material de los videos de Metacho Labs). Forma y reglas: contenido/validar.js.`
  - Cambia `export const guias = {` por `export const guias = [` y cierra con `];`.
  - Cada `clave: {` pasa a `{ slug: "clave",`. Agrega a cada guía estos campos, justo después de `resumen`:

| slug | tipo | publicos | tiempo | actualizado | productoRelacionado | howto |
|---|---|---|---|---|---|---|
| `claude` | `"guia"` | `["emprendedores", "marcas", "ia-y-developers"]` | `4` | `"2026-10-14"` | — | — |
| `resena` | `"prompt"` | `["emprendedores", "marcas"]` | `3` | `"2026-10-14"` | — | — |
| `recicla` | `"prompt"` | `["creadores", "marcas"]` | `5` | `"2026-10-14"` | `"creador-de-carruseles"` | `true` |
| `competencia` | `"prompt"` | `["emprendedores", "marcas", "creadores"]` | `5` | `"2026-10-14"` | — | `true` |

  - Borra la línea `export const listaGuias = ...`.
  - **La guía de RESEÑA va sin producto relacionado**: termina en el CTA «Lo instalamos por ti». El dueño aprobó el spec tal cual y «Sellame» no está en él.

- [ ] **Paso 8: crea `contenido/productos.js`** con los dos productos en preventa. Los textos salen del spec y del pipeline real (`D:/METACHO CLAUDE/PREMIERE-CLAUDE`). Precios y fechas en `null` hasta que el dueño los dé.

```js
// Productos de MLABS. En la Parte A solo se apartan (preventa); el cobro y la entrega llegan en la Parte B.
// Regla de verdad: precio, precioLanzamiento y fechaEstimada los define el dueño. Mientras sean null, la página lo dice.
export const productos = [
  {
    slug: "editor-automatico",
    nombre: "Editor automático con Claude",
    promesa: "Grabas tu video a cámara, con errores y silencios, y Claude te lo entrega editado: cortes, subtítulos y ritmo, listo para publicar.",
    paraQuien: [
      "Creadores y marcas que graban a cámara varias veces por semana.",
      "Quien pasa más tiempo editando que grabando.",
    ],
    noEsPara: [
      "Quien busca efectos de cine o edición creativa a mano.",
      "Quien no tiene, o no quiere pagar, una suscripción de Claude.",
    ],
    queIncluye: [
      "El sistema de edición que usamos en Metacho Labs, instalable en tu computador.",
      "Guía de instalación paso a paso y revisión de que todo quedó funcionando.",
      "Acceso a la beta y a las mejoras de la primera versión.",
    ],
    requisitos: ["Claude Pro o superior.", "Computador con Windows o Mac."],
    estado: "preventa",
    precioLanzamiento: null,
    precio: null,
    moneda: "COP",
    fechaEstimada: null,
    video: "labs",
    faq: [
      { q: "¿Ya lo puedo comprar?", a: "Todavía no. Estamos en preventa: apartas tu cupo gratis y te avisamos primero cuando abra, con el precio de lanzamiento." },
      { q: "¿Apartar el cupo me obliga a comprar?", a: "No. Solo te avisamos. Decides cuando veas el precio y la fecha." },
    ],
  },
  {
    slug: "creador-de-carruseles",
    nombre: "Creador de carruseles con Claude",
    promesa: "Le das una idea o la transcripción de tu video y Claude te arma el carrusel con tu marca, listo para subir.",
    paraQuien: [
      "Creadores y marcas que publican carruseles en Instagram o LinkedIn.",
      "Quien quiere sacar varias piezas de cada video que graba.",
    ],
    noEsPara: [
      "Quien necesita diseño hecho a mano pieza por pieza.",
      "Quien no tiene, o no quiere pagar, una suscripción de Claude.",
    ],
    queIncluye: [
      "El sistema de carruseles que usamos en Metacho Labs, instalable en tu computador.",
      "Plantillas con tu logo, tus colores y tus tipografías.",
      "Acceso a la beta y a las mejoras de la primera versión.",
    ],
    requisitos: ["Claude Pro o superior.", "Computador con Windows o Mac."],
    estado: "preventa",
    precioLanzamiento: null,
    precio: null,
    moneda: "COP",
    fechaEstimada: null,
    faq: [
      { q: "¿Ya lo puedo comprar?", a: "Todavía no. Estamos en preventa: apartas tu cupo gratis y te avisamos primero cuando abra, con el precio de lanzamiento." },
      { q: "¿Apartar el cupo me obliga a comprar?", a: "No. Solo te avisamos. Decides cuando veas el precio y la fecha." },
    ],
  },
];
```

> Antes de escribir los `requisitos` del editor, revisa en `D:/METACHO CLAUDE/PREMIERE-CLAUDE` (CLAUDE.md y `reels/tools/camara.py`) qué necesita de verdad el pipeline: ffmpeg, Python, GPU, Premiere, etc. Ajusta la lista a lo que encuentres y anótalo en el PR para que el dueño lo revise. Los requisitos tienen que ser honestos.

- [ ] **Paso 9: crea `contenido/novedades.js` vacío por ahora** (se llena en la tarea 6)

```js
// Novedades de IA de la semana (/novedades). Cada una con fuente oficial: sin fuente, el build falla.
export const novedades = [];
```

- [ ] **Paso 10: crea `contenido/index.js`**

```js
// Punto único de entrada al contenido de MLABS. Valida todo al importarse: si algo está mal, el build se detiene.
import { guias } from "./guias.js";
import { productos } from "./productos.js";
import { novedades } from "./novedades.js";
import { publicos } from "./publicos.js";
import { validarContenido } from "./validar.js";

const errores = validarContenido({ guias, productos, novedades, publicos });
if (errores.length) throw new Error(`Contenido de MLABS inválido:\n- ${errores.join("\n- ")}`);

export { guias, productos, novedades, publicos };
export const guiaPorSlug = (slug) => guias.find((g) => g.slug === slug);
export const productoPorSlug = (slug) => productos.find((p) => p.slug === slug);
export const publicoPorSlug = (slug) => publicos.find((p) => p.slug === slug);
export const novedadesRecientes = [...novedades].sort((a, b) => b.fecha.localeCompare(a.fecha));
```

- [ ] **Paso 11: actualiza a los consumidores del archivo viejo**
  - `recursos/page.jsx`: `import { guias } from "../contenido/index.js";` y cambia `listaGuias.map` por `guias.map`.
  - `recursos/[palabra]/page.jsx`: `import { guias, guiaPorSlug } from "../../contenido/index.js";`. En `generateStaticParams` va `guias.map((g) => ({ palabra: g.slug }))`, y cambia `guias[palabra]` por `guiaPorSlug(palabra)` (en los dos lugares).
  - `page.jsx` (inicio), `sitemap.xml/route.js` y `llms.txt/route.js`: `import { guias } from ".../contenido/index.js"` y `listaGuias` → `guias`.

- [ ] **Paso 12: corre las pruebas, el lint y el build**

Run: `npm test` → Expected: todas PASS.
Run: `npm run lint && npm run build` → Expected: sin errores; `/recursos/claude`, `/recursos/resena`, `/recursos/recicla` y `/recursos/competencia` aparecen como estáticas (●/○) en la salida.

- [ ] **Paso 13: comprueba que el build se rompe con contenido malo.** Cambia temporalmente `productoRelacionado: "creador-de-carruseles"` por `"no-existe"` en `recicla`, corre `npm run build` y confirma que falla con `Contenido de MLABS inválido: ... no-existe`. Revierte el cambio.

- [ ] **Paso 14: commit**

```bash
git add -A
git commit -m "MLABS: modelo de contenido validado al compilar y pruebas con node:test"
```

---

## Tarea 2: Desbloqueo de la guía por correo

**Archivos:**
- Crear: `src/app/mlabs/lib/enviarLead.js`, `src/app/mlabs/lib/enviarLead.test.js`, `src/app/mlabs/lib/desbloqueo.js`, `src/app/mlabs/lib/desbloqueo.test.js`, `src/app/mlabs/componentes/Desbloqueo.jsx`, `src/app/mlabs/componentes/Bloque.jsx`
- Renombrar: `src/app/mlabs/recursos/[palabra]/` → `src/app/mlabs/recursos/[slug]/`
- Modificar: `src/app/mlabs/recursos/[slug]/page.jsx`, `src/app/mlabs/FormularioLead.jsx`, `src/app/globals.css`

**Interfaces:**
- Consume: `guiaPorSlug`, `guias` (tarea 1).
- Produce: `enviarLead(datos: object, f = fetch): Promise<true>` (lanza un `Error` con el mensaje de la API si falla).
- Produce, en `lib/desbloqueo.js`: `CLAVE_DESBLOQUEO`, `CLAVE_PENDIENTE`, `almacenSeguro(): Storage|null`, `estaDesbloqueado(almacen): boolean`, `marcarDesbloqueado(almacen): void`, `trasFallo(fallos: number): "mostrar-error"|"desbloquear"`, `guardarPendiente(almacen, datos): void`, `tomarPendiente(almacen): object|null`, `ESTILO_DESBLOQUEADO: string` (script en línea).
- Produce: `<Desbloqueo slug={string}>{secciones bloqueadas}</Desbloqueo>` y `<Bloque b={bloque} />`.

- [ ] **Paso 1: escribe las pruebas que fallan**

`src/app/mlabs/lib/enviarLead.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { enviarLead } from "./enviarLead.js";

const respuesta = (ok, cuerpo) => async () => ({ ok, json: async () => cuerpo });

test("envía el lead como JSON a /api/lead", async () => {
  let llamada;
  const f = async (url, op) => { llamada = { url, op }; return { ok: true, json: async () => ({ ok: true }) }; };
  assert.equal(await enviarLead({ correo: "a@b.co", origen: "guia-resena" }, f), true);
  assert.equal(llamada.url, "/api/lead");
  assert.equal(llamada.op.method, "POST");
  assert.deepEqual(JSON.parse(llamada.op.body), { correo: "a@b.co", origen: "guia-resena" });
});

test("si la API responde error, lanza su mensaje", async () => {
  await assert.rejects(enviarLead({}, respuesta(false, { error: "Faltan datos." })), /Faltan datos\./);
});

test("si la API no devuelve JSON, lanza un mensaje genérico", async () => {
  const f = async () => ({ ok: false, json: async () => { throw new Error("no json"); } });
  await assert.rejects(enviarLead({}, f), /No pudimos guardar tus datos/);
});

test("si no hay red, propaga el error", async () => {
  await assert.rejects(enviarLead({}, async () => { throw new TypeError("Failed to fetch"); }), /Failed to fetch/);
});
```

`src/app/mlabs/lib/desbloqueo.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  estaDesbloqueado, marcarDesbloqueado, trasFallo, guardarPendiente, tomarPendiente, CLAVE_DESBLOQUEO,
} from "./desbloqueo.js";

const memoria = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const roto = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceeded"); }, removeItem() { throw new Error("x"); } };

test("recuerda el desbloqueo", () => {
  const a = memoria();
  assert.equal(estaDesbloqueado(a), false);
  marcarDesbloqueado(a);
  assert.equal(estaDesbloqueado(a), true);
  assert.equal(a.getItem(CLAVE_DESBLOQUEO), "1");
});

test("sin almacenamiento (nulo o que lanza) no rompe nada", () => {
  for (const a of [null, undefined, roto]) {
    assert.equal(estaDesbloqueado(a), false);
    assert.doesNotThrow(() => marcarDesbloqueado(a));
    assert.doesNotThrow(() => guardarPendiente(a, { x: 1 }));
    assert.equal(tomarPendiente(a), null);
  }
});

test("primer fallo muestra error; segundo fallo desbloquea igual", () => {
  assert.equal(trasFallo(1), "mostrar-error");
  assert.equal(trasFallo(2), "desbloquear");
  assert.equal(trasFallo(3), "desbloquear");
});

test("el lead pendiente se guarda y se toma una sola vez", () => {
  const a = memoria();
  guardarPendiente(a, { correo: "a@b.co", origen: "guia-resena" });
  assert.deepEqual(tomarPendiente(a), { correo: "a@b.co", origen: "guia-resena" });
  assert.equal(tomarPendiente(a), null);
});

test("un pendiente corrupto se descarta", () => {
  const a = memoria();
  a.setItem("mlabs:lead-pendiente", "{no es json");
  assert.equal(tomarPendiente(a), null);
});
```

- [ ] **Paso 2: corre las pruebas para confirmar que fallan**

Run: `npm test` → Expected: FAIL (`Cannot find module ./enviarLead.js`, `./desbloqueo.js`).

- [ ] **Paso 3: implementa `lib/enviarLead.js`**

```js
// Envía un lead a /api/lead (Redis + aviso a Telegram). Lanza un Error con un mensaje para mostrarle al usuario.
// `f` se puede reemplazar en las pruebas.
export async function enviarLead(datos, f = fetch) {
  const r = await f("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "No pudimos guardar tus datos.");
  return true;
}
```

- [ ] **Paso 4: implementa `lib/desbloqueo.js`**

```js
// Desbloqueo de guías por correo. Se recuerda en el navegador (localStorage) para no pedir el correo en cada guía.
// Si el navegador no deja guardar (modo privado, navegador de Instagram), todo sigue funcionando: solo no se recuerda.
export const CLAVE_DESBLOQUEO = "mlabs:desbloqueado";
export const CLAVE_PENDIENTE = "mlabs:lead-pendiente";

export function almacenSeguro() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function estaDesbloqueado(almacen) {
  try {
    return almacen?.getItem(CLAVE_DESBLOQUEO) === "1";
  } catch {
    return false;
  }
}

export function marcarDesbloqueado(almacen) {
  try {
    almacen?.setItem(CLAVE_DESBLOQUEO, "1");
  } catch {}
}

// Si /api/lead falla: la primera vez se muestra el error (no se desbloquea, para no perder el correo).
// Desde la segunda, se desbloquea igual y el lead queda pendiente para reintentarlo en la próxima visita.
export const trasFallo = (fallos) => (fallos >= 2 ? "desbloquear" : "mostrar-error");

export function guardarPendiente(almacen, datos) {
  try {
    almacen?.setItem(CLAVE_PENDIENTE, JSON.stringify(datos));
  } catch {}
}

export function tomarPendiente(almacen) {
  try {
    const v = almacen?.getItem(CLAVE_PENDIENTE);
    if (!v) return null;
    almacen.removeItem(CLAVE_PENDIENTE);
    return JSON.parse(v);
  } catch {
    return null;
  }
}

// Script en línea que corre antes de pintar: si ya desbloqueó, muestra el contenido sin parpadeo del formulario (CLS 0).
export const ESTILO_DESBLOQUEADO = `try{if(localStorage.getItem("${CLAVE_DESBLOQUEO}")==="1"){var s=document.createElement("style");s.textContent=".contenido-bloqueado{display:block!important}.formulario-desbloqueo{display:none!important}";document.head.appendChild(s)}}catch(e){}`;
```

- [ ] **Paso 5: corre las pruebas.** Run: `npm test` → Expected: todas PASS.

- [ ] **Paso 6: agrega el estilo base a `src/app/globals.css`** (al final)

```css
/* Guías de MLABS: secciones que se ven solo después de dejar el correo (siguen en el HTML para los buscadores) */
.contenido-bloqueado { display: none; }
```

- [ ] **Paso 7: haz que `FormularioLead.jsx` use `enviarLead` y acepte un mensaje de éxito propio.** Cambios:
  - Agrega `import { enviarLead } from "./lib/enviarLead.js";`
  - Firma: `export default function FormularioLead({ origen = "mlabs", boton = "Enviar", pedirMensaje = true, mensajeOk = "Te escribimos por WhatsApp en menos de un día hábil. Si es urgente, escríbenos tú ahora." })`
  - En `enviar`, reemplaza el bloque `try` por:

```js
    try {
      await enviarLead({ ...datos, origen });
      setEstado("ok");
    } catch (e) {
```

  - En el bloque `estado === "ok"`, el `<p>` muestra `{mensajeOk}`.

- [ ] **Paso 8: renombra la carpeta de la guía y crea `componentes/Bloque.jsx`.** Primero:

```bash
git mv "src/app/mlabs/recursos/[palabra]" "src/app/mlabs/recursos/[slug]"
```

Después mueve aquí la función `Bloque` de la página de guía, sin cambios en su JSX. Agrega `import Copiar from "../recursos/[slug]/Copiar";` y expórtala con `export default function Bloque({ b }) { ... }`.

- [ ] **Paso 9: crea `componentes/Desbloqueo.jsx`**

```jsx
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MLABS_WHATSAPP } from "../MlabsMarco";
import { enviarLead } from "../lib/enviarLead.js";
import {
  almacenSeguro, estaDesbloqueado, marcarDesbloqueado, trasFallo, guardarPendiente, tomarPendiente,
} from "../lib/desbloqueo.js";

const suscribir = (cb) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

// Formulario de correo + secciones bloqueadas de una guía. Las secciones siempre están en el HTML;
// solo se ocultan con la clase .contenido-bloqueado hasta que la persona deja su correo.
export default function Desbloqueo({ slug, children }) {
  const guardado = useSyncExternalStore(suscribir, () => estaDesbloqueado(almacenSeguro()), () => false);
  const [recien, setRecien] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [estado, setEstado] = useState("listo"); // listo | enviando | error
  const [error, setError] = useState("");
  const libre = guardado || recien;

  // Si en una visita anterior el lead no se pudo guardar, se reintenta en silencio.
  useEffect(() => {
    const pendiente = tomarPendiente(almacenSeguro());
    if (pendiente) enviarLead(pendiente).catch(() => guardarPendiente(almacenSeguro(), pendiente));
  }, []);

  const abrir = () => {
    marcarDesbloqueado(almacenSeguro());
    setRecien(true);
  };

  const enviar = async (ev) => {
    ev.preventDefault();
    const datos = { ...Object.fromEntries(new FormData(ev.currentTarget)), origen: `guia-${slug}` };
    setEstado("enviando");
    setError("");
    try {
      await enviarLead(datos);
      abrir();
    } catch (e) {
      const n = fallos + 1;
      setFallos(n);
      if (trasFallo(n) === "desbloquear") {
        guardarPendiente(almacenSeguro(), datos);
        abrir();
      } else {
        setError(e.message);
        setEstado("error");
      }
    }
  };

  const campo = "w-full rounded-2xl border border-black/15 bg-white px-4 py-4 text-base outline-none focus:border-rojo focus:ring-2 focus:ring-rojo/20";
  return (
    <>
      {!libre && (
        <form onSubmit={enviar} className="formulario-desbloqueo mt-10 space-y-3 rounded-[1.75rem] border-2 border-black p-5 sm:p-8">
          <p className="text-2xl font-black">Desbloquea la guía completa</p>
          <p className="leading-7 text-gris">Déjanos tu correo y la ves completa ahora mismo, gratis.</p>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Nombre</span>
            <input name="nombre" required autoComplete="name" className={campo} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Correo</span>
            <input name="correo" required type="email" autoComplete="email" inputMode="email" className={campo} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">WhatsApp (opcional)</span>
            <input name="telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="+57 300 000 0000" className={campo} />
          </label>
          <input name="empresa_web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <label className="flex gap-3 text-sm leading-5 text-gris">
            <input type="checkbox" name="acepta" required className="mt-0.5 h-5 w-5 shrink-0 accent-rojo" />
            <span>
              Acepto que EL METACHO S.A.S. me contacte y trate mis datos según la{" "}
              <a href="https://www.elmetacho.com/privacidad" className="underline">política de privacidad</a>.
            </span>
          </label>
          {estado === "error" && (
            <p className="rounded-2xl bg-rojo/10 p-3 text-sm text-rojo" role="alert">
              {error} Intenta de nuevo o escríbenos por{" "}
              <a href={MLABS_WHATSAPP} className="font-bold underline">WhatsApp</a>.
            </p>
          )}
          <button type="submit" disabled={estado === "enviando"} className="w-full rounded-full bg-rojo px-6 py-4 text-base font-bold text-white disabled:opacity-60">
            {estado === "enviando" ? "Abriendo…" : "Ver la guía completa"}
          </button>
        </form>
      )}
      <div className={libre ? "mt-10 space-y-10" : "contenido-bloqueado mt-10 space-y-10"}>{children}</div>
    </>
  );
}
```

- [ ] **Paso 10: reescribe la página de guía.** En `recursos/[slug]/page.jsx` (ya renombrada en el paso 8):
  - Cambia el parámetro `palabra` por `slug` en todo el archivo (`generateStaticParams` devuelve `{ slug: g.slug }`, y `const { slug } = await params;`).
  - Borra la función `Bloque` y el import de `Copiar`. Importa `Bloque from "../../componentes/Bloque"`, `Desbloqueo from "../../componentes/Desbloqueo"` y `{ ESTILO_DESBLOQUEADO } from "../../lib/desbloqueo.js"`.
  - Agrega `const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });` arriba del componente.
  - Reemplaza el bloque `<div className="mt-10 space-y-10">{g.secciones.map(...)}</div>` por:

```jsx
        <p className="mt-3 text-sm text-stone-500">
          {g.tiempo} min · Actualizada el <time dateTime={g.actualizado}>{fecha(g.actualizado)}</time>
        </p>

        <div className="mt-10 space-y-10">
          {g.secciones.slice(0, libres).map((s) => (
            <Seccion key={s.titulo} s={s} />
          ))}
        </div>

        {g.secciones.length > libres && (
          <>
            <script dangerouslySetInnerHTML={{ __html: ESTILO_DESBLOQUEADO }} />
            <Desbloqueo slug={slug}>
              {g.secciones.slice(libres).map((s) => (
                <Seccion key={s.titulo} s={s} />
              ))}
            </Desbloqueo>
          </>
        )}
```

  - Justo después de `if (!g) notFound();` agrega `const libres = g.seccionesLibres ?? 1;`.
  - Agrega este componente arriba de `Guia`:

```jsx
function Seccion({ s }) {
  return (
    <section>
      <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{s.titulo}</h2>
      <div className="mt-4 space-y-4">
        {s.bloques.map((b, i) => (
          <Bloque key={i} b={b} />
        ))}
      </div>
    </section>
  );
}
```

  - En el CTA final, `origen={`guia-${palabra}`}` pasa a `origen={`instalar-${slug}`}`, para distinguir «Lo instalamos por ti» del desbloqueo.

- [ ] **Paso 11: verifica en el navegador (teléfono).** Corre `npm run dev`, abre `http://mlabs.localhost:3000/recursos/resena` en la pestaña del navegador y usa `resize_window` con el preset `mobile`. Comprueba:
  1. Se ven el resumen y «Las tres reglas»; los prompts no se ven.
  2. `view-source` (o `get_page_text` sobre el HTML) contiene el texto del prompt de reseñas negativas (sirve para el SEO).
  3. Al enviar el formulario con nombre «PRUEBA PLAN», un correo de prueba y la casilla marcada, aparecen los prompts sin recargar. En la consola no hay advertencias de hidratación.
  4. Al recargar, se ven completos de una vez y sin parpadeo del formulario.
  5. Con `localStorage.clear()` y recarga, vuelve a pedir el correo.

  Si `.env.local` no tiene llaves de Redis ni de Telegram, el envío fallará. En ese caso, confirma el comportamiento de fallo: la primera vez sale el error con el enlace a WhatsApp y la segunda vez se desbloquea.

- [ ] **Paso 12: lint, build y commit**

```bash
npm test && npm run lint && npm run build
git add -A
git commit -m "MLABS: guías con desbloqueo por correo (resumen y primera sección libres)"
```

---

## Tarea 3: Producto relacionado y página de preventa

**Archivos:**
- Crear: `src/app/mlabs/lib/precio.js`, `src/app/mlabs/lib/precio.test.js`, `src/app/mlabs/componentes/TarjetaProducto.jsx`, `src/app/mlabs/productos/[slug]/page.jsx`
- Modificar: `src/app/mlabs/recursos/[slug]/page.jsx`

**Interfaces:**
- Consume: `productos`, `productoPorSlug` (tarea 1) y `FormularioLead` con `mensajeOk` (tarea 2).
- Produce: `formatoPrecio(valor: number|null, moneda: "COP"|"USD"): string|null` y `<TarjetaProducto producto={p} />`.

- [ ] **Paso 1: escribe la prueba que falla** (`lib/precio.test.js`)

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatoPrecio } from "./precio.js";

test("pesos colombianos sin decimales y con punto de miles", () => {
  const t = formatoPrecio(97000, "COP");
  assert.ok(t.includes("97.000"), t);
  assert.ok(t.endsWith("COP"), t);
});

test("dólares", () => {
  const t = formatoPrecio(29, "USD");
  assert.ok(t.includes("29") && t.endsWith("USD"), t);
});

test("sin precio devuelve null", () => {
  assert.equal(formatoPrecio(null, "COP"), null);
  assert.equal(formatoPrecio(0, "COP"), null);
});
```

- [ ] **Paso 2: corre la prueba.** Run: `npm test` → Expected: FAIL (`Cannot find module ./precio.js`).

- [ ] **Paso 3: implementa `lib/precio.js`**

```js
// "97.000 COP" / "29 USD". Sin precio (null o 0) devuelve null: la página dice que se anuncia luego.
export function formatoPrecio(valor, moneda) {
  if (!(valor > 0)) return null;
  return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(valor)} ${moneda}`;
}
```

- [ ] **Paso 4: corre la prueba.** Run: `npm test` → Expected: PASS.

- [ ] **Paso 5: crea `componentes/TarjetaProducto.jsx`**

```jsx
import Link from "next/link";

// Tarjeta del producto relacionado al final de una guía. Una sola acción: ir a la página del producto.
export default function TarjetaProducto({ producto: p }) {
  return (
    <Link href={`/productos/${p.slug}`} className="mt-14 block rounded-[1.75rem] border-2 border-black bg-white p-6 transition hover:bg-black hover:text-white sm:p-8">
      <span className="text-xs font-bold uppercase tracking-[0.3em] text-rojo">{p.estado === "preventa" ? "Preventa" : "Producto"}</span>
      <span className="mt-2 block text-2xl font-black leading-tight sm:text-3xl">{p.nombre}</span>
      <span className="mt-2 block leading-7 opacity-80">{p.promesa}</span>
      <span className="mt-4 inline-block font-bold underline">{p.estado === "preventa" ? "Aparta tu cupo →" : "Ver producto →"}</span>
    </Link>
  );
}
```

- [ ] **Paso 6: muéstrala en la guía.** En `recursos/[slug]/page.jsx`, importa `TarjetaProducto` y `productoPorSlug`. Antes del CTA negro «¿Prefieres que lo montemos por ti?», agrega:

```jsx
        {g.productoRelacionado && <TarjetaProducto producto={productoPorSlug(g.productoRelacionado)} />}
```

- [ ] **Paso 7: crea `productos/[slug]/page.jsx`**

```jsx
import { notFound } from "next/navigation";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import FormularioLead from "../../FormularioLead";
import { productos, productoPorSlug } from "../../contenido/index.js";
import { formatoPrecio } from "../../lib/precio.js";

export function generateStaticParams() {
  return productos.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  if (!p) return {};
  return {
    title: { absolute: `${p.nombre} · MLABS by El Metacho` },
    description: p.promesa,
    alternates: { canonical: `https://mlabs.elmetacho.com/productos/${slug}` },
  };
}

function Lista({ titulo, items }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-black tracking-tight">{titulo}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((x) => (
          <li key={x} className="flex gap-3 leading-7 text-stone-700">
            <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-rojo" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function Producto({ params }) {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  if (!p) notFound();
  const lanzamiento = formatoPrecio(p.precioLanzamiento, p.moneda);
  const normal = formatoPrecio(p.precio, p.moneda);

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <article className="mx-auto max-w-2xl px-4 pb-16 pt-24 sm:px-8 sm:pt-32">
        {p.estado === "preventa" && <p className="text-sm font-bold uppercase tracking-[0.3em] text-rojo">Preventa</p>}
        <h1 className="titular-ancho mt-3 text-4xl sm:text-6xl">{p.nombre}</h1>
        <p className="mt-4 text-xl leading-8 text-stone-700">{p.promesa}</p>

        {p.video && (
          <video src={`/videos/${p.video}.mp4`} poster={`/videos/${p.video}.jpg`} controls muted playsInline preload="none"
            aria-label={`El sistema real: ${p.nombre}`} className="mx-auto mt-8 aspect-[9/16] w-60 rounded-[1.6rem] border-4 border-black object-cover sm:w-72" />
        )}

        <Lista titulo="Para quién es" items={p.paraQuien} />
        <Lista titulo="Para quién no es" items={p.noEsPara} />
        <Lista titulo="Qué necesitas" items={p.requisitos} />
        <Lista titulo="Qué incluye" items={p.queIncluye} />

        <section className="mt-10 rounded-[1.75rem] bg-black p-6 text-white sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/60">Precio de lanzamiento</p>
          {lanzamiento ? (
            <p className="mt-2 text-4xl font-black">
              {lanzamiento} {normal && <span className="ml-2 text-xl text-white/50 line-through">{normal}</span>}
            </p>
          ) : (
            <p className="mt-2 text-xl font-black leading-8">Lo anunciamos primero a quienes aparten su cupo.</p>
          )}
          {p.fechaEstimada && <p className="mt-2 text-white/70">Fecha estimada: {p.fechaEstimada}</p>}
          <div className="mt-6 rounded-[1.25rem] bg-white p-4 text-black sm:p-6">
            <p className="mb-4 text-xl font-black">Aparta tu cupo</p>
            <FormularioLead origen={`preventa-${p.slug}`} boton="Apartar mi cupo" pedirMensaje={false}
              mensajeOk="Tu cupo quedó apartado. Te avisamos primero por WhatsApp o correo cuando abra, con el precio de lanzamiento." />
          </div>
        </section>

        {p.faq.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-black tracking-tight">Preguntas frecuentes</h2>
            <dl className="mt-4 space-y-5">
              {p.faq.map((f) => (
                <div key={f.q}>
                  <dt className="font-bold">{f.q}</dt>
                  <dd className="mt-1 leading-7 text-stone-700">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </article>
      <MlabsFooter />
    </main>
  );
}
```

- [ ] **Paso 8: verifica en el navegador (teléfono).** Abre `http://mlabs.localhost:3000/recursos/recicla`, desbloquéala y confirma que al final aparece la tarjeta «Creador de carruseles con Claude». Tócala: abre `/productos/creador-de-carruseles` con «Lo anunciamos primero a quienes aparten su cupo.» Envía el formulario con «PRUEBA PLAN»: debe salir el mensaje de cupo apartado. Abre `/productos/no-existe`: debe dar 404.

- [ ] **Paso 9: lint, build y commit**

```bash
npm test && npm run lint && npm run build
git add -A
git commit -m "MLABS: producto relacionado al final de la guía y página de preventa"
```

---

## Tarea 4: Guía EDITOR y prueba de punta a punta

Los videos de EDITOR (`lab-2026-10-15-25/26/27` en la Sala) mandan a esta guía. Sin ella, el enlace del DM da 404, así que va antes que el buscador.

**Archivos:**
- Modificar: `src/app/mlabs/contenido/guias.js`, `src/app/mlabs/contenido/contenido.test.js`

**Interfaces:**
- Consume: forma de guía (tarea 1) y el producto `editor-automatico` (tarea 1).

- [ ] **Paso 1: escribe la prueba que falla.** Agrégala al final de `contenido.test.js`:

```js
test("la guía EDITOR existe y lleva a la preventa del editor", async () => {
  const c = await import("./index.js");
  const g = c.guiaPorSlug("editor");
  assert.ok(g, "falta la guía editor");
  assert.equal(g.palabra, "EDITOR");
  assert.equal(g.productoRelacionado, "editor-automatico");
  assert.ok(g.secciones.length >= 3);
});
```

- [ ] **Paso 2: corre la prueba.** Run: `npm test` → Expected: FAIL «falta la guía editor».

- [ ] **Paso 3: escribe la guía.** Fuentes: los tres guiones de la Sala (`ArtifactData get` en `https://claude.ai/artifact/9M25yhQgqEYNzR2wCmbvC9`, colección `propuestas`, ids `lab-2026-10-15-25`, `-26` y `-27`; lee el campo `guion` y la `nota`) y el pipeline real en `D:/METACHO CLAUDE/PREMIERE-CLAUDE` (CLAUDE.md, `reels/tools/camara.py`). Reglas:
  - `slug: "editor"`, `palabra: "EDITOR"`, `titulo: "Cómo Claude edita mis videos"`, `tipo: "guia"`, `publicos: ["creadores", "ia-y-developers"]`, `tiempo: 4`, `actualizado: "2026-10-15"`, `productoRelacionado: "editor-automatico"`.
  - `resumen`: 1 o 2 frases que respondan «¿cómo edita Claude tus videos?» con el resultado concreto.
  - De 3 a 5 secciones. La **primera** (libre) explica qué hace el sistema: el antes y el después y qué corta. Las siguientes (bloqueadas) cubren qué piezas usa, el paso a paso para grabar pensando en la edición automática y un `prompt` que la persona pueda usar hoy mismo sin el producto (por ejemplo, para pedirle a Claude la lista de cortes a partir de una transcripción).
  - Un bloque `ojo` con los límites reales (qué no hace bien).
  - Cero datos inventados: solo lo que hace hoy el pipeline del dueño.
  - Agrégala de primera en el arreglo `guias` (es la más reciente).

- [ ] **Paso 4: corre las pruebas.** Run: `npm test` → Expected: PASS.

- [ ] **Paso 5: prueba de punta a punta en el navegador (teléfono)**, con el preset `mobile` y evidencia (capturas):
  1. `http://mlabs.localhost:3000/recursos/editor` carga, y el resumen y la primera sección se ven completos.
  2. Desbloquea con «PRUEBA PLAN» y un correo de prueba → el resto se abre sin recargar.
  3. Al final, la tarjeta «Editor automático con Claude» → `/productos/editor-automatico` → «Aparta tu cupo» → mensaje de cupo apartado.
  4. Confirma con el dueño que llegaron a Telegram los dos avisos (`guia-editor` y `preventa-editor-automatico`). Si en local no hay llaves, esta verificación se hace en la URL de vista previa de Vercel después del push.
  5. Recarga `/recursos/editor` → abre completa y sin parpadeo.

- [ ] **Paso 6: lint, build y commit**

```bash
npm test && npm run lint && npm run build
git add -A
git commit -m "MLABS: guía EDITOR enlazada a la preventa del editor automático"
```

> Aquí queda listo el flujo mínimo de punta a punta del spec (sección 2). Las tareas siguientes agregan búsqueda, catálogo, novedades, SEO y contenido.

---

## Tarea 5: Buscador instantáneo

**Archivos:**
- Crear: `src/app/mlabs/lib/buscar.js`, `src/app/mlabs/lib/buscar.test.js`, `src/app/mlabs/componentes/Buscador.jsx`
- Modificar: `src/app/mlabs/contenido/index.js`, `src/app/mlabs/MlabsMarco.jsx`, más el padding superior de las páginas de MLABS

**Interfaces:**
- Consume: `normalizar` (tarea 1), `guias` y `productos`.
- Produce: `crearIndice(items: {href, titulo, tipo, palabra?, resumen?, publicos?}[]): Entrada[]`, donde `Entrada = { href, titulo, tipo, palabra, p, t }` (`p` es la palabra normalizada y `t` el texto normalizado).
- Produce: `buscar(indice: Entrada[], consulta: string, max = 8): { exacta: Entrada|null, resultados: Entrada[] }`.
- Produce: `indiceBusqueda` exportado desde `contenido/index.js` y `<Buscador indice={Entrada[]} grande?={boolean} />`.

- [ ] **Paso 1: escribe las pruebas que fallan** (`lib/buscar.test.js`)

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearIndice, buscar } from "./buscar.js";

const indice = crearIndice([
  { href: "/recursos/resena", titulo: "Cómo responder reseñas sin sonar a robot", tipo: "prompt", palabra: "RESEÑA", resumen: "Usa la IA para responder", publicos: ["marcas"] },
  { href: "/recursos/recicla", titulo: "Un video, siete piezas de contenido", tipo: "prompt", palabra: "RECICLA", resumen: "Grabas una vez", publicos: ["creadores"] },
  { href: "/productos/editor-automatico", titulo: "Editor automático con Claude", tipo: "producto", resumen: "Claude te edita el video" },
]);

test("la palabra exacta del video encuentra la guía, sin importar tildes ni mayúsculas", () => {
  for (const q of ["RESEÑA", "reseña", "resena", "  Resena  "]) {
    assert.equal(buscar(indice, q).exacta?.href, "/recursos/resena", q);
  }
});

test("busca en título y resumen, y exige todas las palabras", () => {
  const r = buscar(indice, "video siete").resultados.map((x) => x.href);
  assert.deepEqual(r, ["/recursos/recicla"]);
});

test("una palabra parcial encuentra resultados y la coincidencia de palabra clave va primero", () => {
  const r = buscar(indice, "re").resultados.map((x) => x.href);
  assert.equal(r[0], "/recursos/resena");
  assert.equal(buscar(indice, "re").exacta, null);
});

test("encuentra productos", () => {
  assert.deepEqual(buscar(indice, "editor").resultados.map((x) => x.href), ["/productos/editor-automatico"]);
});

test("sin resultados y consulta vacía", () => {
  assert.deepEqual(buscar(indice, "astronauta"), { exacta: null, resultados: [] });
  assert.deepEqual(buscar(indice, "   "), { exacta: null, resultados: [] });
});

test("respeta el máximo", () => {
  assert.equal(buscar(indice, "e", 1).resultados.length, 1);
});
```

- [ ] **Paso 2: corre las pruebas.** Run: `npm test` → Expected: FAIL (`Cannot find module ./buscar.js`).

- [ ] **Paso 3: implementa `lib/buscar.js`**

```js
// Buscador de MLABS: el índice se arma al compilar y la búsqueda corre en el navegador, sin servidor.
import { normalizar } from "./texto.js";

export function crearIndice(items) {
  return items.map(({ href, titulo, tipo, palabra = "", resumen = "", publicos = [] }) => ({
    href,
    titulo,
    tipo,
    palabra,
    p: normalizar(palabra),
    t: normalizar([palabra, titulo, resumen, ...publicos].join(" ")),
  }));
}

export function buscar(indice, consulta, max = 8) {
  const q = normalizar(consulta);
  if (!q) return { exacta: null, resultados: [] };
  const palabras = q.split(/\s+/);
  const exacta = indice.find((x) => x.p && x.p === q) ?? null;
  const resultados = indice
    .filter((x) => palabras.every((w) => x.t.includes(w)))
    .sort((a, b) => Number(b.p.startsWith(q)) - Number(a.p.startsWith(q)))
    .slice(0, max);
  return { exacta, resultados };
}
```

- [ ] **Paso 4: corre las pruebas.** Run: `npm test` → Expected: PASS.

- [ ] **Paso 5: exporta el índice en `contenido/index.js`** (al final)

```js
import { crearIndice } from "../lib/buscar.js";

export const indiceBusqueda = crearIndice([
  ...guias.map((g) => ({ ...g, href: `/recursos/${g.slug}` })),
  ...productos.map((p) => ({ href: `/productos/${p.slug}`, titulo: p.nombre, tipo: "producto", resumen: p.promesa })),
]);
```

(Pon el `import` arriba, con los demás imports.)

- [ ] **Paso 6: crea `componentes/Buscador.jsx`**

```jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buscar } from "../lib/buscar.js";

const ETIQUETA = { guia: "Guía", prompt: "Prompt", "mini-curso": "Mini curso", producto: "Producto" };

// Buscador instantáneo. Escribir la palabra del video y pulsar Enter (o «Ir») abre directo su guía.
export default function Buscador({ indice, grande = false }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const { exacta, resultados } = buscar(indice, q);
  const destino = exacta ?? resultados[0];

  const ir = (ev) => {
    ev.preventDefault();
    if (destino) router.push(destino.href);
  };

  return (
    <form role="search" onSubmit={ir} className="relative">
      <label className="sr-only" htmlFor={grande ? "buscar-grande" : "buscar"}>Busca la palabra del video o un tema</label>
      <div className="flex gap-2">
        <input id={grande ? "buscar-grande" : "buscar"} type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Escribe la palabra del video: RESEÑA, EDITOR…" autoComplete="off" enterKeyHint="go"
          className={`w-full rounded-full border-2 border-black bg-white px-5 outline-none focus:border-rojo ${grande ? "py-4 text-lg" : "py-2.5 text-base"}`} />
        <button type="submit" className="shrink-0 rounded-full bg-rojo px-5 font-bold text-white">Ir</button>
      </div>
      {q.trim() && (
        <ul className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border-2 border-black bg-white shadow-xl">
          {resultados.length === 0 && <li className="p-4 text-sm text-gris">No encontramos «{q}». Prueba con otra palabra o mira todas las guías.</li>}
          {resultados.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className={`block p-4 hover:bg-stone-100 ${r === exacta ? "bg-rojo/10" : ""}`}>
                <span className="text-xs font-bold uppercase tracking-widest text-rojo">{ETIQUETA[r.tipo] ?? r.tipo}{r.palabra && ` · ${r.palabra}`}</span>
                <span className="block font-bold leading-6">{r.titulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
```

- [ ] **Paso 7a: saca las constantes de contacto a un archivo propio.** `FormularioLead.jsx` y `Desbloqueo.jsx` son componentes de cliente que importan `MLABS_WHATSAPP` desde `MlabsMarco.jsx`. Si `MlabsMarco` importa el contenido (paso 7b), todas las guías terminarían en el JavaScript que descarga el teléfono. Crea `src/app/mlabs/enlaces.js`:

```js
// Enlaces de contacto de MLABS. Archivo aparte para que los componentes de cliente no arrastren el contenido del sitio.
export const MLABS_WHATSAPP = "https://wa.me/573202646716?text=Hola%20MLABS%2C%20quiero%20montar%20un%20sistema%20para%20mi%20marca";
export const MLABS_MAILTO = "mailto:contacto@elmetacho.com?subject=Quiero%20trabajar%20con%20MLABS";
```

  En `MlabsMarco.jsx`, borra las dos constantes y agrega `export { MLABS_WHATSAPP, MLABS_MAILTO } from "./enlaces.js";` para que los imports existentes del lado del servidor sigan funcionando. En `FormularioLead.jsx` y `componentes/Desbloqueo.jsx`, importa `MLABS_WHATSAPP` desde `./enlaces.js` y `../enlaces.js`, respectivamente. Revisa con `grep -rn "from \"\.\./MlabsMarco\"\|from \"\./MlabsMarco\"" src/app/mlabs` que ningún archivo con `"use client"` importe `MlabsMarco`.

- [ ] **Paso 7b: pon el buscador en el header de todas las páginas.** En `MlabsMarco.jsx`:
  - `import Buscador from "./componentes/Buscador";` y `import { indiceBusqueda } from "./contenido/index.js";`
  - Dentro del `<header>`, después del `</nav>`, agrega:

```jsx
      <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-8">
        <Buscador indice={indiceBusqueda} />
      </div>
```

  - Junto a «Guías gratis», agrega `<Link href="/novedades" className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:text-rojo sm:inline">Novedades</Link>`. El enlace va a una página que se crea en la tarea 6; antes de eso da 404 en local, y eso es aceptable dentro de la rama.

- [ ] **Paso 8: compensa la altura del header.** Como el header ahora tiene dos filas, en todas las páginas de MLABS cambia `pt-24` por `pt-40` y `sm:pt-32` por `sm:pt-44`:

```bash
grep -rln "pt-24" src/app/mlabs --include=*.jsx | xargs sed -i 's/\bpt-24\b/pt-40/g; s/\bsm:pt-32\b/sm:pt-44/g'
```

Revisa el diff: solo debe tocar el `className` del contenedor principal de cada página.

- [ ] **Paso 9: verifica en el navegador (teléfono).** En `/recursos`, escribe «resena» → el primer resultado es RESEÑA y está resaltado. Pulsa Enter → abre `/recursos/resena`. Escribe «astronauta» → sale el mensaje sin resultados. Confirma que el header no tapa el título de ninguna página (inicio, recursos, guía, producto, pagar).

- [ ] **Paso 10: revisa el tamaño del buscador.** Después de `npm run build`, confirma que `Buscador.jsx` + `buscar.js` + `texto.js` suman menos de 5 KB sin comprimir:

```bash
wc -c src/app/mlabs/componentes/Buscador.jsx src/app/mlabs/lib/buscar.js src/app/mlabs/lib/texto.js
```

- [ ] **Paso 11: lint, build y commit**

```bash
npm test && npm run lint && npm run build
git add -A
git commit -m "MLABS: buscador instantáneo en todas las páginas (tolera tildes y mayúsculas)"
```

---

## Tarea 6: Novedades de IA

Los videos `lab-2026-10-15-34`, `-35` y `-36` mandan a `/novedades`.

**Archivos:**
- Crear: `src/app/mlabs/novedades/page.jsx`
- Modificar: `src/app/mlabs/contenido/novedades.js`, `src/app/mlabs/contenido/contenido.test.js`

**Interfaces:**
- Consume: `novedadesRecientes`, `guiaPorSlug` (tarea 1).

- [ ] **Paso 1: escribe la prueba que falla** (al final de `contenido.test.js`)

```js
test("hay al menos una novedad publicada y todas tienen fuente https", async () => {
  const c = await import("./index.js");
  assert.ok(c.novedades.length >= 1);
  for (const n of c.novedades) assert.match(n.fuente.url, /^https:\/\//);
});
```

- [ ] **Paso 2: corre la prueba.** Run: `npm test` → Expected: FAIL (0 novedades).

- [ ] **Paso 3: verifica las fuentes antes de escribir (regla de verdad).** Abre en el navegador:
  - `https://www.bloomberg.com/news/articles/2026-10-08/google-launches-universal-gemini-ai-agent-for-workplace` (guion 34). Si está tras muro de pago, busca la nota oficial de Google (blog.google o workspace.google.com) sobre el mismo anuncio y usa esa como fuente.
  - `https://anthropic.skilljar.com/` (guion 35). Confirma que los cursos existen, que son gratis y cuáles son los nombres actuales.

  Una novedad que no se pueda verificar **no se agrega**. El guion 36 («deja que la IA te entreviste») es una técnica y no tiene fuente, así que no entra como novedad (ver la nota en la sección de pendientes).

- [ ] **Paso 4: escribe las novedades verificadas** en `contenido/novedades.js`, con esta forma (ejemplo del guion 35; ajusta el texto a lo que confirmaste):

```js
export const novedades = [
  {
    slug: "anthropic-academy-cursos-gratis",
    titulo: "Anthropic tiene cursos gratis para aprender Claude",
    fecha: "2026-10-15",
    fuente: { nombre: "Anthropic Academy", url: "https://anthropic.skilljar.com/" },
    queEs: "Cursos oficiales y gratuitos de Anthropic: Claude 101, Claude Code 101 y AI Fluency para pequeños negocios y trabajo creativo, entre otros.",
    paraQueTeSirve: "Si estás empezando con Claude, son la forma más ordenada de aprender lo básico sin pagar nada.",
    guiaRelacionada: "claude",
  },
];
```

- [ ] **Paso 5: crea `novedades/page.jsx`**

```jsx
import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../MlabsMarco";
import { novedadesRecientes, guiaPorSlug } from "../contenido/index.js";

export const metadata = {
  title: { absolute: "Novedades de IA de la semana · MLABS by El Metacho" },
  description: "Lo nuevo en IA que de verdad le sirve a tu negocio, explicado en dos frases y con la fuente oficial.",
  alternates: { canonical: "https://mlabs.elmetacho.com/novedades" },
};

const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

export default function Novedades() {
  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <h1 className="titular-ancho text-5xl sm:text-7xl">Novedades de IA</h1>
        <p className="mt-4 text-lg leading-8 text-gris">Lo nuevo de la semana que sí le sirve a tu negocio. Cada novedad con su fuente oficial.</p>
        <div className="mt-10 space-y-6">
          {novedadesRecientes.map((n) => {
            const guia = n.guiaRelacionada && guiaPorSlug(n.guiaRelacionada);
            return (
              <article key={n.slug} id={n.slug} className="scroll-mt-44 rounded-[1.5rem] border-2 border-black p-5 sm:p-7">
                <time dateTime={n.fecha} className="text-sm font-bold text-rojo">{fecha(n.fecha)}</time>
                <h2 className="mt-2 text-2xl font-black leading-tight">{n.titulo}</h2>
                <p className="mt-3 leading-7 text-stone-700"><strong>Qué es: </strong>{n.queEs}</p>
                <p className="mt-2 leading-7 text-stone-700"><strong>Para qué te sirve: </strong>{n.paraQueTeSirve}</p>
                <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
                  <a href={n.fuente.url} target="_blank" rel="noopener noreferrer" className="underline">Fuente: {n.fuente.nombre} ↗</a>
                  {guia && <Link href={`/recursos/${guia.slug}`} className="text-rojo underline">Guía: {guia.titulo}</Link>}
                </p>
              </article>
            );
          })}
        </div>
      </div>
      <MlabsFooter />
    </main>
  );
}
```

- [ ] **Paso 6: corre las pruebas y verifica en el navegador** (`npm test` → PASS). Abre `http://mlabs.localhost:3000/novedades` en el teléfono: cada tarjeta tiene su fecha, su fuente con enlace que abre en otra pestaña y su guía relacionada.

- [ ] **Paso 7: lint, build y commit**

```bash
npm test && npm run lint && npm run build
git add -A
git commit -m "MLABS: página de novedades de IA con fuente oficial obligatoria"
```

---

## Tarea 7: Catálogo con filtros y páginas pilar por público

**Archivos:**
- Crear: `src/app/mlabs/lib/filtrar.js`, `src/app/mlabs/lib/filtrar.test.js`, `src/app/mlabs/componentes/TarjetaContenido.jsx`, `src/app/mlabs/componentes/Catalogo.jsx`, `src/app/mlabs/para/[publico]/page.jsx`
- Modificar: `src/app/mlabs/recursos/page.jsx`, `src/app/mlabs/recursos/[slug]/page.jsx` (enlaces a sus pilares)

**Interfaces:**
- Consume: `guias`, `publicos`, `publicoPorSlug`, `productos` (tarea 1).
- Produce: `filtrar(items, { publico?: string|null, tipo?: string|null }): items` y `<TarjetaContenido guia={g} />`.

- [ ] **Paso 1: escribe las pruebas que fallan** (`lib/filtrar.test.js`)

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrar } from "./filtrar.js";

const items = [
  { slug: "a", tipo: "guia", publicos: ["marcas", "creadores"] },
  { slug: "b", tipo: "prompt", publicos: ["marcas"] },
  { slug: "c", tipo: "prompt", publicos: ["creadores"] },
];
const slugs = (l) => l.map((x) => x.slug);

test("sin filtros devuelve todo, en el mismo orden", () => {
  assert.deepEqual(slugs(filtrar(items, {})), ["a", "b", "c"]);
  assert.deepEqual(slugs(filtrar(items, { publico: null, tipo: null })), ["a", "b", "c"]);
});

test("filtra por público", () => {
  assert.deepEqual(slugs(filtrar(items, { publico: "creadores" })), ["a", "c"]);
});

test("filtra por tipo", () => {
  assert.deepEqual(slugs(filtrar(items, { tipo: "prompt" })), ["b", "c"]);
});

test("combina público y tipo", () => {
  assert.deepEqual(slugs(filtrar(items, { publico: "marcas", tipo: "prompt" })), ["b"]);
});

test("sin coincidencias devuelve lista vacía", () => {
  assert.deepEqual(filtrar(items, { publico: "ia-y-developers" }), []);
});
```

- [ ] **Paso 2: corre las pruebas.** Run: `npm test` → Expected: FAIL.

- [ ] **Paso 3: implementa `lib/filtrar.js`**

```js
// Filtro del catálogo: null o vacío = sin filtrar por ese campo.
export const filtrar = (items, { publico, tipo } = {}) =>
  items.filter((x) => (!publico || x.publicos?.includes(publico)) && (!tipo || x.tipo === tipo));
```

- [ ] **Paso 4: corre las pruebas.** Run: `npm test` → Expected: PASS.

- [ ] **Paso 5: crea `componentes/TarjetaContenido.jsx`**

```jsx
import Link from "next/link";

const ETIQUETA = { guia: "Guía", prompt: "Prompt", "mini-curso": "Mini curso" };

// Tarjeta de una guía en los listados. Una sola acción: abrirla.
export default function TarjetaContenido({ guia: g }) {
  return (
    <Link href={`/recursos/${g.slug}`} className="flex h-full flex-col rounded-[1.25rem] border-2 border-black p-5 transition hover:bg-black hover:text-white">
      <span className="text-xs font-bold uppercase tracking-widest text-rojo">{ETIQUETA[g.tipo]} · {g.tiempo} min · Comenta {g.palabra}</span>
      <span className="mt-2 text-lg font-black leading-6">{g.titulo}</span>
      <span className="mt-2 text-sm leading-6 opacity-75">{g.resumen}</span>
    </Link>
  );
}
```

- [ ] **Paso 6: crea `componentes/Catalogo.jsx`**

```jsx
"use client";

import { useState } from "react";
import TarjetaContenido from "./TarjetaContenido";
import { filtrar } from "../lib/filtrar.js";

const TIPOS = [["guia", "Guías"], ["prompt", "Prompts"], ["mini-curso", "Mini cursos"]];

function Chip({ activo, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      className={`rounded-full border-2 border-black px-4 py-2 text-sm font-bold ${activo ? "bg-black text-white" : "bg-white"}`}>
      {children}
    </button>
  );
}

export default function Catalogo({ guias, publicos }) {
  const [publico, setPublico] = useState(null);
  const [tipo, setTipo] = useState(null);
  const lista = filtrar(guias, { publico, tipo });
  const tiposUsados = TIPOS.filter(([t]) => guias.some((g) => g.tipo === t));

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        <Chip activo={!publico} onClick={() => setPublico(null)}>Todos</Chip>
        {publicos.map((p) => (
          <Chip key={p.slug} activo={publico === p.slug} onClick={() => setPublico(p.slug)}>{p.nombre}</Chip>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip activo={!tipo} onClick={() => setTipo(null)}>Todo</Chip>
        {tiposUsados.map(([t, n]) => (
          <Chip key={t} activo={tipo === t} onClick={() => setTipo(t)}>{n}</Chip>
        ))}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {lista.map((g) => <TarjetaContenido key={g.slug} guia={g} />)}
        {lista.length === 0 && <p className="text-gris">Todavía no hay guías con ese filtro.</p>}
      </div>
    </>
  );
}
```

- [ ] **Paso 7: usa el catálogo en `recursos/page.jsx`.** Reemplaza el `<div className="mt-8 grid gap-3">…</div>` por `<Catalogo guias={guias} publicos={publicos} />` (con `import Catalogo from "../componentes/Catalogo";` y `publicos` importado de `../contenido/index.js`). Cambia el texto bajo el título por «Busca la palabra que comentaste en el video arriba o filtra por lo que te interesa.». El `<h1>` pasa a ser «Guías y prompts gratis».

- [ ] **Paso 8: crea `para/[publico]/page.jsx`**

```jsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import TarjetaContenido from "../../componentes/TarjetaContenido";
import { guias, productos, publicos, publicoPorSlug } from "../../contenido/index.js";

export function generateStaticParams() {
  return publicos.map((p) => ({ publico: p.slug }));
}

export async function generateMetadata({ params }) {
  const { publico } = await params;
  const p = publicoPorSlug(publico);
  if (!p) return {};
  return {
    title: { absolute: `${p.titulo} · MLABS` },
    description: p.intro,
    alternates: { canonical: `https://mlabs.elmetacho.com/para/${publico}` },
  };
}

export default async function Pilar({ params }) {
  const { publico } = await params;
  const p = publicoPorSlug(publico);
  if (!p) notFound();
  const suyas = guias.filter((g) => g.publicos.includes(publico));
  const relacionados = productos.filter((x) => suyas.some((g) => g.productoRelacionado === x.slug));

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-rojo">Para {p.nombre.toLowerCase()}</p>
        <h1 className="titular-ancho mt-3 text-4xl sm:text-6xl">{p.titulo}</h1>
        <p className="mt-4 text-lg leading-8 text-gris">{p.intro}</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {suyas.map((g) => <TarjetaContenido key={g.slug} guia={g} />)}
        </div>
        {relacionados.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-black">Productos</h2>
            <ul className="mt-4 space-y-2">
              {relacionados.map((x) => (
                <li key={x.slug}><Link href={`/productos/${x.slug}`} className="font-bold underline">{x.nombre}</Link> · {x.promesa}</li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-12 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
          {publicos.filter((x) => x.slug !== publico).map((x) => (
            <Link key={x.slug} href={`/para/${x.slug}`} className="underline">Para {x.nombre.toLowerCase()}</Link>
          ))}
        </p>
      </div>
      <MlabsFooter />
    </main>
  );
}
```

- [ ] **Paso 9: enlace de vuelta desde cada guía a sus pilares (grupos de temas).** En `recursos/[slug]/page.jsx`, importa `publicoPorSlug` y, debajo de la línea de tiempo y fecha, agrega:

```jsx
        <p className="mt-2 flex flex-wrap gap-x-4 text-sm font-semibold">
          {g.publicos.map((s) => (
            <Link key={s} href={`/para/${s}`} className="text-stone-500 underline hover:text-rojo">{publicoPorSlug(s).nombre}</Link>
          ))}
        </p>
```

- [ ] **Paso 10: verifica en el navegador (teléfono).** En `/recursos`, toca «Creadores de contenido» → solo aparecen guías de creadores. Luego «Prompts» → se combinan los dos filtros. En `/para/marcas` aparecen sus guías y los enlaces a los otros pilares. `/para/astronautas` da 404.

- [ ] **Paso 11: lint, build y commit**

```bash
npm test && npm run lint && npm run build
git add -A
git commit -m "MLABS: catálogo con filtros por público y tipo, y páginas pilar /para"
```

---

## Tarea 8: Inicio reorganizado y 404 de MLABS

**Archivos:**
- Crear: `src/app/mlabs/componentes/CatalogoInicio.jsx`, `src/app/mlabs/not-found.jsx`
- Modificar: `src/app/mlabs/page.jsx`

**Interfaces:**
- Consume: `Buscador`, `indiceBusqueda` (tarea 5), `TarjetaContenido` (tarea 7), `TarjetaProducto` (tarea 3), `guias`, `productos`, `publicos`, `novedadesRecientes`.

- [ ] **Paso 1: crea `componentes/CatalogoInicio.jsx`**

```jsx
import Link from "next/link";
import Buscador from "./Buscador";
import TarjetaContenido from "./TarjetaContenido";
import { guias, productos, publicos, novedadesRecientes, indiceBusqueda } from "../contenido/index.js";

// Parte de arriba del inicio de MLABS: buscador, accesos por público, guías destacadas, productos y novedades.
export default function CatalogoInicio() {
  const destacadas = [...guias].sort((a, b) => b.actualizado.localeCompare(a.actualizado)).slice(0, 4);
  return (
    <section className="papel-cuad px-4 pb-14 pt-40 sm:px-8 sm:pb-20 sm:pt-44">
      <div className="mx-auto max-w-5xl">
        <h1 className="titular-ancho text-5xl sm:text-7xl">Aprende a usar la IA en tu negocio</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-gris">Guías gratis de los videos de Metacho Labs. ¿Viste un video? Escribe la palabra que comentaste.</p>
        <div className="mt-6 max-w-2xl"><Buscador indice={indiceBusqueda} grande /></div>

        <div className="mt-6 flex flex-wrap gap-2">
          {publicos.map((p) => (
            <Link key={p.slug} href={`/para/${p.slug}`} className="rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-bold hover:bg-black hover:text-white">{p.nombre}</Link>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-black">Guías destacadas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {destacadas.map((g) => <TarjetaContenido key={g.slug} guia={g} />)}
        </div>
        <Link href="/recursos" className="mt-4 inline-block font-bold underline">Ver todas las guías →</Link>

        <h2 className="mt-12 text-2xl font-black">Productos</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {productos.map((p) => (
            <Link key={p.slug} href={`/productos/${p.slug}`} className="rounded-[1.25rem] bg-black p-5 text-white">
              <span className="text-xs font-bold uppercase tracking-widest text-rojo">{p.estado === "preventa" ? "Preventa" : "Disponible"}</span>
              <span className="mt-2 block text-lg font-black leading-6">{p.nombre}</span>
              <span className="mt-2 block text-sm leading-6 text-white/75">{p.promesa}</span>
            </Link>
          ))}
        </div>

        {novedadesRecientes.length > 0 && (
          <>
            <h2 className="mt-12 text-2xl font-black">Novedades de IA</h2>
            <ul className="mt-4 space-y-2">
              {novedadesRecientes.slice(0, 3).map((n) => (
                <li key={n.slug}><Link href={`/novedades#${n.slug}`} className="font-bold underline">{n.titulo}</Link></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Paso 2: reorganiza `page.jsx` (inicio).**
  - Importa `CatalogoInicio` y ponlo como primer hijo de `<main>`, después de `<MlabsHeader />`.
  - En la sección hero actual (la primera `papel-cuad`, que después de la tarea 5 tiene `pt-40 sm:pt-44`), cambia ese padding superior por `pt-14 sm:pt-24` (ya no va pegada al header), cambia su `<h1>` por `<h2>` (con las mismas clases) y agrega `id="agencia"`. El inicio debe tener un solo `<h1>`.
  - Al `<video src="/videos/gps.mp4" …>` del hero agrégale `preload="none"`: ya no está en la primera pantalla.
  - Borra la sección de guías del final (la que hace `guias.map(...)` con «El material que prometo al final de cada video…»), porque ahora está arriba. Quita el import de `guias` si queda sin usar.

- [ ] **Paso 3: crea `not-found.jsx`**

```jsx
import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "./MlabsMarco";
import Buscador from "./componentes/Buscador";
import TarjetaContenido from "./componentes/TarjetaContenido";
import { guias, indiceBusqueda } from "./contenido/index.js";

// 404 de MLABS (guía, producto o público que no existe): buscador + guías destacadas.
export default function NoEncontrado() {
  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <h1 className="titular-ancho text-4xl sm:text-6xl">No encontramos esa página</h1>
        <p className="mt-4 text-lg leading-8 text-gris">Escribe la palabra que comentaste en el video:</p>
        <div className="mt-6"><Buscador indice={indiceBusqueda} grande /></div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {guias.slice(0, 4).map((g) => <TarjetaContenido key={g.slug} guia={g} />)}
        </div>
        <Link href="/recursos" className="mt-6 inline-block font-bold underline">Ver todas las guías →</Link>
      </div>
      <MlabsFooter />
    </main>
  );
}
```

> Este 404 aparece cuando una página de MLABS llama a `notFound()`: guía, producto o público que no existe. Una ruta que no existe en absoluto (por ejemplo `mlabs.elmetacho.com/xyz`) usa el 404 general de Next. Eso está fuera del alcance de este plan.

- [ ] **Paso 4: verifica en el navegador (teléfono).** En el inicio, lo primero que se ve es el título y el buscador grande, luego los públicos, las guías, los productos y las novedades, y después la parte de la agencia. `/recursos/no-existe` muestra el 404 con el buscador.

- [ ] **Paso 5: lint, build y commit**

```bash
npm test && npm run lint && npm run build
git add -A
git commit -m "MLABS: inicio con catálogo arriba y 404 con buscador"
```

---

## Tarea 9: SEO (JSON-LD, sitemap, llms.txt) y analítica

**Archivos:**
- Modificar: `src/app/mlabs/recursos/[slug]/page.jsx`, `src/app/mlabs/sitemap.xml/route.js`, `src/app/mlabs/llms.txt/route.js`, `src/app/layout.jsx`, `package.json`

**Interfaces:**
- Consume: `guias`, `productos`, `publicos`, `novedadesRecientes`.

- [ ] **Paso 1: JSON-LD de la guía.** En `recursos/[slug]/page.jsx`, reemplaza el objeto del `<script type="application/ld+json">` por un arreglo `[articulo, ...(g.howto ? [howto] : [])]`. Define antes del `return`:

```js
  const url = `https://mlabs.elmetacho.com/recursos/${slug}`;
  const articulo = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.titulo,
    description: g.resumen,
    inLanguage: "es",
    datePublished: g.actualizado,
    dateModified: g.actualizado,
    mainEntityOfPage: url,
    author: { "@type": "Person", name: "El Metacho", url: "https://www.elmetacho.com" },
    publisher: { "@type": "Organization", name: "MLABS", url: "https://mlabs.elmetacho.com" },
  };
  const howto = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: g.titulo,
    description: g.resumen,
    totalTime: `PT${g.tiempo}M`,
    step: g.secciones.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.titulo, url: `${url}#paso-${i + 1}` })),
  };
```

  Para que funcionen los anclajes, el componente `Seccion` recibe `id` (`<section id={`paso-${i + 1}`}>`). Pásale el índice real desde los dos `map`: en las secciones bloqueadas el índice es `i + libres`.

  > Ojo (regla de verdad): desde 2023 Google ya no muestra resultados enriquecidos de `HowTo`. El marcado sigue siendo válido y lo leen otros buscadores y las IA, pero no esperes ver los pasos en Google.

- [ ] **Paso 2: sitemap con todas las piezas y fechas.** Reemplaza el cuerpo de `GET` en `sitemap.xml/route.js`:

```js
import { guias, productos, publicos, novedadesRecientes } from "../contenido/index.js";

export const dynamic = "force-static";

export function GET() {
  const base = "https://mlabs.elmetacho.com";
  const urls = [
    { u: "" },
    { u: "/recursos" },
    { u: "/novedades", f: novedadesRecientes[0]?.fecha },
    ...guias.map((g) => ({ u: `/recursos/${g.slug}`, f: g.actualizado })),
    ...productos.map((p) => ({ u: `/productos/${p.slug}` })),
    ...publicos.map((p) => ({ u: `/para/${p.slug}` })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(({ u, f }) => `  <url><loc>${base}${u}</loc>${f ? `<lastmod>${f}</lastmod>` : ""}</url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
```

- [ ] **Paso 3: llms.txt desde el contenido.** En `llms.txt/route.js`, importa `guias`, `productos`, `publicos` y `novedadesRecientes`. Agrega a `## Páginas` las líneas `- [Novedades de IA](${base}/novedades): ...`, y después de `## Guías` agrega:

```js
## Productos (preventa)
${productos.map((p) => `- [${p.nombre}](${base}/productos/${p.slug}): ${p.promesa}`).join("\n")}

## Por público
${publicos.map((p) => `- [${p.titulo}](${base}/para/${p.slug}): ${p.intro}`).join("\n")}

## Novedades recientes
${novedadesRecientes.slice(0, 10).map((n) => `- ${n.titulo} (${n.fecha}): ${n.queEs} Fuente: ${n.fuente.url}`).join("\n")}
```

- [ ] **Paso 4: verifica.** Con `npm run build && npm start`, abre `http://mlabs.localhost:3000/sitemap.xml` y `/llms.txt`: aparecen las guías, los productos, los pilares y las novedades. Pega el HTML de `/recursos/recicla` en https://validator.schema.org (o revisa el JSON-LD a mano): `Article` y `HowTo` válidos.

- [ ] **Paso 5: Vercel Web Analytics.** Antes de instalar, revisa la documentación vigente en https://vercel.com/docs/analytics/quickstart para confirmar el import en Next.js. Al escribir este plan era `@vercel/analytics/next`.

```bash
npm install @vercel/analytics
```

  En `src/app/layout.jsx`, agrega `import { Analytics } from "@vercel/analytics/next";` y `<Analytics />` justo antes de cerrar `</body>`.

  > Verificado al escribir este plan ([precios de Web Analytics](https://vercel.com/docs/analytics/limits-and-pricing)): el plan Hobby da 50.000 eventos al mes, **sin eventos personalizados**, y al pasarse deja de registrar por un tiempo. Por eso «qué palabra trae más correos» se mide con el campo `origen` de los leads en Redis (`guia-<slug>`, `preventa-<slug>`), no con Analytics. Analytics mide visitas por página. **El dueño debe activar Web Analytics** en Vercel: proyecto → Analytics → Enable.

- [ ] **Paso 6: lint, build y commit**

```bash
npm test && npm run lint && npm run build
git add -A
git commit -m "MLABS: JSON-LD con fechas, sitemap y llms.txt completos, y Vercel Analytics"
```

---

## Tarea 10: Las 6 guías cortas del banco de ideas

**Archivos:**
- Modificar: `src/app/mlabs/contenido/guias.js`, `src/app/mlabs/contenido/contenido.test.js`

- [ ] **Paso 1: escribe la prueba que falla**

```js
test("están las guías del contenido inicial del spec", async () => {
  const c = await import("./index.js");
  const palabras = c.guias.map((g) => g.palabra);
  for (const p of ["CLAUDE", "RESEÑA", "RECICLA", "COMPETENCIA", "EDITOR", "FICHA", "CALENDARIO", "CLIENTE", "DICTA", "FORMULA", "PRECIO"])
    assert.ok(palabras.includes(p), `falta ${p}`);
});
```

- [ ] **Paso 2: corre la prueba.** Run: `npm test` → Expected: FAIL «falta FICHA».

- [ ] **Paso 3: escribe las 6 guías.** Cada una de 3 a 5 minutos (`tiempo` de 3 a 5), `actualizado: "2026-10-15"`, sin producto relacionado (terminan en «Lo instalamos por ti»), de 2 a 4 secciones con al menos un `prompt` listo para copiar y un `ojo` con el límite honesto. Fuente: el guion correspondiente de la Sala (`ArtifactData get`, colección `propuestas`). Usa sus datos y su tono, y no inventes cifras:

| slug | palabra | Guion de la Sala | titulo | tipo | publicos |
|---|---|---|---|---|---|
| `ficha` | FICHA | `lab-2026-10-14-09` | Descripciones de producto que venden, en un minuto | prompt | emprendedores, marcas |
| `calendario` | CALENDARIO | `lab-2026-10-14-13` | Un mes de contenido en diez minutos | prompt | creadores, marcas |
| `cliente` | CLIENTE | `lab-2026-10-14-14` | Descubre de qué se quejan tus clientes | prompt | emprendedores, marcas |
| `dicta` | DICTA | `lab-2026-10-14-17` | Dicta tus ideas y conviértelas en publicaciones | guia | creadores, emprendedores |
| `formula` | FORMULA | `lab-2026-10-14-18` | Fórmulas de Excel sin saber Excel | prompt | emprendedores, ia-y-developers |
| `precio` | PRECIO | `lab-2026-10-14-20` | Usa la IA para pensar tu precio, no para decidirlo | guia | emprendedores |

- [ ] **Paso 4: corre las pruebas** (`npm test` → PASS) y revisa en el navegador que las 6 abran, que se desbloqueen y que el buscador las encuentre por su palabra.

- [ ] **Paso 5: commit**

```bash
git add -A
git commit -m "MLABS: seis guías cortas (FICHA, CALENDARIO, CLIENTE, DICTA, FORMULA, PRECIO)"
```

---

## Tarea 11: Verificación final y PR

- [ ] **Paso 1: todo en verde**

```bash
npm test && npm run lint && npm run build
```

Expected: 0 fallos y 0 errores. Todas las rutas nuevas aparecen como estáticas en la salida del build.

- [ ] **Paso 2: pídele al dueño los precios y las fechas** de los dos productos (decisión pendiente 1 del spec), una pregunta a la vez. Si los da, ponlos en `productos.js`. Si no, la preventa sale con «Lo anunciamos primero a quienes aparten su cupo.»

- [ ] **Paso 3: el dueño hace el push.** Vercel crea la URL de vista previa del PR. Pásale al dueño el comando:

```bash
git push -u origin feat/mlabs-parte-a
```

- [ ] **Paso 4: prueba de punta a punta en la vista previa (teléfono)**, con capturas como evidencia: enlace de guía → desbloqueo → lead guardado → tarjeta de producto → preventa → lead guardado. El dueño confirma que llegaron los dos avisos a Telegram. Las vistas previas de Vercel solo responden al host mlabs si se configura un dominio de vista previa; si no se puede, esta prueba se hace en `mlabs.localhost` con las llaves del dueño en `.env.local`. Anota en el PR cuál de las dos se usó.

- [ ] **Paso 5: Lighthouse en móvil** sobre la vista previa (o sobre `npm start` local):

```bash
npx lighthouse http://mlabs.localhost:3000/recursos/editor --form-factor=mobile --only-categories=performance --quiet --output=json --output-path=./lighthouse-editor.json
```

Revisa en el JSON `audits["largest-contentful-paint"].numericValue` < 2500 y `audits["cumulative-layout-shift"].numericValue` < 0.1. Repite con `/` y `/productos/editor-automatico`. No hagas commit del JSON. Pon los números en el PR.

- [ ] **Paso 6: abre el PR** contra `main` con el resumen, la evidencia (capturas y Lighthouse) y lo que debe hacer el dueño: activar Web Analytics y revisar los textos de los productos y las guías. **El dueño aprueba el merge** (merge = publicación).

- [ ] **Paso 7: después del merge**, comprueba en vivo `https://mlabs.elmetacho.com/recursos/editor`, `/novedades`, `/productos/editor-automatico`, `/sitemap.xml` y `/llms.txt`. Actualiza `docs/BRIEF.md` (Resumen de sesiones).

---

## Pendientes fuera de este plan (anotados para el dueño)

- **Sellame:** los guiones de RESEÑA (`lab-2026-10-15-28/29/30`) dicen que llevan a un «sistema de fidelización (Sellame)» que no está en el spec. En este plan, RESEÑA termina en «Lo instalamos por ti». Si Sellame va a ser un producto, se agrega a `productos.js` en una sola línea de contenido.
- **Guion 36** («deja que la IA te entreviste primero»): es una técnica y no tiene fuente, así que no puede ser novedad. El video manda a `/novedades`, que existe, pero no habrá una tarjeta para él. Puede convertirse en guía corta más adelante.
- Search Console y Bing Webmaster: los verifica el dueño (registro DNS en Squarespace).
- ManyChat (plan Essential) para los DMs: decisión pendiente 3 del spec.
