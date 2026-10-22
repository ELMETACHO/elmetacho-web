import { test } from "node:test";
import assert from "node:assert/strict";
import { HOLGURA_FRANJA_H, aplicarRevision, aprobarRevision, aprobarVencido, editarLinea, horasRestantes, lineaValida, listaFinal,
  masAtendido, meter, moverEn, noEditable, pedirMas, ponerComa, publicarPropuesta, puedePublicarPropuesta, quitar, validarPropuesta, vencida } from "./revision.js";

const T = Date.parse("2026-10-22T19:30:00Z");
const H = 3600e3;
const C = (id, dentro = true, extra = {}) => ({ id, usuario: `u${id}`, texto: `texto ${id}`, linea: `linea ${id},`, likes: 3, dentro, ...extra });
const PED = () => ({ id: "c_1", creado: "2026-10-22T18:00:00.000Z", tipo: "link", estado: "en_pc", pantallazos: [] });
const publicado = () => publicarPropuesta(PED(), validarPropuesta([C("a"), C("b"), C("c"), C("d", false)]).comentarios, T);

test("valida la propuesta del PC: ids únicos, línea con coma, al menos uno dentro, likes enteros", () => {
  const { comentarios, errores } = validarPropuesta([C("a", true, { linea: "  sin coma  ", likes: 2.5 }), C("b", false)]);
  assert.deepEqual(errores, []);
  assert.equal(comentarios[0].linea, "sin coma,");
  assert.equal(comentarios[0].likes, null);
  assert.match(validarPropuesta([C("a"), C("a")]).errores[0], /repetido/);
  assert.match(validarPropuesta([C("a/b")]).errores[0], /id válido/);
  assert.match(validarPropuesta([C("a", false)]).errores[0], /ningún comentario dentro/);
  assert.match(validarPropuesta([C("a", true, { linea: " , " })]).errores[0], /línea/);
  assert.match(validarPropuesta([]).errores[0], /entre 1 y 80/);
  assert.match(validarPropuesta("x").errores[0], /entre 1 y 80/);
  assert.match(validarPropuesta([null]).errores[0], /id válido/);
});

test("publicar: en_revision, vence en 24 h, versión 1 y la revisión arranca con la propuesta", () => {
  const p = publicado();
  assert.equal(p.estado, "en_revision");
  assert.equal(p.propuesta.vence, new Date(T + 24 * H).toISOString());
  assert.equal(p.propuesta.version, 1);
  assert.deepEqual(p.revision, { orden: ["a", "b", "c"], fuera: ["d"], lineas: {}, trae_mas: false, aprobada_en: null });
  assert.equal(publicarPropuesta(p, p.propuesta.comentarios, T).propuesta.version, 2);
});

test("vence 2 h antes de las 24 h para que la franja del día siguiente lo recoja", () => {
  const p = publicado();
  assert.equal(HOLGURA_FRANJA_H, 2);
  assert.equal(vencida(p, T + 21.9 * H), false);
  assert.equal(vencida(p, T + 22 * H), true);
  assert.equal(horasRestantes(p, T), 22);
  assert.equal(horasRestantes(p, T + 21.5 * H), 1);
  assert.equal(horasRestantes(p, T + 30 * H), 0);
  assert.equal(vencida({ ...p, revision: { ...p.revision, trae_mas: true } }, T + 30 * H), false);
  assert.equal(vencida({ ...p, estado: "aprobado" }, T + 30 * H), false);
});

test("aplica la revisión completa: orden, fuera y líneas corregidas", () => {
  const { pedido, errores } = aplicarRevision(publicado(), { orden: ["c", "d", "a"], fuera: ["b"], lineas: { d: "otra cosa," }, version: 1 }, T + H);
  assert.deepEqual(errores, []);
  assert.deepEqual(listaFinal(pedido), [{ id: "c", linea: "linea c," }, { id: "d", linea: "otra cosa," }, { id: "a", linea: "linea a," }]);
});

test("rechaza listas viejas o incompletas (otro celular, propuesta nueva) y deja al menos uno", () => {
  const r = (c) => aplicarRevision(publicado(), { version: 1, ...c }, T + H).errores[0];
  assert.match(r({ orden: ["a", "b"], fuera: ["d"] }), /recarga/);
  assert.match(r({ orden: ["a", "b", "c", "x"], fuera: ["d"] }), /recarga/);
  assert.match(r({ orden: ["a", "a", "b", "c"], fuera: [] }), /recarga/);
  assert.match(r({ orden: [], fuera: ["a", "b", "c", "d"] }), /al menos un/);
  assert.match(r({ orden: ["a"] }), /inválidos/);
  assert.match(r(null), /inválidos/);
});

test("una línea corregida debe terminar en coma y no quedar vacía", () => {
  const r = (lineas) => aplicarRevision(publicado(), { orden: ["a", "b", "c"], fuera: ["d"], lineas, version: 1 }, T + H);
  assert.match(r({ a: "sin coma" }).errores[0], /coma/);
  assert.match(r({ a: " , " }).errores[0], /coma/);
  assert.match(r({ x: "hola," }).errores[0], /no está en la propuesta/);
  assert.deepEqual(r({ a: "  bien,  " }).pedido.revision.lineas, { a: "bien," });
  assert.equal(ponerComa(" hola "), "hola,");
  assert.equal(ponerComa("hola,"), "hola,");
  assert.equal(lineaValida(","), false);
});

test("aprobar, pedir más y plazo vencido", () => {
  const p = publicado();
  const a = aprobarRevision(p, T + H, 1).pedido;
  assert.equal(a.estado, "aprobado");
  assert.equal(a.revision.aprobada_en, new Date(T + H).toISOString());
  assert.match(aprobarRevision(a, T + H, 1).errores[0], /no está en revisión/);
  const m = pedirMas(p, T + H, 1).pedido;
  assert.equal(m.revision.trae_mas, true);
  assert.match(aplicarRevision(m, { orden: ["a"], fuera: ["b", "c", "d"], version: 1 }, T + H).errores[0], /pediste más/);
  assert.match(noEditable(p, T + 23 * H), /venció/);
  const v = aprobarVencido(p, T + 23 * H);
  assert.deepEqual([v.estado, v.automatico], ["aprobado", true]);
});

test("«no hay más»: vuelve a revisión con 24 h nuevas y la misma lista", () => {
  const m = pedirMas(publicado(), T + H, 1).pedido;
  const { pedido, errores } = masAtendido(m, T + 24 * H);
  assert.deepEqual(errores, []);
  assert.equal(pedido.revision.trae_mas, false);
  assert.equal(pedido.propuesta.vence, new Date(T + 48 * H).toISOString());
  assert.deepEqual(pedido.revision.orden, ["a", "b", "c"]);
  assert.match(masAtendido(publicado(), T).errores[0], /no pidió más/);
});

test("cambios de la pantalla: quitar, meter, mover y corregir", () => {
  let rev = publicado().revision;
  rev = quitar(rev, "b");
  assert.deepEqual([rev.orden, rev.fuera], [["a", "c"], ["d", "b"]]);
  rev = meter(rev, "d");
  assert.deepEqual([rev.orden, rev.fuera], [["a", "c", "d"], ["b"]]);
  rev = moverEn(rev, 2, -1);
  assert.deepEqual(rev.orden, ["a", "d", "c"]);
  assert.deepEqual(quitar({ orden: ["a"], fuera: [], lineas: {} }, "a").orden, ["a"]);
  rev = editarLinea(rev, "a", "nueva,", "linea a,");
  assert.deepEqual(rev.lineas, { a: "nueva," });
  assert.deepEqual(editarLinea(rev, "a", "linea a,", "linea a,").lineas, {});
});

test("Ruling B: solo se acepta propuesta en en_pc, necesita_pantallazos o en_revision con trae_mas", () => {
  assert.equal(puedePublicarPropuesta(PED()), true);
  assert.equal(puedePublicarPropuesta({ ...PED(), estado: "necesita_pantallazos" }), true);
  assert.equal(puedePublicarPropuesta({ ...PED(), estado: "aprobado" }), false);
  assert.equal(puedePublicarPropuesta({ ...PED(), estado: "nuevo" }), false);
  assert.equal(puedePublicarPropuesta(publicado()), false);
  assert.equal(puedePublicarPropuesta(pedirMas(publicado(), T + H, 1).pedido), true);
});

test("versión vieja del navegador: nada se aplica", () => {
  const p = publicado();
  const cambio = { orden: ["c", "b", "a"], fuera: ["d"] };
  for (const version of [2, undefined, "1"]) {
    const r = aplicarRevision(p, { ...cambio, version }, T + H);
    assert.equal(r.pedido, p);
    assert.match(r.errores[0], /cambió: recarga/);
    assert.equal(r.conflicto, true);
  }
  assert.match(aprobarRevision(p, T + H, 2).errores[0], /cambió: recarga/);
  assert.match(aprobarRevision(p, T + H).errores[0], /cambió: recarga/);
  assert.equal(aprobarRevision(p, T + H, 2).pedido, p);
  const m = pedirMas(p, T + H, 7);
  assert.match(m.errores[0], /cambió: recarga/);
  assert.equal(m.pedido, p);
});

test("aprobarVencido solo actúa si de verdad venció", () => {
  const p = publicado();
  assert.equal(aprobarVencido(p, T + H), p);
  assert.equal(aprobarVencido({ ...p, estado: "aprobado" }, T + 30 * H).estado, "aprobado");
  assert.equal(aprobarVencido(p, T + 22 * H).automatico, true);
});

test("lineas: ids raros no rompen y formas no válidas se rechazan", () => {
  const c = (lineas) => aplicarRevision(publicado(), { orden: ["a", "b", "c"], fuera: ["d"], lineas, version: 1 }, T + H);
  assert.match(c("hola,").errores[0], /inválidos/);
  assert.match(c(["hola,"]).errores[0], /inválidos/);
  assert.match(c({ constructor: "x," }).errores[0], /no está en la propuesta/);
  const p = publicado();
  assert.deepEqual(listaFinal({ ...p, revision: { ...p.revision, lineas: {} } }).map((x) => x.linea), ["linea a,", "linea b,", "linea c,"]);
  const pc = publicarPropuesta(PED(), validarPropuesta([C("constructor"), C("b")]).comentarios, T);
  assert.equal(listaFinal(pc)[0].linea, "linea constructor,");
  assert.equal(editarLinea({ orden: ["a"], fuera: [], lineas: {} }, "__proto__", "x,", "y,").lineas.x, undefined);
});

test("lineaValida rechaza saltos de línea; vence ausente no da NaN", () => {
  assert.equal(lineaValida("hola\nmundo,"), false);
  assert.equal(lineaValida("hola\r,"), false);
  const p = publicado();
  for (const vence of [undefined, "basura"]) {
    const q = { ...p, propuesta: { ...p.propuesta, vence } };
    assert.equal(vencida(q, T + 99 * H), false);
    assert.equal(horasRestantes(q, T), 0);
  }
});
