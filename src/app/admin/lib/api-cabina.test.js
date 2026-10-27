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

test("publicar: en_revision, vence a las 72 h, sin aviso por Telegram; repetir = 200 igual", async () => {
  const m = montar();
  const id = await subido(m);
  const r = await m.api.pcCabinaPublicar(pc({}), id);
  assert.deepEqual(await r.json(), { ok: true, version: 1, vence: new Date(T + 72 * H).toISOString() });
  const p = await m.almacen.leer(id);
  assert.deepEqual([p.estado, p.revision.orden, p.revision.fuera, "comentarios_cabina" in p], ["en_revision", ["c1", "c2"], ["c3"], false]);
  assert.equal(m.avisos.length, 0);
  const otra = await m.api.pcCabinaPublicar(pc({}), id);
  assert.deepEqual([otra.status, (await otra.json()).version, m.avisos.length], [200, 1, 0]);
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

test("lista: un borrarPrefijo que lanza en un candidato a purgar no tumba el GET; se reintenta después", async () => {
  const reloj = { t: T };
  const m = montar(reloj);
  const viejo = await crear(m);
  const decidido = await publicado(m);
  await aprobadoAMano(m, decidido);
  reloj.t = T + 24 * H + 1000;   // `viejo` (sin publicar) toca purgar
  let falla = true;
  const api = crearApi({
    almacen: m.almacen, env: { ADMIN_CLAVE: "secreta", ADMIN_PC_TOKEN: "pc-tok" }, ahora: () => reloj.t,
    blob: { tamano: async () => null, enlace: async (p) => `https://firmado/${p}`, tokenSubida: async () => "t",
      borrarPrefijo: async (pre) => { if (falla) throw new Error("Blob caído"); m.borrados.push(pre); } },
    avisar: async () => {},
  });
  const r = await api.pcCabinaLista(pc(undefined, "GET"));
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).decididos.map((d) => d.id), [decidido]);
  assert.notEqual(await m.almacen.leer(viejo), null);   // sigue ahí: se reintenta
  falla = false;
  assert.equal((await api.pcCabinaLista(pc(undefined, "GET"))).status, 200);
  assert.equal(await m.almacen.leer(viejo), null);
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

test("Oscar agrega un comentario suyo: se guarda con la revisión y el PC lo recibe marcado", async () => {
  const m = montar();
  const id = await publicado(m);
  const propios = [{ id: "o1", texto: "mi comentario" }];
  assert.equal((await m.api.revision(sesion({ orden: ["o1", "c1"], fuera: ["c3", "c2"], lineas: {}, propios, version: 1 }, "PATCH"), id)).status, 200);
  assert.deepEqual((await m.almacen.leer(id)).revision.propios, propios);
  const mal = await m.api.revision(sesion({ orden: ["c1"], fuera: ["c3", "c2"], propios, version: 1 }, "PATCH"), id);
  assert.equal(mal.status, 400);
  await aprobadoAMano(m, id);
  const p = await m.almacen.leer(id);
  await m.almacen.guardar({ ...p, revision: { ...p.revision, orden: ["o1", "c2"], fuera: ["c1", "c3"], lineas: {}, propios } });
  const [d] = (await lista(m)).decididos;
  assert.deepEqual(d.orden, [{ id: "o1", linea: "mi comentario,", texto: "mi comentario", propio: true }, { id: "c2", linea: "uy no," }]);
});
