import { test } from "node:test";
import assert from "node:assert/strict";
import { nuevoId, nuevoPedido, aplicarCambios, erroresParaEnviar, archivos, borradorVencido, prefijo, TIPOS, TIPOS_DISPONIBLES, linkValido, normalizarLink, tipoDe, ordenarLista, subidaPermitida, tonoEstado, destinoDe, pedidoDeOpcion } from "./pedido.js";

const P = () => nuevoPedido("c_20261021_ab12", "2026-10-21T18:30:00.000Z");
const arch = (n, extra = {}) => ({ pathname: `cantados/c_20261021_ab12/${n}`, tamano: 100, ...extra });

test("id con fecha y azar", () => assert.equal(nuevoId(new Date("2026-10-21T18:30:00Z"), "ab12"), "c_20261021_ab12"));

test("pedido nuevo en subiendo con estilo por defecto", () => {
  const p = P();
  assert.equal(p.estado, "subiendo");
  assert.equal(p.estilo, "Salsa, merengue");
  assert.deepEqual(p.pantallazos, []);
});

test("aplica cambios válidos y valida tramos contra la duración del original", () => {
  let { pedido, errores } = aplicarCambios(P(), { original: arch("original.mp4", { duracion: 28 }), titulo: "  hola  " });
  assert.deepEqual(errores, []);
  assert.equal(pedido.titulo, "hola");
  ({ pedido, errores } = aplicarCambios(pedido, { tramos: [[0, 4], [7, 13]] }));
  assert.deepEqual(pedido.tramos, [[0, 4], [7, 13]]);
  assert.match(aplicarCambios(pedido, { tramos: [[20, 40]] }).errores[0], /dura/);
});

test("rechaza archivos de otro pedido, estilos raros y cambios fuera de subiendo", () => {
  assert.match(aplicarCambios(P(), { gancho: { pathname: "cantados/otro/g.mov", tamano: 1 } }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { pantallazos: [{ pathname: "../x", tamano: 1 }] }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { estilo: "Reguetón" }).errores[0], /estilo/i);
  assert.match(aplicarCambios({ ...P(), estado: "listo" }, { titulo: "x" }).errores[0], /ya se envió/);
});

test("para enviar hace falta original, tramo, gancho y un pantallazo", () => {
  assert.equal(erroresParaEnviar(P()).length, 4);
  const p = { ...P(), original: arch("original.mp4", { duracion: 28 }), tramos: [[0, 4]], gancho: arch("gancho.mov"), pantallazos: [arch("p01.jpg")] };
  assert.deepEqual(erroresParaEnviar(p), []);
  assert.deepEqual(archivos(p), [p.original.pathname, p.gancho.pathname, p.pantallazos[0].pathname]);
  assert.equal(erroresParaEnviar({ ...p, gancho: { ...p.gancho, tamano: 0 } }).length, 1);
});

test("borrador de más de 48 h vence; uno listo nunca", () => {
  const t = Date.parse("2026-10-21T18:30:00.000Z");
  assert.equal(borradorVencido(P(), t + 49 * 3600e3), true);
  assert.equal(borradorVencido(P(), t + 47 * 3600e3), false);
  assert.equal(borradorVencido({ ...P(), estado: "listo" }, t + 99 * 3600e3), false);
  assert.equal(prefijo("x"), "cantados/x/");
});

test("rechaza rutas que no son la ranura exacta del pedido", () => {
  const ruta = (x) => aplicarCambios(P(), { original: { pathname: x, tamano: 1 } }).errores[0];
  assert.match(ruta("cantados/c_20261021_ab12/"), /archivo/);
  assert.match(ruta("cantados/c_20261021_ab12/%2e%2e/x"), /archivo/);
  assert.match(ruta("cantados/c_20261021_ab12/sub/original.mp4"), /archivo/);
  assert.match(ruta("cantados/c_20261021_ab12/original\..mp4"), /archivo/);
  assert.match(aplicarCambios(P(), { gancho: { pathname: "cantados/c_20261021_ab12/p01.jpg", tamano: 1 } }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { pantallazos: [{ pathname: "cantados/c_20261021_ab12/gancho.mov", tamano: 1 }] }).errores[0], /archivo/);
});

test("rechaza tamaños y medidas negativas o no finitas", () => {
  assert.match(aplicarCambios(P(), { original: arch("original.mp4", { tamano: -5 }) }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { original: arch("original.mp4", { tamano: 1.5 }) }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { original: arch("original.mp4", { tamano: NaN }) }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { original: arch("original.mp4", { duracion: -1 }) }).errores[0], /archivo/);
  assert.match(aplicarCambios(P(), { gancho: arch("gancho.mov", { ancho: Infinity }) }).errores[0], /archivo/);
});

test("datos nulos o que no son objeto devuelven error sin lanzar", () => {
  assert.deepEqual(aplicarCambios(P(), null), { pedido: P(), errores: ["Datos inválidos."] });
  assert.deepEqual(aplicarCambios(P(), "x").errores, ["Datos inválidos."]);
  assert.deepEqual(aplicarCambios(P(), []).errores, ["Datos inválidos."]);
});

const L = () => nuevoPedido("c_20261021_ab12", "2026-10-21T18:30:00.000Z", "link");

test("tipos: pantallazos por defecto; los pedidos viejos sin tipo cuentan como pantallazos", () => {
  assert.deepEqual(TIPOS, ["pantallazos", "link", "remix"]);
  assert.deepEqual(TIPOS_DISPONIBLES, ["pantallazos", "link", "remix"]);
  assert.equal(P().tipo, "pantallazos");
  assert.equal(L().tipo, "link");
  assert.equal(L().link, null);
  const { tipo, ...viejo } = P();
  assert.equal(tipo, "pantallazos");
  assert.equal(tipoDe(viejo), "pantallazos");
});

test("link de TikTok: solo https con www., vm. o vt.", () => {
  for (const ok of ["https://www.tiktok.com/@a/video/123", "https://vm.tiktok.com/ZMabc/", "https://vt.tiktok.com/ZS9/", "  https://vt.tiktok.com/ZS9/  "])
    assert.equal(linkValido(ok), true, ok);
  for (const malo of ["http://vt.tiktok.com/ZS9/", "https://tiktok.com/@a/video/1", "https://m.tiktok.com/v/1", "https://vt.tiktok.com/",
    "https://vt.tiktok.com.evil.co/x", "https://www.youtube.com/watch?v=1", "https://vt.tiktok.com/a b", "", null, 5, `https://vt.tiktok.com/${"a".repeat(300)}`])
    assert.equal(linkValido(malo), false, String(malo));
});

test("link de Instagram: reels, posts y tv con https; sin perfiles, stories ni hosts falsos", () => {
  for (const ok of ["https://www.instagram.com/reel/DUf9yHRDRsx/?igsh=MWQ1ZGUxMzBkMA==", "https://www.instagram.com/reel/DUf9yHRDRsx",
    "https://www.instagram.com/reels/DUf9yHRDRsx/", "https://www.instagram.com/p/C7x-_9aB/", "https://www.instagram.com/tv/B1x2/",
    "https://www.instagram.com/fulano.de_tal/reel/DUf9yHRDRsx/", "https://instagram.com/reel/DUf9yHRDRsx/", "https://m.instagram.com/reel/DUf9yHRDRsx/",
    "  https://www.instagram.com/reel/DUf9yHRDRsx/  "])
    assert.equal(linkValido(ok), true, ok);
  for (const malo of ["https://www.instagram.com/fulano", "https://www.instagram.com/fulano/", "https://www.instagram.com/stories/fulano/3456789/",
    "http://www.instagram.com/reel/DUf9yHRDRsx/", "https://instagram.com.evil.co/reel/DUf9yHRDRsx/", "https://evilinstagram.com/reel/DUf9yHRDRsx/",
    "https://www.instagram.com/reel/DUf9 yHRDRsx/", "https://www.instagram.com/reel/", "https://www.instagram.com/reel/DUf9yHRDRsx/extra",
    `https://www.instagram.com/reel/${"a".repeat(300)}/`])
    assert.equal(linkValido(malo), false, malo);
});

test("normalizarLink: Instagram a la forma canónica sin query; TikTok tal cual", () => {
  const R = "https://www.instagram.com/reel/DUf9yHRDRsx/";
  for (const x of ["https://www.instagram.com/reel/DUf9yHRDRsx/?igsh=MWQ1ZGUxMzBkMA==", "https://instagram.com/reels/DUf9yHRDRsx",
    "https://m.instagram.com/fulano/reel/DUf9yHRDRsx/", "https://www.instagram.com/tv/DUf9yHRDRsx/", " https://www.instagram.com/reel/DUf9yHRDRsx "])
    assert.equal(normalizarLink(x), R, x);
  assert.equal(normalizarLink("https://www.instagram.com/fulano/p/C7x-_9aB/?img_index=1"), "https://www.instagram.com/p/C7x-_9aB/");
  assert.equal(normalizarLink(" https://vt.tiktok.com/ZS9/ "), "https://vt.tiktok.com/ZS9/");
  assert.equal(normalizarLink("https://www.tiktok.com/@a/video/123?is_from_webapp=1"), "https://www.tiktok.com/@a/video/123?is_from_webapp=1");
  for (const malo of ["https://www.instagram.com/fulano", "", null, 5]) assert.equal(normalizarLink(malo), null, String(malo));
});

test("el link se guarda solo en pedidos por link y debe ser válido; un pedido por link no lleva pantallazos", () => {
  assert.equal(aplicarCambios(L(), { link: " https://vt.tiktok.com/ZS9/ " }).pedido.link, "https://vt.tiktok.com/ZS9/");
  assert.match(aplicarCambios(L(), { link: "https://youtube.com/x" }).errores[0], /TikTok.*Instagram/);
  assert.equal(aplicarCambios(L(), { link: "https://www.instagram.com/reel/DUf9yHRDRsx/?igsh=abc" }).pedido.link, "https://www.instagram.com/reel/DUf9yHRDRsx/");
  assert.match(aplicarCambios(L(), { link: "https://www.instagram.com/fulano" }).errores[0], /Instagram/);
  assert.match(aplicarCambios(P(), { link: "https://vt.tiktok.com/ZS9/" }).errores[0], /no lleva link/);
  assert.match(aplicarCambios(L(), { pantallazos: [arch("p01.jpg")] }).errores[0], /no lleva pantallazos/);
});

test("para enviar por link: original, tramo, gancho y link (sin pantallazos)", () => {
  const base = { original: arch("original.mp4", { duracion: 28 }), tramos: [[0, 4]], gancho: arch("gancho.mov") };
  assert.deepEqual(erroresParaEnviar({ ...L(), ...base }), ["Falta el link de TikTok o Instagram."]);
  assert.deepEqual(erroresParaEnviar({ ...L(), ...base, link: "https://vt.tiktok.com/ZS9/" }), []);
});

test("la lista pone arriba lo que espera a Oscar: revisión y luego pantallazos", () => {
  const l = [{ id: "1", estado: "listo" }, { id: "2", estado: "necesita_pantallazos" }, { id: "3", estado: "en_revision" },
    { id: "4", estado: "en_pc" }, { id: "5", estado: "en_revision" }];
  assert.deepEqual(ordenarLista(l).map((p) => p.id), ["3", "5", "2", "1", "4"]);
});

test("en necesita_pantallazos solo se cambian los pantallazos, y solo hasta enviarlos", () => {
  const n = { ...L(), estado: "necesita_pantallazos", pantallazos: [], pantallazos_listos: false };
  const r = aplicarCambios(n, { pantallazos: [arch("p01.jpg")] });
  assert.deepEqual(r.errores, []);
  assert.equal(r.pedido.pantallazos.length, 1);
  assert.match(aplicarCambios(n, { titulo: "x" }).errores[0], /solo se pueden subir pantallazos/);
  assert.match(aplicarCambios({ ...n, pantallazos_listos: true }, { pantallazos: [] }).errores[0], /Ya enviaste/);
});

test("subidas: en subiendo todo lo del pedido; en necesita_pantallazos solo pNN hasta enviarlos", () => {
  const n = { ...L(), estado: "necesita_pantallazos", pantallazos_listos: false };
  const b = "cantados/c_20261021_ab12/";
  assert.equal(subidaPermitida(P(), b + "gancho.mov"), true);
  assert.equal(subidaPermitida(n, b + "p01.jpg"), true);
  assert.equal(subidaPermitida(n, b + "original.mp4"), false);
  assert.equal(subidaPermitida({ ...n, pantallazos_listos: true }, b + "p02.jpg"), false);
  assert.equal(subidaPermitida({ ...P(), estado: "listo" }, b + "p01.jpg"), false);
  assert.equal(subidaPermitida(P(), "cantados/otro/p01.jpg"), false);
  assert.equal(subidaPermitida(P(), b + "../x"), false);
  assert.equal(subidaPermitida(null, b + "p01.jpg"), false);
});

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
  assert.deepEqual(erroresParaEnviar({ ...R(), ...base }), ["Falta el link de TikTok o Instagram.", "Falta tu video ya publicado."]);
  const listo = { ...R(), ...base, link: "https://vt.tiktok.com/ZS9/", publicado: arch("publicado.mp4") };
  assert.deepEqual(erroresParaEnviar(listo), []);
  assert.deepEqual(archivos(listo), [listo.original.pathname, listo.gancho.pathname, listo.publicado.pathname]);
  assert.deepEqual(erroresParaEnviar({ ...listo, publicado: { ...listo.publicado, tamano: 0 } }), ["Falta tu video ya publicado."]);
  assert.match(erroresParaEnviar({ ...listo, tipo: "otro" }).join(" "), /todavía no/);
});

test("tono de la etiqueta de estado: ámbar si espera a Oscar, rojo si falló, menta si va en camino", () => {
  assert.equal(tonoEstado({ estado: "en_revision" }), "espera");
  assert.equal(tonoEstado({ estado: "necesita_pantallazos", listos: false }), "espera");
  assert.equal(tonoEstado({ estado: "necesita_pantallazos", listos: true }), "camino");
  assert.equal(tonoEstado({ estado: "fallido" }), "error");
  assert.equal(tonoEstado({ estado: "subiendo" }), "neutro");
  for (const estado of ["listo", "aprobado", "en_pc"]) assert.equal(tonoEstado({ estado }), "camino");
});

test("destino: reel por defecto, story si se pide, los viejos sin campo son reel", () => {
  assert.equal(nuevoPedido("c_1", "2026-10-22T00:00:00Z").destino, "reel");
  assert.equal(nuevoPedido("c_1", "2026-10-22T00:00:00Z", "link", "story").destino, "story");
  assert.equal(destinoDe({}), "reel");
  assert.equal(destinoDe({ destino: "story" }), "story");
});
test("la opción «Story» es un pedido con pantallazos con destino story; las demás son reels", () => {
  assert.deepEqual(pedidoDeOpcion("story"), { tipo: "pantallazos", destino: "story" });
  assert.deepEqual(pedidoDeOpcion("pantallazos"), { tipo: "pantallazos", destino: "reel" });
  assert.deepEqual(pedidoDeOpcion("link"), { tipo: "link", destino: "reel" });
  assert.deepEqual(pedidoDeOpcion("remix"), { tipo: "remix", destino: "reel" });
});
