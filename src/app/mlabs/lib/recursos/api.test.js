import { test } from "node:test";
import assert from "node:assert/strict";
import { guardarRecurso, listarRecursos, reglaConRecurso, CUENTA_LABS } from "./api.js";

const guia = (extra = {}) => ({
  slug: "skills", palabra: "SKILLS", titulo: "Skills", resumen: "R", tipo: "guia", publicos: ["marcas"], tiempo: 3,
  actualizado: "2026-11-16", secciones: [{ titulo: "S1", bloques: [{ p: "x" }] }, { titulo: "S2", bloques: [{ p: "y" }] }], ...extra,
});
const contexto = { heredadas: [{ slug: "resena", palabra: "RESEÑA", titulo: "R" }], slugsPublicos: new Set(["marcas"]), slugsProductos: new Set(), reservadas: ["NOVEDADES"] };

function memoria(disparadores = []) {
  const m = { recursos: new Map(), disp: { [CUENTA_LABS]: disparadores }, revalidados: [] };
  m.almacen = {
    leerRecursos: async () => [...m.recursos.values()],
    guardarRecurso: async (g) => void m.recursos.set(g.slug, g),
    leerDisparadores: async (c) => m.disp[c] ?? [],
    guardarDisparadores: async (c, l) => void (m.disp[c] = l),
  };
  return m;
}
let n = 0;
const nuevoId = () => `id${++n}`;

test("guarda el recurso y crea la regla palabra → link en un paso", async () => {
  const m = memoria();
  const r = await guardarRecurso({ recurso: guia() }, { almacen: m.almacen, contexto, nuevoId, revalidar: (s) => m.revalidados.push(s) });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.link, "https://mlabs.elmetacho.com/recursos/skills");
  assert.ok(m.recursos.has("skills"));
  const d = m.disp[CUENTA_LABS];
  assert.equal(d.length, 1);
  assert.equal(d[0].link, "https://mlabs.elmetacho.com/recursos/skills");
  assert.equal(d[0].palabra, "SKILLS");
  assert.deepEqual(m.revalidados, ["skills"]);
});

test("actualiza la regla existente de la misma palabra sin duplicarla", async () => {
  const previa = { id: "x1", palabra: "skills", respuesta_publica: "Va por DM", mensaje_dm: "Toma", link: "https://otro.com", pedir_seguir: true, activa: false };
  const m = memoria([previa]);
  const r = await guardarRecurso({ recurso: guia() }, { almacen: m.almacen, contexto, nuevoId });
  assert.equal(r.status, 200);
  const [d] = m.disp[CUENTA_LABS];
  assert.equal(m.disp[CUENTA_LABS].length, 1);
  assert.deepEqual([d.id, d.respuesta_publica, d.pedir_seguir, d.activa], ["x1", "Va por DM", true, false]);
  assert.equal(d.link, "https://mlabs.elmetacho.com/recursos/skills");
});

test("regla: false solo guarda el recurso (migración)", async () => {
  const m = memoria();
  const r = await guardarRecurso({ recurso: guia(), regla: false }, { almacen: m.almacen, contexto, nuevoId });
  assert.equal(r.status, 200);
  assert.deepEqual(m.disp[CUENTA_LABS], []);
  assert.equal(r.body.regla, null);
});

test("candado: otra cuenta se rechaza y no se guarda nada", async () => {
  const m = memoria();
  const r = await guardarRecurso({ recurso: guia(), cuenta: "123" }, { almacen: m.almacen, contexto, nuevoId });
  assert.equal(r.status, 403);
  assert.equal(m.recursos.size, 0);
});

test("recurso inválido o palabra ocupada: 400 y nada guardado", async () => {
  const m = memoria();
  assert.equal((await guardarRecurso({ recurso: guia({ tipo: "x" }) }, { almacen: m.almacen, contexto, nuevoId })).status, 400);
  const r = await guardarRecurso({ recurso: guia({ slug: "otra", palabra: "Reseña" }) }, { almacen: m.almacen, contexto, nuevoId });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /ya es de otro recurso/);
  assert.equal((await guardarRecurso({ recurso: guia({ palabra: "NOVEDADES" }) }, { almacen: m.almacen, contexto, nuevoId })).status, 400);
  assert.equal(m.recursos.size, 0);
});

test("reemplazar un recurso propio con la misma palabra está permitido", async () => {
  const m = memoria();
  await guardarRecurso({ recurso: guia() }, { almacen: m.almacen, contexto, nuevoId });
  const r = await guardarRecurso({ recurso: guia({ titulo: "Nuevo" }) }, { almacen: m.almacen, contexto, nuevoId });
  assert.equal(r.status, 200);
  assert.equal(m.recursos.get("skills").titulo, "Nuevo");
});

test("migrar una heredada: el mismo slug puede pasar a Redis", async () => {
  const m = memoria();
  const r = await guardarRecurso({ recurso: guia({ slug: "resena", palabra: "RESEÑA" }), regla: false }, { almacen: m.almacen, contexto, nuevoId });
  assert.equal(r.status, 200, JSON.stringify(r.body));
});

test("reglaConRecurso respeta textos dados", () => {
  const l = reglaConRecurso([], guia(), { mensaje_dm: "Hola", pedir_seguir: true }, () => "n");
  assert.deepEqual([l[0].mensaje_dm, l[0].pedir_seguir, l[0].activa], ["Hola", true, true]);
});

test("listar indica si cada recurso viene de Redis o del código", async () => {
  const m = memoria();
  await guardarRecurso({ recurso: guia(), regla: false }, { almacen: m.almacen, contexto, nuevoId });
  const r = await listarRecursos({ almacen: m.almacen, contexto });
  assert.deepEqual(r.body.recursos.map((x) => `${x.slug}:${x.origen}`), ["skills:redis", "resena:codigo"]);
});

test("palabra suelta → página de mlabs (p. ej. /ahorra): upsert, candado y solo links de mlabs", async () => {
  const { guardarPalabra } = await import("./api.js");
  const m = memoria([{ id: "z", palabra: "Ahorra", respuesta_publica: "Va", mensaje_dm: "Toma", link: "https://mlabs.elmetacho.com/recursos/x", pedir_seguir: true, activa: true }]);
  const r = await guardarPalabra({ palabra: "AHORRA", link: "https://mlabs.elmetacho.com/ahorra" }, { almacen: m.almacen, nuevoId });
  assert.equal(r.status, 200);
  assert.equal(m.disp[CUENTA_LABS].length, 1);
  assert.deepEqual([r.body.regla.id, r.body.regla.link, r.body.regla.pedir_seguir], ["z", "https://mlabs.elmetacho.com/ahorra", true]);
  assert.equal((await guardarPalabra({ palabra: "X", link: "https://otro.com/a" }, { almacen: m.almacen, nuevoId })).status, 400);
  assert.equal((await guardarPalabra({ palabra: "X", link: "https://mlabs.elmetacho.com/a", cuenta: "1" }, { almacen: m.almacen, nuevoId })).status, 403);
});
