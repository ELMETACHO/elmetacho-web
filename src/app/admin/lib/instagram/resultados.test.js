import { test } from "node:test";
import assert from "node:assert/strict";
import { redisMemoria } from "./redis-memoria.js";
import { confirmarDm, forzarLink, pendientesDm } from "./dm.js";
import { conteoDelDia, fechaBogota, guardarResultados, listaResultados, motivoCorto } from "./resultados.js";
import { CONTEO, FORZAR, REMITENTES, RESULTADOS } from "./claves.js";
import { guardarLinks, huellaDe } from "../../../api/instagram/webhook/meta.js";

const L = "https://vt.tiktok.com/A/";
const DIA = 86_400_000;
const h = (u) => huellaDe(u, "s");

test("huella: HMAC-SHA256 de 16 hex, distinta por persona; sin secreto o sin id → null", () => {
  assert.match(h("u1"), /^[0-9a-f]{16}$/);
  assert.equal(h("u1"), h("u1"));
  assert.notEqual(h("u1"), h("u2"));
  assert.notEqual(huellaDe("u1", "otro"), h("u1"));
  assert.equal(huellaDe("u1", ""), null);
  assert.equal(huellaDe("u1", undefined), null);
  assert.equal(huellaDe("", "s"), null);
});

test("pase directo: 2 personas no lo activan; la tercera distinta sí, aunque el link ya estuviera entregado", async () => {
  const r = redisMemoria(() => 0);
  assert.equal(await guardarLinks(r, [L], "2026-10-26T10:00:00.000Z", { huella: h("u1") }), 1);
  assert.equal(await confirmarDm(r, [L], "2026-10-26T10:05:00.000Z"), 1);
  assert.deepEqual(await pendientesDm(r), []);
  assert.equal(await guardarLinks(r, [L], "2026-10-26T11:00:00.000Z", { huella: h("u2") }), 0);
  assert.deepEqual(await pendientesDm(r), []);
  await guardarLinks(r, [L], "2026-10-26T12:00:00.000Z", { huella: h("u3") });
  assert.deepEqual(await pendientesDm(r), [{ link: L, forzar: true }]);
  assert.deepEqual(await r.hGetAll(FORZAR), { [L]: "2026-10-26T12:00:00.000Z" });
  assert.equal((await r.lRange("cabina:dm:links", 0, -1)).length, 1);   // ya estaba en la cola: no se duplica
});

test("pase directo: la misma persona 3 veces no lo activa", async () => {
  const r = redisMemoria(() => 0);
  for (let i = 0; i < 3; i++) await guardarLinks(r, [L], "2026-10-26T10:00:00.000Z", { huella: h("u1") });
  await confirmarDm(r, [L], "2026-10-26T10:05:00.000Z");
  await guardarLinks(r, [L], "2026-10-26T11:00:00.000Z", { huella: h("u1") });
  assert.deepEqual(await pendientesDm(r), []);
  assert.deepEqual(await r.hGetAll(FORZAR), {});
});

test("pase directo: a los 3 días + 1 s las huellas vencen y la cuenta vuelve a empezar", async () => {
  const reloj = { t: 0 };
  const r = redisMemoria(() => reloj.t);
  await guardarLinks(r, [L], "a", { huella: h("u1") });
  await guardarLinks(r, [L], "a", { huella: h("u2") });
  await confirmarDm(r, [L], "b");
  reloj.t = 3 * DIA + 1000;
  await guardarLinks(r, [L], "c", { huella: h("u3") });
  assert.deepEqual(await pendientesDm(r), []);
  assert.equal(await r.sCard(`cabina:dm:remitentes:${L}`), 1);
});

test("pase directo: el vencimiento de las huellas se renueva con cada envío", async () => {
  const reloj = { t: 0 };
  const r = redisMemoria(() => reloj.t);
  await guardarLinks(r, [L], "a", { huella: h("u1") });
  reloj.t = 2 * DIA;
  await guardarLinks(r, [L], "a", { huella: h("u2") });
  await confirmarDm(r, [L], "b");
  reloj.t = 4 * DIA;   // más de 3 días desde u1, menos de 3 desde u2
  await guardarLinks(r, [L], "c", { huella: h("u3") });
  assert.deepEqual(await pendientesDm(r), [{ link: L, forzar: true }]);
});

test("sin huella el primer envío funciona como hoy y no se cuentan personas", async () => {
  const r = redisMemoria();
  assert.equal(await guardarLinks(r, [L, L], "a"), 1);
  assert.equal(await guardarLinks(r, [L], "a", { huella: null }), 0);
  assert.equal(await r.sCard(`cabina:dm:remitentes:${L}`), 0);
  assert.deepEqual(await pendientesDm(r), [{ link: L, forzar: false }]);
});

test("confirmarDm borra la marca forzar", async () => {
  const r = redisMemoria();
  await forzarLink(r, L, "2026-10-26T10:00:00.000Z");
  assert.deepEqual(await pendientesDm(r), [{ link: L, forzar: true }]);
  await confirmarDm(r, [L], "2026-10-26T10:05:00.000Z");
  assert.deepEqual(await r.hGetAll(FORZAR), {});
  assert.deepEqual(await pendientesDm(r), []);
});

test("forzarLink (Rescatar) vuelve a encolar un link ya entregado, y uno que nunca vino por DM", async () => {
  const r = redisMemoria();
  await guardarLinks(r, [L], "2026-10-26T10:00:00.000Z");
  await confirmarDm(r, [L], "2026-10-26T10:05:00.000Z");
  assert.deepEqual(await pendientesDm(r), []);
  await forzarLink(r, L, "2026-10-26T11:00:00.000Z");
  await forzarLink(r, "https://www.tiktok.com/@x/video/9", "2026-10-26T11:00:00.000Z");
  assert.deepEqual(await pendientesDm(r), [{ link: L, forzar: true }, { link: "https://www.tiktok.com/@x/video/9", forzar: true }]);
  assert.deepEqual(await r.hGetAll("cabina:dm:entregados"), {});
});

const ok = (x = {}) => ({ link: L, origen: "dm", estado: "no_paso", nivel: 1, motivo: "vistas 1200 < 5000", ...x });

test("guardarResultados: rechaza sin link o con estado raro, cuenta por nivel y motivo", async () => {
  const r = redisMemoria(() => 0);
  const ahora = "2026-10-26T15:00:00.000Z";   // 10 a. m. en Bogotá
  const n = await guardarResultados(r, [
    ok(),
    ok({ link: "https://vt.tiktok.com/B/", motivo: "vistas 300 < 5000" }),
    ok({ link: "https://vt.tiktok.com/C/", estado: "paso", nivel: 3, motivo: "", nota: 8 }),
    ok({ link: "https://vt.tiktok.com/D/", estado: "ensayo_no_paso", nivel: 2, motivo: "risa: 0.1 < 0.3" }),
    ok({ link: "https://vt.tiktok.com/E/", nivel: 3, motivo: "juez: 5 — chiste flojo", nota: 5, origen: "telegram" }),
    ok({ link: "" }),
    ok({ link: undefined }),
    ok({ estado: "pasó" }),
    ok({ estado: undefined }),
    ok({ origen: "correo" }),
    ok({ nivel: 4 }),
    null,
    "x",
  ], ahora);
  assert.equal(n, 5);
  const lista = await r.lRange(RESULTADOS, 0, -1);
  assert.equal(lista.length, 5);
  assert.deepEqual(JSON.parse(lista[0]), { link: "https://vt.tiktok.com/E/", origen: "telegram", estado: "no_paso", nivel: 3, motivo: "juez: 5 — chiste flojo", nota: 5, fecha: ahora });
  assert.equal(fechaBogota(Date.parse(ahora)), "2026-10-26");
  assert.deepEqual(await conteoDelDia(r, "2026-10-26"), { "1:vistas": 2, "3:paso": 1, "2:ensayo risa": 1, "3:juez": 1 });
  assert.deepEqual(await r.hGetAll(CONTEO("2026-10-26")), { "1:vistas": "2", "3:paso": "1", "2:ensayo risa": "1", "3:juez": "1" });
  assert.equal(await guardarResultados(r, "no es lista", ahora), 0);
});

test("guardarResultados: el conteo vence a los 3 días y la lista no pasa de 5000", async () => {
  const reloj = { t: 0 };
  const r = redisMemoria(() => reloj.t);
  await guardarResultados(r, Array.from({ length: 5003 }, (_, i) => ok({ link: `https://vt.tiktok.com/${i}/` })), "2026-10-26T15:00:00.000Z");
  assert.equal((await r.lRange(RESULTADOS, 0, -1)).length, 5000);
  assert.equal(JSON.parse((await r.lRange(RESULTADOS, 0, 0))[0]).link, "https://vt.tiktok.com/5002/");
  reloj.t = 3 * DIA + 1000;
  assert.deepEqual(await conteoDelDia(r, "2026-10-26"), {});
});

test("listaResultados: más nuevo primero y sin los de más de 3 días", async () => {
  const r = redisMemoria();
  const base = Date.parse("2026-10-26T15:00:00.000Z");
  await guardarResultados(r, [ok({ link: "https://vt.tiktok.com/viejo/" })], new Date(base - 3 * DIA - 1000).toISOString());
  await guardarResultados(r, [ok({ link: "https://vt.tiktok.com/1/" })], new Date(base - DIA).toISOString());
  await guardarResultados(r, [ok({ link: "https://vt.tiktok.com/2/" })], new Date(base).toISOString());
  await r.lPush(RESULTADOS, "no es json");
  assert.deepEqual((await listaResultados(r, base)).map((x) => x.link), ["https://vt.tiktok.com/2/", "https://vt.tiktok.com/1/"]);
});

test("redis falso: sCard, hDel, hIncrBy y lTrim como node-redis 6", async () => {
  const reloj = { t: 0 };
  const r = redisMemoria(() => reloj.t);
  assert.equal(await r.sCard("s"), 0);
  await r.sAdd("s", "a"); await r.sAdd("s", "b"); await r.sAdd("s", "a");
  assert.equal(await r.sCard("s"), 2);
  await r.expire("s", 10);
  await r.sAdd("s", "c");   // SADD no borra el vencimiento
  reloj.t = 11_000;
  assert.equal(await r.sCard("s"), 0);
  await r.hSet("h", "x", "1"); await r.hSet("h", "y", "2");
  assert.equal(await r.hDel("h", "x"), 1);
  assert.equal(await r.hDel("h", "x"), 0);
  assert.equal(await r.hDel("h", ["y", "z"]), 1);
  assert.equal(await r.del("h"), 0);   // el hash vacío desaparece
  assert.equal(await r.hIncrBy("c", "k", 1), 1);
  assert.equal(await r.hIncrBy("c", "k", 2), 3);
  assert.deepEqual(await r.hGetAll("c"), { k: "3" });
  for (const v of ["a", "b", "c", "d"]) await r.lPush("l", v);   // d c b a
  assert.equal(await r.lTrim("l", 0, 2), "OK");
  assert.deepEqual(await r.lRange("l", 0, -1), ["d", "c", "b"]);
  assert.deepEqual(await r.lRange("l", -2, -1), ["c", "b"]);
  await r.lTrim("l", 5, 9);
  assert.equal(await r.del("l"), 0);   // la lista vacía desaparece
});

test("motivo corto: los motivos reales del PC quedan en grupos legibles", () => {
  const reales = {
    "10 vistas (pide 1.000)": "vistas",
    "3 likes del video (pide 50)": "likes del video",
    "2 comentarios (pide 300)": "comentarios",
    "no es video": "no es video",
    "no se pudo leer el video (3 intentos)": "no se pudo leer el video",
    "risa en respuestas 0% (pide 30%)": "risa en respuestas",
    "juez: 5 — chistes planos": "juez",
  };
  for (const [motivo, grupo] of Object.entries(reales)) assert.equal(motivoCorto(motivo), grupo, motivo);
  assert.equal(motivoCorto(""), "sin motivo");
  assert.equal(motivoCorto("123 (x)"), "sin motivo");
});

test("guardarResultados: el conteo agrupa los motivos reales del PC", async () => {
  const r = redisMemoria();
  await guardarResultados(r, [
    ok({ motivo: "10 vistas (pide 1.000)" }),
    ok({ link: "https://vt.tiktok.com/B/", motivo: "250 vistas (pide 1.000)" }),
    ok({ link: "https://vt.tiktok.com/C/", nivel: 2, estado: "ensayo_no_paso", motivo: "risa en respuestas 0% (pide 30%)" }),
  ], "2026-10-26T15:00:00.000Z");
  assert.deepEqual(await conteoDelDia(r, "2026-10-26"), { "1:vistas": 2, "2:ensayo risa en respuestas": 1 });
});

test("guardarResultados: solo guarda links que se pueden rescatar (http(s), sin espacios, ≤ 500)", async () => {
  const r = redisMemoria();
  const n = await guardarResultados(r, [
    ok({ link: "vt.tiktok.com/A/" }),
    ok({ link: "ftp://x/y" }),
    ok({ link: "https://vt.tiktok.com/A/ con espacio" }),
    ok({ link: "https://x.com/" + "a".repeat(500) }),
    ok({ link: "http://vt.tiktok.com/A/" }),
  ], "2026-10-26T15:00:00.000Z");
  assert.equal(n, 1);
});

test("pase directo: una sola vez por ventana; la cuarta persona no vuelve a forzar", async () => {
  const r = redisMemoria(() => 0);
  for (const u of ["u1", "u2", "u3"]) await guardarLinks(r, [L], "a", { huella: h(u) });
  assert.deepEqual(await pendientesDm(r), [{ link: L, forzar: true }]);
  await confirmarDm(r, [L], "b");
  await guardarLinks(r, [L], "c", { huella: h("u4") });
  assert.deepEqual(await pendientesDm(r), []);
  assert.deepEqual(await r.hGetAll(FORZAR), {});
});

test("pase directo: si la tercera se perdió (carrera), la cuarta lo da", async () => {
  const r = redisMemoria(() => 0);
  await guardarLinks(r, [L], "a", { huella: h("u1") });
  await confirmarDm(r, [L], "b");
  await r.sAdd(REMITENTES(L), h("u2"));
  await r.sAdd(REMITENTES(L), h("u3"));   // como si dos llegaran a la vez y ninguna leyera 3
  await guardarLinks(r, [L], "c", { huella: h("u4") });
  assert.deepEqual(await pendientesDm(r), [{ link: L, forzar: true }]);
});
