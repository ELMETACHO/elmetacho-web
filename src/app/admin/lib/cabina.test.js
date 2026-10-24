import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_MEDIO, MAX_VISTA, aPurgar, anotarTamano, archivosDelCandidato, diasRestantes, nuevoCandidato, paraElPc, publicarCandidato,
  reglaDeSubida, rutaMedio, rutaVista, separarCabina, textoDias, validarCandidato, vencerCandidato, yaPublicado } from "./cabina.js";
import { aplicarRevision, vencida } from "./revision.js";

const T = Date.parse("2026-10-23T19:10:00Z");
const H = 3600e3;
const ID = "c_20261023_ab12", B = `cantados/${ID}/`;
const iso = (ms) => new Date(ms).toISOString();
const COMS = () => [
  { id: "c1", usuario: "ana", texto: "jajaja", linea: "jajaja,", likes: 120, respuestas: 4, dentro: true, medio: { ext: "jpg", tipo: "imagen" } },
  { id: "c2", usuario: "beto", texto: "uy no", linea: "uy no,", likes: null, respuestas: null, dentro: true },
  { id: "c3", usuario: "caro", texto: "qué es eso", linea: "qué es eso,", likes: 3, respuestas: 0, dentro: false, medio: { ext: "mp4", tipo: "gif" } },
];
const CAND = () => ({ link: "https://www.tiktok.com/@x/video/7", comentarios: COMS(), vista: { duracion: 31.5, ancho: 480, alto: 854 } });
function nuevo(id = ID) {
  const d = validarCandidato(id, CAND());
  assert.deepEqual(d.errores, []);
  return nuevoCandidato(id, iso(T), d);
}
const publicado = (t = T) => publicarCandidato(nuevo(), t);

test("valida el candidato y asigna rutas a la vista y a cada medio por su posición", () => {
  const d = validarCandidato(ID, CAND());
  assert.deepEqual(d.errores, []);
  assert.equal(d.link, "https://www.tiktok.com/@x/video/7");
  assert.deepEqual(d.vista, { duracion: 31.5, ancho: 480, alto: 854 });
  assert.deepEqual(d.comentarios.map((c) => c.medio), [
    { pathname: B + "m01.jpg", tipo: "imagen", tamano: null }, null, { pathname: B + "m03.mp4", tipo: "gif", tamano: null }]);
  assert.deepEqual(d.comentarios.map((c) => [c.likes, c.respuestas]), [[120, 4], [null, null], [3, 0]]);
  const sinDatos = validarCandidato(ID, { ...CAND(), comentarios: [{ ...COMS()[0], likes: null, respuestas: 0, medio: { ext: "gif", tipo: "gif" } }] });
  assert.deepEqual(sinDatos.errores, []);   // likes desconocidos = null; respuestas desconocidas = 0; el GIF llega como .gif
  assert.deepEqual([sinDatos.comentarios[0].likes, sinDatos.comentarios[0].respuestas, sinDatos.comentarios[0].medio.pathname], [null, 0, B + "m01.gif"]);
  assert.equal(rutaVista(ID), B + "vista.mp4");
  assert.equal(rutaMedio(ID, 12, "png"), B + "m12.png");
});

test("rechaza link, vista, likes, respuestas o medios malos", () => {
  const con = (cambio) => ({ ...CAND(), ...cambio });
  const com = (cambio) => con({ comentarios: [{ ...COMS()[0], ...cambio }] });
  const malos = [
    null, [], con({ link: "http://tiktok.com/x" }), con({ vista: undefined }), con({ vista: { duracion: 0, ancho: 480, alto: 854 } }),
    con({ vista: { duracion: 31.5, ancho: 480.5, alto: 854 } }), con({ comentarios: [] }), con({ comentarios: Array.from({ length: 81 }, (_, k) => ({ ...COMS()[1], id: `x${k}` })) }),
    com({ likes: "120" }), com({ likes: 1.5 }), com({ respuestas: -1 }), com({ medio: { ext: "JPG", tipo: "imagen" } }),
    com({ medio: { ext: "exe", tipo: "imagen" } }), com({ medio: { ext: "jpg", tipo: "video" } }), com({ medio: "m01.jpg" }),
  ];
  for (const c of malos) assert.equal(validarCandidato(ID, c).errores.length, 1, JSON.stringify(c)?.slice(0, 80));
});

test("candidato nuevo: tipo cabina, origen sondeo, reel, subiendo, sin propuesta y con los comentarios aparte", () => {
  const p = nuevo();
  assert.deepEqual([p.id, p.tipo, p.origen, p.destino, p.estado, p.propuesta, p.link, p.tramos, p.gancho],
    [ID, "cabina", "sondeo", "reel", "subiendo", null, "https://www.tiktok.com/@x/video/7", [], null]);
  assert.deepEqual(p.vista_previa, { pathname: B + "vista.mp4", tamano: null, duracion: 31.5, ancho: 480, alto: 854 });
  assert.equal(p.comentarios_cabina.length, 3);
  assert.equal(yaPublicado(p), false);
});

test("reglaDeSubida: solo la vista y los medios de ESTE candidato, cada uno con su tope y sus tipos", () => {
  const p = nuevo();
  assert.deepEqual(reglaDeSubida(p, B + "vista.mp4"), { max: MAX_VISTA, tipos: ["video/mp4"] });
  assert.deepEqual(reglaDeSubida(p, B + "m01.jpg"), { max: MAX_MEDIO, tipos: ["image/*", "video/mp4"] });
  assert.deepEqual(reglaDeSubida(p, B + "m03.mp4"), { max: MAX_MEDIO, tipos: ["image/*", "video/mp4"] });
  for (const r of [B + "m02.jpg", B + "m01.png", B + "gancho.mp4", "cantados/otro/vista.mp4", `${B}../otro/vista.mp4`, undefined, 3])
    assert.equal(reglaDeSubida(p, r), null, String(r));
  assert.equal(MAX_VISTA, 50 * 1024 ** 2);
  assert.equal(MAX_MEDIO, 20 * 1024 ** 2);
});

test("anotarTamano guarda el tamaño esperado; archivosDelCandidato lista la vista y los medios", () => {
  let p = anotarTamano(nuevo(), B + "vista.mp4", 4_000_000);
  p = anotarTamano(p, B + "m01.jpg", 1000);
  assert.deepEqual(archivosDelCandidato(p).map((a) => [a.pathname, a.tamano]),
    [[B + "vista.mp4", 4_000_000], [B + "m01.jpg", 1000], [B + "m03.mp4", null]]);
});

test("publicar: en_revision, vence a las 72 h, revisión con los dentro y sin el campo provisional", () => {
  const p = publicado();
  assert.deepEqual([p.estado, p.propuesta.version, p.propuesta.publicada, p.propuesta.vence], ["en_revision", 1, iso(T), iso(T + 72 * H)]);
  assert.deepEqual([p.revision.orden, p.revision.fuera, p.revision.trae_mas], [["c1", "c2"], ["c3"], false]);
  assert.equal("comentarios_cabina" in p, false);
  assert.deepEqual([p.propuesta.comentarios[0].respuestas, p.propuesta.comentarios[0].medio.pathname], [4, B + "m01.jpg"]);
  assert.equal(yaPublicado(p), true);
});

test("vence con la holgura de la franja: a las 70 h menos 1 ms sigue en revisión; a las 70 h (72 − 2) pasa a automatico", () => {
  const p = publicado();
  assert.equal(p.propuesta.vence, iso(T + 72 * H));          // lo guardado sigue siendo publicada + 72 h
  assert.equal(vencerCandidato(p, T + 70 * H - 1), p);
  assert.equal(vencerCandidato(p, T + 70 * H).estado, "automatico");
  assert.equal(vencerCandidato({ ...p, estado: "aprobado" }, T + 99 * H).estado, "aprobado");
  const link = { tipo: "link", estado: "en_revision", revision: { trae_mas: false }, propuesta: { vence: iso(T + 24 * H) } };
  assert.equal(vencida(link, T + 22 * H), true);              // el de link sigue venciendo 2 h antes
  assert.equal(vencerCandidato(link, T + 99 * H), link);      // y vencerCandidato no lo toca
});

test("paraElPc: el aprobado lleva la lista de Oscar; el automatico, el orden propuesto de los dentro", () => {
  const p = publicado();
  const r = aplicarRevision(p, { orden: ["c2", "c3"], fuera: ["c1"], lineas: { c3: "otra cosa," }, version: 1 }, T);
  assert.deepEqual(r.errores, []);
  const aprobado = { ...r.pedido, estado: "aprobado", destino: "story", tramos: [[2, 9]] };
  assert.deepEqual(paraElPc(aprobado), {
    id: ID, estado: "aprobado", link: "https://www.tiktok.com/@x/video/7", destino: "story", titulo: null, tramos: [[2, 9]],
    orden: [{ id: "c2", linea: "uy no," }, { id: "c3", linea: "otra cosa," }], fuera: ["c1"],
  });
  const auto = vencerCandidato(r.pedido, T + 70 * H);
  assert.deepEqual([paraElPc(auto).orden, paraElPc(auto).fuera], [[{ id: "c1", linea: "jajaja," }, { id: "c2", linea: "uy no," }], ["c3"]]);
});

test("purga: sin publicar a las 24 h; en revisión a los 7 días; lo demás no", () => {
  assert.equal(aPurgar(nuevo(), T + 24 * H), false);
  assert.equal(aPurgar(nuevo(), T + 24 * H + 1), true);
  assert.equal(aPurgar(publicado(), T + 7 * 24 * H), false);
  assert.equal(aPurgar(publicado(), T + 7 * 24 * H + 1), true);
  for (const estado of ["aprobado", "automatico", "en_pc"]) assert.equal(aPurgar({ ...publicado(), estado }, T + 99 * 24 * H), false, estado);
  assert.equal(aPurgar({ tipo: "link", estado: "subiendo", creado: iso(T) }, T + 99 * H), false);
});

test("días que faltan, texto de la lista y separación de la Cabina y los pedidos", () => {
  const p = publicado();
  // cuenta hasta el límite real (70 h): 70 h → 3 días; 21 h → 1; 1 h → 1; vencido → 0
  assert.deepEqual([diasRestantes(p, T), diasRestantes(p, T + 49 * H), diasRestantes(p, T + 69 * H), diasRestantes(p, T + 70 * H), diasRestantes({}, T)], [3, 1, 1, 0, 0]);
  assert.deepEqual([textoDias(3), textoDias(1), textoDias(0)], ["sale solo en 3 días", "sale solo en 1 día", "sale solo en la próxima franja"]);
  const a = publicarCandidato(nuevo("c_a"), T);
  const b = publicarCandidato(nuevo("c_b"), T - 10 * H);      // vence antes: va primero
  const link = { id: "c_l", tipo: "link", estado: "en_revision", creado: iso(T) };
  const { cabina, pedidos } = separarCabina([link, nuevo("c_s"), a, { ...publicado(), id: "c_ap", estado: "aprobado" }, b], T);
  assert.deepEqual(cabina, [
    { id: "c_b", nombre: "tiktok.com/@x/video/7", comentarios: 2, dias: 3 },
    { id: "c_a", nombre: "tiktok.com/@x/video/7", comentarios: 2, dias: 3 },
  ]);
  assert.deepEqual(pedidos.map((x) => x.id), ["c_l"]);
});
