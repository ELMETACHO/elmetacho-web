import { test } from "node:test";
import assert from "node:assert/strict";
import { crearApi } from "./api.js";
import { almacenMemoria } from "./almacen-memoria.js";
import { firmarSesion } from "./sesion.js";

const T = Date.parse("2026-10-21T18:30:00Z");
function montar() {
  const almacen = almacenMemoria(), borrados = [], avisos = [], tamanos = new Map();
  const api = crearApi({
    almacen, env: { ADMIN_CLAVE: "secreta", ADMIN_PC_TOKEN: "pc-tok" }, ahora: () => T, azar: () => "ab12",
    blob: { tamano: async (p) => tamanos.get(p) ?? null, borrar: async (ps) => void borrados.push(...ps), enlace: async (p) => `https://firmado/${p}` },
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
  assert.deepEqual(borrados.sort(), [base + "g.mov", base + "original.mp4", base + "p01.jpg"]);
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
  assert.deepEqual(borrados, ["cantados/viejo/original.mp4"]);
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
