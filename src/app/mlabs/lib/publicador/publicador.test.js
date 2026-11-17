import { test } from "node:test";
import assert from "node:assert/strict";
import { modoPublicador, validarEntrada, nuevoItem, pasoPublicador, CUENTA_PUBLICAR } from "./publicador.js";

const env = { MLABS_PUBLICADOR: "activo", IG_CUENTA_PUBLICAR: CUENTA_PUBLICAR };
const entrada = (x = {}) => ({ id: "lab-001", video: "publicar/lab-001/video.mp4", portada: "publicar/lab-001/portada.jpg", caption: "Hola #ia", programado: "2026-11-17T12:30:00-05:00", ...x });
const T0 = Date.parse("2026-11-17T18:00:00Z");

function mundo(items, { limite = { usado: 0, total: 50 }, estado = "FINISHED" } = {}) {
  const m = { items: new Map(items.map((i) => [i.id, i])), avisos: [], llamadas: [], borrados: [] };
  m.deps = {
    env, ahora: T0,
    almacen: {
      pendientes: async (ahora) => [...m.items.values()].filter((i) => ["cola", "procesando"].includes(i.estado) && Date.parse(i.programado) <= ahora),
      guardar: async (i) => void m.items.set(i.id, i),
    },
    ig: {
      limite: async () => { m.llamadas.push("limite"); return limite; },
      crear: async (cuenta, d) => { m.llamadas.push(["crear", cuenta, d.video_url, d.cover_url]); return "C1"; },
      estado: async () => { m.llamadas.push("estado"); return estado; },
      publicar: async (cuenta, c) => { m.llamadas.push(["publicar", cuenta, c]); return "M1"; },
    },
    blob: { enlace: async (p) => `https://blob/${p}?firma`, borrar: async (l) => void m.borrados.push(...l) },
    avisar: async (t) => void m.avisos.push(t),
  };
  return m;
}

test("interruptor y candado: apagado salvo activo/simulacro con el id exacto de @metacholabs", () => {
  assert.equal(modoPublicador(env), "activo");
  assert.equal(modoPublicador({ ...env, MLABS_PUBLICADOR: "simulacro" }), "simulacro");
  assert.equal(modoPublicador({ ...env, MLABS_PUBLICADOR: "si" }), null);
  assert.equal(modoPublicador({ ...env, IG_CUENTA_PUBLICAR: "17841400000000000" }), null);
  assert.equal(modoPublicador({}), null);
});

test("validar la entrada: rutas, caption, hashtags, fecha y cuenta", () => {
  assert.deepEqual(validarEntrada(entrada()), []);
  assert.ok(validarEntrada(entrada({ cuenta: "123" })).some((e) => e.includes("@metacholabs")));
  assert.ok(validarEntrada(entrada({ video: "otra/ruta.mp4" })).length);
  assert.ok(validarEntrada(entrada({ caption: " " })).length);
  assert.ok(validarEntrada(entrada({ caption: Array.from({ length: 31 }, (_, i) => `#t${i}`).join(" ") })).some((e) => e.includes("30")));
  assert.ok(validarEntrada(entrada({ programado: "mañana" })).length);
});

test("apagado: no toca nada", async () => {
  const m = mundo([nuevoItem(entrada(), T0)]);
  const r = await pasoPublicador({ ...m.deps, env: {} });
  assert.equal(r.estado, "apagado");
  assert.equal(m.llamadas.length, 0);
});

test("flujo completo: límite → contenedor con links temporales → FINISHED → publica y borra los archivos", async () => {
  const m = mundo([nuevoItem(entrada(), T0)]);
  await pasoPublicador(m.deps);
  assert.equal(m.items.get("lab-001").estado, "procesando");
  assert.deepEqual(m.llamadas[1], ["crear", CUENTA_PUBLICAR, "https://blob/publicar/lab-001/video.mp4?firma", "https://blob/publicar/lab-001/portada.jpg?firma"]);
  await pasoPublicador({ ...m.deps, ahora: T0 + 5 * 60e3 });
  const i = m.items.get("lab-001");
  assert.deepEqual([i.estado, i.media], ["publicado", "M1"]);
  assert.deepEqual(m.borrados, ["publicar/lab-001/video.mp4", "publicar/lab-001/portada.jpg"]);
  assert.match(m.avisos.at(-1), /Publicado/);
});

test("no publica lo programado para después", async () => {
  const m = mundo([nuevoItem(entrada({ programado: "2026-11-18T12:00:00Z" }), T0)]);
  await pasoPublicador(m.deps);
  assert.equal(m.llamadas.length, 0);
});

test("límite de 24 h lleno: espera y avisa, sin crear contenedor", async () => {
  const m = mundo([nuevoItem(entrada(), T0)], { limite: { usado: 50, total: 50 } });
  await pasoPublicador(m.deps);
  assert.equal(m.items.get("lab-001").estado, "cola");
  assert.ok(!m.llamadas.some((l) => Array.isArray(l) && l[0] === "crear"));
  assert.match(m.avisos[0], /límite/);
});

test("simulacro: avisa y no llama a Meta", async () => {
  const m = mundo([nuevoItem(entrada(), T0)]);
  await pasoPublicador({ ...m.deps, env: { ...env, MLABS_PUBLICADOR: "simulacro" } });
  assert.equal(m.items.get("lab-001").estado, "simulado");
  assert.equal(m.llamadas.length, 0);
  assert.match(m.avisos[0], /simulacro/);
});

test("contenedor con ERROR o que no termina en 1 h: error y aviso, archivos intactos", async () => {
  for (const [estado, espera] of [["ERROR", 5 * 60e3], ["IN_PROGRESS", 61 * 60e3]]) {
    const m = mundo([{ ...nuevoItem(entrada(), T0), estado: "procesando", contenedor: "C1", enviado: new Date(T0).toISOString() }], { estado });
    await pasoPublicador({ ...m.deps, ahora: T0 + espera });
    assert.equal(m.items.get("lab-001").estado, "error");
    assert.equal(m.borrados.length, 0);
    assert.match(m.avisos[0], /No se publicó/);
  }
});

test("candado en el cron: un registro con otra cuenta no publica", async () => {
  const m = mundo([{ ...nuevoItem(entrada(), T0), cuenta: "17841400000000000" }]);
  await pasoPublicador(m.deps);
  assert.equal(m.items.get("lab-001").estado, "error");
  assert.equal(m.llamadas.length, 0);
  assert.match(m.avisos[0], /otra cuenta/);
});

test("fallo de red: reintenta 2 veces y a la tercera avisa", async () => {
  const m = mundo([nuevoItem(entrada(), T0)]);
  m.deps.ig.limite = async () => { throw new Error("timeout"); };
  for (let k = 0; k < 3; k++) await pasoPublicador(m.deps);
  assert.equal(m.items.get("lab-001").estado, "error");
  assert.equal(m.avisos.length, 1);
});
