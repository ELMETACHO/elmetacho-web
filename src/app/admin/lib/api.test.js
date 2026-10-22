import { test } from "node:test";
import assert from "node:assert/strict";
import { crearApi } from "./api.js";
import { almacenMemoria } from "./almacen-memoria.js";
import { firmarSesion } from "./sesion.js";
import { aplicarRevision, aprobarRevision, pedirMas } from "./revision.js";

const T = Date.parse("2026-10-21T18:30:00Z");
function montar(reloj = { t: T }) {
  const almacen = almacenMemoria(), borrados = [], avisos = [], tamanos = new Map();
  const api = crearApi({
    almacen, env: { ADMIN_CLAVE: "secreta", ADMIN_PC_TOKEN: "pc-tok" }, ahora: () => reloj.t, azar: () => "ab12",
    blob: { tamano: async (p) => tamanos.get(p) ?? null, borrarPrefijo: async (pre) => void borrados.push(pre), enlace: async (p) => `https://firmado/${p}` },
    avisar: async (t) => void avisos.push(t),
  });
  return { api, almacen, borrados, avisos, tamanos };
}
const conSesion = (cuerpo, metodo = "POST") => new Request("https://x/admin/api", {
  method: metodo, headers: { cookie: `admin_sesion=${firmarSesion("secreta", T)}`, "x-forwarded-for": "1.1.1.1" },
  body: cuerpo ? JSON.stringify(cuerpo) : undefined,
});
const sinSesion = (cuerpo) => new Request("https://x/admin/api", { method: "POST", body: JSON.stringify(cuerpo || {}), headers: { "x-forwarded-for": "2.2.2.2" } });
const pc = (tok = "pc-tok") => new Request("https://x/admin/api/pc", { method: "POST", headers: { authorization: `Bearer ${tok}` } });

test("ninguna API de sesión responde sin cookie, y el token del PC no sirve ahí", async () => {
  const { api } = montar();
  for (const f of ["crear", "cambiar", "enviar", "cancelar", "salir"]) assert.equal((await api[f](sinSesion(), "c_20261021_ab12")).status, 401, f);
  assert.equal((await api.crear(pc())).status, 401);
});
test("las API del PC exigen su token", async () => {
  const { api } = montar();
  for (const f of ["pcPedidos", "pcBajado", "pcFallido", "pcEntregado"]) {
    assert.equal((await api[f](conSesion(), "x")).status, 401, f);
    assert.equal((await api[f](pc("malo"), "x")).status, 401, f);
  }
});
test("entrar: clave buena pone cookie; 5 malas bloquean", async () => {
  const { api } = montar();
  const ok = await api.entrar(sinSesion({ clave: "secreta" }));
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("set-cookie"), /admin_sesion=/);
  for (let k = 0; k < 5; k++) assert.equal((await api.entrar(sinSesion({ clave: "mala" }))).status, 401);
  assert.equal((await api.entrar(sinSesion({ clave: "secreta" }))).status, 429);
});
test("flujo completo: crear, subir, cambiar, enviar avisa, el PC lo baja y se borran los blobs", async () => {
  const { api, almacen, borrados, avisos, tamanos } = montar();
  const { id } = await (await api.crear(conSesion())).json();
  assert.equal(id, "c_20261021_ab12");
  const base = `cantados/${id}/`;
  for (const [n, t] of [["original.mp4", 500], ["gancho.mov", 300], ["p01.jpg", 10]]) tamanos.set(base + n, t);
  let r = await api.cambiar(conSesion({ original: { pathname: base + "original.mp4", tamano: 500, duracion: 28 }, tramos: [[0, 4], [7, 13]],
    gancho: { pathname: base + "gancho.mov", tamano: 300 }, pantallazos: [{ pathname: base + "p01.jpg", tamano: 10 }] }, "PATCH"), id);
  assert.equal(r.status, 200);
  assert.equal((await api.pcPedidos(pc())).status, 200);
  assert.deepEqual(await (await api.pcPedidos(pc())).json(), []);           // todavía no está listo
  r = await api.enviar(conSesion(), id);
  assert.equal(r.status, 200);
  assert.match(avisos[0], /Recibí/);
  const lista = await (await api.pcPedidos(pc())).json();
  assert.equal(lista[0].original.url, `https://firmado/${base}original.mp4`);
  assert.equal((await api.cancelar(conSesion(null, "DELETE"), id)).status, 200);   // un pedido listo sí se cancela
  assert.equal(await almacen.leer(id), null);
});
test("el tamaño declarado debe coincidir con el blob real", async () => {
  const { api, tamanos } = montar();
  const { id } = await (await api.crear(conSesion())).json();
  tamanos.set(`cantados/${id}/gancho.mov`, 299);
  const r = await api.cambiar(conSesion({ gancho: { pathname: `cantados/${id}/gancho.mov`, tamano: 300 } }, "PATCH"), id);
  assert.equal(r.status, 400);
});
test("bajado: en_pc y borra los blobs; cancelar en_pc = 409; entregado borra el registro", async () => {
  const { api, almacen, borrados } = montar();
  const id = "c_20261021_ab12", base = `cantados/${id}/`;
  await almacen.guardar({ id, creado: new Date(T).toISOString(), estado: "listo", titulo: null, estilo: "Salsa", tramos: [[0, 4]],
    original: { pathname: base + "original.mp4", tamano: 5 }, gancho: { pathname: base + "g.mov", tamano: 5 }, pantallazos: [{ pathname: base + "p01.jpg", tamano: 5 }] });
  assert.equal((await api.pcBajado(pc(), id)).status, 200);
  assert.equal((await almacen.leer(id)).estado, "en_pc");
  assert.deepEqual(borrados, [base]);
  assert.equal((await api.cancelar(conSesion(null, "DELETE"), id)).status, 409);
  assert.equal((await api.pcEntregado(pc(), id)).status, 200);
  assert.equal(await almacen.leer(id), null);
  assert.equal((await api.pcBajado(pc(), id)).status, 404);
});
test("pcPedidos borra borradores de más de 48 h con sus archivos", async () => {
  const { api, almacen, borrados } = montar();
  await almacen.guardar({ id: "viejo", creado: new Date(T - 50 * 3600e3).toISOString(), estado: "subiendo", pantallazos: [], original: { pathname: "cantados/viejo/original.mp4", tamano: 1 }, gancho: null });
  await api.pcPedidos(pc());
  assert.equal(await almacen.leer("viejo"), null);
  assert.deepEqual(borrados, ["cantados/viejo/"]);
});
test("autorizarSubida: solo con sesión, en su carpeta y con el pedido en subiendo", async () => {
  const { api } = montar();
  const { id } = await (await api.crear(conSesion())).json();
  await api.autorizarSubida(conSesion(), `cantados/${id}/p01.jpg`, id);
  await assert.rejects(api.autorizarSubida(sinSesion(), `cantados/${id}/p01.jpg`, id));
  await assert.rejects(api.autorizarSubida(conSesion(), `cantados/otro/p01.jpg`, id));
  await assert.rejects(api.autorizarSubida(conSesion(), `cantados/${id}/p01.jpg`, "noexiste"));
});
test("fallido guarda el motivo", async () => {
  const { api, almacen } = montar();
  await almacen.guardar({ id: "c", creado: new Date(T).toISOString(), estado: "en_pc" });
  const r = await api.pcFallido(new Request("https://x", { method: "POST", headers: { authorization: "Bearer pc-tok" }, body: JSON.stringify({ motivo: "sin comentarios" }) }), "c");
  assert.equal(r.status, 200);
  assert.deepEqual([(await almacen.leer("c")).estado, (await almacen.leer("c")).motivo], ["fallido", "sin comentarios"]);
});
test("cancelar borra todo el prefijo del pedido (también un gancho huérfano reemplazado)", async () => {
  const { api, almacen, borrados } = montar();
  const id = "c_20261021_ab12", base = `cantados/${id}/`;
  await almacen.guardar({ id, creado: new Date(T).toISOString(), estado: "subiendo", pantallazos: [], original: null,
    gancho: { pathname: base + "gancho.mov", tamano: 5 } });
  assert.equal((await api.cancelar(conSesion(null, "DELETE"), id)).status, 200);
  assert.deepEqual(borrados, [base]);
  assert.equal(await almacen.leer(id), null);
});
test("entregado sobre un pedido existente borra su prefijo antes del registro; sobre uno inexistente no borra blobs", async () => {
  const { api, almacen, borrados } = montar();
  const id = "c_20261021_cd34", base = `cantados/${id}/`;
  await almacen.guardar({ id, creado: new Date(T).toISOString(), estado: "listo", pantallazos: [], original: { pathname: base + "original.mp4", tamano: 5 }, gancho: null });
  assert.equal((await api.pcEntregado(pc(), id)).status, 200);
  assert.deepEqual(borrados, [base]);
  assert.equal(await almacen.leer(id), null);
  assert.equal((await api.pcEntregado(pc(), "no_existe")).status, 200);
  assert.deepEqual(borrados, [base]);
});
test("fallido borra todos los blobs del pedido", async () => {
  const { api, almacen, borrados } = montar();
  await almacen.guardar({ id: "c_x", creado: new Date(T).toISOString(), estado: "en_pc" });
  await api.pcFallido(new Request("https://x", { method: "POST", headers: { authorization: "Bearer pc-tok" }, body: JSON.stringify({ motivo: "m" }) }), "c_x");
  assert.deepEqual(borrados, ["cantados/c_x/"]);
});
test("enviar re-verifica los tamaños reales de los blobs", async () => {
  const { api, almacen, tamanos, avisos } = montar();
  const id = "c_20261021_ab12", base = `cantados/${id}/`;
  await almacen.guardar({ id, creado: new Date(T).toISOString(), estado: "subiendo", titulo: null, estilo: "Salsa", tramos: [[0, 4], [7, 13]],
    original: { pathname: base + "original.mp4", tamano: 500, duracion: 28 }, gancho: { pathname: base + "gancho.mov", tamano: 300 }, pantallazos: [{ pathname: base + "p01.jpg", tamano: 10 }] });
  tamanos.set(base + "original.mp4", 500); tamanos.set(base + "gancho.mov", 1); tamanos.set(base + "p01.jpg", 10);
  assert.equal((await api.enviar(conSesion(), id)).status, 400);
  assert.equal((await almacen.leer(id)).estado, "subiendo");
  assert.equal(avisos.length, 0);
  tamanos.set(base + "gancho.mov", 300);
  assert.equal((await api.enviar(conSesion(), id)).status, 200);
  assert.equal((await almacen.leer(id)).estado, "listo");
});

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

// Aplica una función de revision.js y exige que no haya errores (un no-op silencioso no debe pasar).
const sinErrores = (r) => { assert.deepEqual(r.errores, []); return r.pedido; };
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

test("propuesta: no pisa una revisión en curso (sin «trae más») ni un pedido aprobado: 409", async () => {
  const { api, almacen } = montar();
  const id = await enPc(almacen);
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  const antes = await almacen.leer(id);
  const r = await api.pcPropuesta(pcCon({ comentarios: [{ id: "z", usuario: "uz", texto: "tz", linea: "lz,", likes: 9, dentro: true }] }), id);
  assert.equal(r.status, 409);
  assert.deepEqual(await r.json(), { error: "Ese pedido no está esperando propuesta.", estado: "en_revision", version: 1 });
  assert.deepEqual(await almacen.leer(id), antes);
  await almacen.guardar(sinErrores(aprobarRevision(antes, T, antes.propuesta.version)));
  const r2 = await api.pcPropuesta(pcCon({ comentarios: [{ ...COMENTARIOS[0], dentro: false }, { ...COMENTARIOS[1], dentro: true }] }), id);
  assert.equal(r2.status, 409);
  assert.deepEqual([(await r2.json()).estado, (await almacen.leer(id)).estado], ["aprobado", "aprobado"]);
});

test("propuesta repetida (respuesta perdida): misma lista en en_revision o aprobado = 200 sin tocar la revisión ni avisar", async () => {
  const { api, almacen, avisos } = montar();
  const id = await enPc(almacen);
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  const enRev = await almacen.leer(id);
  const editado = sinErrores(aplicarRevision(enRev, { orden: ["b", "a"], fuera: [], lineas: { a: "otra," }, version: 1 }, T));
  await almacen.guardar(editado);
  const r = await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, version: 1, vence: enRev.propuesta.vence });
  assert.deepEqual(await almacen.leer(id), editado);
  assert.equal(avisos.length, 1);
  await almacen.guardar(sinErrores(aprobarRevision(editado, T, 1)));
  const aprobado = await almacen.leer(id);
  assert.equal((await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id)).status, 200);
  assert.deepEqual(await almacen.leer(id), aprobado);
  // otro orden, otra línea u otro «dentro» ya no es la misma propuesta
  for (const otra of [[COMENTARIOS[1], COMENTARIOS[0]], [{ ...COMENTARIOS[0], linea: "lx," }, COMENTARIOS[1]], [COMENTARIOS[0], { ...COMENTARIOS[1], dentro: true }]])
    assert.equal((await api.pcPropuesta(pcCon({ comentarios: otra }), id)).status, 409);
});

test("propuesta a un pedido que sigue listo (falló «bajado») = 409 con su estado", async () => {
  const { api, almacen } = montar();
  await enPc(almacen, { estado: "listo" });
  const r = await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), "c_l");
  assert.equal(r.status, 409);
  assert.deepEqual(await r.json(), { error: "Ese pedido no está esperando propuesta.", estado: "listo", version: null });
});

test("fallido quita la propuesta y la revisión (texto solo mientras está en revisión)", async () => {
  const { api, almacen } = montar();
  const id = await enPc(almacen);
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  assert.equal((await api.pcFallido(pcCon({ motivo: "no se pudo" }), id)).status, 200);
  const p = await almacen.leer(id);
  assert.deepEqual([p.estado, p.motivo, "propuesta" in p, "revision" in p], ["fallido", "no se pudo", false, false]);
});

test("propuesta: con «trae más» pedido, sí se publica una versión nueva", async () => {
  const { api, almacen } = montar();
  const id = await enPc(almacen);
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  const enRev = await almacen.leer(id);
  await almacen.guardar(sinErrores(pedirMas(enRev, T, enRev.propuesta.version)));
  // la misma lista de antes es una repetición (no la respuesta a «trae más»): 200 con la versión 1 y el pedido de Oscar intacto
  const igual = await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  assert.deepEqual([igual.status, (await igual.json()).version, (await almacen.leer(id)).revision.trae_mas], [200, 1, true]);
  const repuesta = [{ ...COMENTARIOS[0], dentro: false }, { ...COMENTARIOS[1], dentro: true }];
  const r = await api.pcPropuesta(pcCon({ comentarios: repuesta }), id);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).version, 2);
});

test("aprobados: lista final de aprobados y de «trae más»; los vencidos se aprueban solos", async () => {
  const reloj = { t: T };
  const { api, almacen } = montar(reloj);
  for (const id of ["c_a", "c_b", "c_c"]) {
    await enPc(almacen, { id });
    await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  }
  const pa = await almacen.leer("c_a"), pb = await almacen.leer("c_b");
  const a = sinErrores(aplicarRevision(pa, { orden: ["b"], fuera: ["a"], lineas: { b: "otra," }, version: pa.propuesta.version }, T));
  await almacen.guardar(sinErrores(aprobarRevision(a, T, a.propuesta.version)));
  await almacen.guardar(sinErrores(pedirMas(pb, T, pb.propuesta.version)));
  await almacen.guardar({ id: "c_mal", estado: "aprobado", tipo: "link", propuesta: { version: 1, vence: new Date(T).toISOString(), comentarios: [] } });   // sin revision: no debe tumbar la lista
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
  const enRev = await almacen.leer(id);
  await almacen.guardar(sinErrores(pedirMas(enRev, T, enRev.propuesta.version)));
  reloj.t = T + 24 * 3600e3;
  assert.equal((await api.pcTraeMasAtendido(pcCon({}), id)).status, 200);
  const p = await almacen.leer(id);
  assert.deepEqual([p.estado, p.revision.trae_mas, p.propuesta.vence], ["en_revision", false, new Date(T + 48 * 3600e3).toISOString()]);
  assert.match(avisos.at(-1), /no hay más/i);
  assert.equal((await api.pcTraeMasAtendido(pcCon({}), "no_existe")).status, 404);
});

test("trae-mas-atendido con motivo «sin_quitados» le dice a Oscar que no quitó ninguno", async () => {
  const { api, almacen, avisos } = montar();
  const id = await enPc(almacen);
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  const enRev = await almacen.leer(id);
  await almacen.guardar(sinErrores(pedirMas(enRev, T, 1)));
  assert.equal((await api.pcTraeMasAtendido(pcCon({ motivo: "sin_quitados" }), id)).status, 200);
  assert.match(avisos.at(-1), /No quitaste ninguno/);
  assert.doesNotMatch(avisos.at(-1), /No hay más/);
  await almacen.guardar(sinErrores(pedirMas(await almacen.leer(id), T, 1)));
  assert.equal((await api.pcTraeMasAtendido(pcCon({ motivo: "sin_reserva" }), id)).status, 200);
  assert.match(avisos.at(-1), /No hay más comentarios para reponer/);
});

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
  const r = await api.revision(conSesion({ orden: ["b", "a"], fuera: [], lineas: { b: "cambiada," }, version: 1 }, "PATCH"), id);
  assert.equal(r.status, 200);
  assert.deepEqual((await almacen.leer(id)).revision.orden, ["b", "a"]);
  assert.equal((await api.revision(conSesion({ orden: ["b"], fuera: [], version: 1 }, "PATCH"), id)).status, 400);
  assert.equal((await api.aprobar(conSesion({ version: 1 }), id)).status, 200);
  assert.equal((await almacen.leer(id)).estado, "aprobado");
  assert.equal((await api.revision(conSesion({ orden: ["a", "b"], fuera: [], version: 1 }, "PATCH"), id)).status, 409);
  assert.equal((await api.traeMas(conSesion({ version: 1 }), id)).status, 409);
  assert.equal((await api.aprobar(conSesion({ version: 1 }), "no_existe")).status, 404);
});

test("versión vieja o ausente = 409 y no se guarda nada", async () => {
  const { api, almacen } = montar();
  const id = await enPc(almacen);
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  const antes = JSON.stringify(await almacen.leer(id));
  for (const version of [0, 2, undefined]) {
    const v = version === undefined ? {} : { version };
    assert.equal((await api.revision(conSesion({ orden: ["b", "a"], fuera: [], ...v }, "PATCH"), id)).status, 409);
    assert.equal((await api.aprobar(conSesion(v), id)).status, 409);
    assert.equal((await api.traeMas(conSesion(v), id)).status, 409);
  }
  assert.equal((await api.aprobar(conSesion(), id)).status, 409);
  assert.equal(JSON.stringify(await almacen.leer(id)), antes);
});

test("trae más congela la revisión hasta la franja; vencido no se aprueba a mano", async () => {
  const reloj = { t: T };
  const { api, almacen } = montar(reloj);
  const id = await enPc(almacen);
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  assert.equal((await api.traeMas(conSesion({ version: 1 }), id)).status, 200);
  assert.equal((await almacen.leer(id)).revision.trae_mas, true);
  assert.equal((await api.aprobar(conSesion({ version: 1 }), id)).status, 409);
  const otro = await enPc(almacen, { id: "c_v" });
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), otro);
  reloj.t = T + 22 * 3600e3;
  assert.equal((await api.aprobar(conSesion({ version: 1 }), otro)).status, 409);
});

test("un cuerpo JSON null no rompe nada: 409/400 y crear usa el tipo por defecto", async () => {
  const { api, almacen } = montar();
  const id = await enPc(almacen);
  await api.pcPropuesta(pcCon({ comentarios: COMENTARIOS }), id);
  const nulo = (m = "POST") => new Request("https://x/admin/api", {
    method: m, headers: { cookie: `admin_sesion=${firmarSesion("secreta", T)}`, "x-forwarded-for": "1.1.1.1" }, body: "null",
  });
  assert.equal((await api.aprobar(nulo(), id)).status, 409);
  assert.equal((await api.traeMas(nulo(), id)).status, 409);
  assert.equal((await api.revision(nulo("PATCH"), id)).status, 400);
  const c = await api.crear(nulo());
  assert.equal(c.status, 200);
  assert.equal((await c.json()).tipo ?? "pantallazos", "pantallazos");
});

test("necesita-pantallazos: solo el PC; el pedido por link pasa a pedir pantallazos y avisa", async () => {
  const { api, almacen, avisos } = montar();
  assert.equal((await api.pcNecesitaPantallazos(conSesion({}), "c_l")).status, 401);
  assert.equal((await api.pcNecesitaPantallazos(pc("malo"), "c_l")).status, 401);
  const id = await enPc(almacen);
  assert.equal((await api.pcNecesitaPantallazos(pcCon({ motivo: "TikTok pidió iniciar sesión" }), id)).status, 200);
  const p = await almacen.leer(id);
  assert.deepEqual([p.estado, p.motivo, p.pantallazos_listos], ["necesita_pantallazos", "TikTok pidió iniciar sesión", false]);
  assert.match(avisos.at(-1), /\/admin\/cantados\/c_l\/pantallazos/);
  assert.equal((await api.pcNecesitaPantallazos(pcCon({}), "no_existe")).status, 404);
  await enPc(almacen, { estado: "en_revision" });
  assert.equal((await api.pcNecesitaPantallazos(pcCon({}), id)).status, 409);
});

test("necesita-pantallazos repetido (respuesta perdida): 200 sin aviso nuevo ni borrar lo que Oscar ya subió", async () => {
  const { api, almacen, avisos } = montar();
  const pant = [{ pathname: "cantados/c_l/p01.jpg", tamano: 10 }];
  const id = await enPc(almacen, { estado: "necesita_pantallazos", pantallazos: pant, pantallazos_listos: true, motivo: "captcha" });
  const antes = await almacen.leer(id);
  assert.equal((await api.pcNecesitaPantallazos(pcCon({ motivo: "otro" }), id)).status, 200);
  assert.deepEqual(await almacen.leer(id), antes);
  assert.equal(avisos.length, 0);
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
