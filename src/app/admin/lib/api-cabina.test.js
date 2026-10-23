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
