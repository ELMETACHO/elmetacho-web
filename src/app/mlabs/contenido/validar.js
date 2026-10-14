// Revisa todo el contenido de MLABS. Devuelve la lista de errores (vacía = todo bien).
// contenido/index.js la llama al importar: si hay errores, `npm run build` falla y no se publica nada roto.
import { normalizar } from "../lib/texto.js";

const TIPOS = ["guia", "prompt", "mini-curso"];
const BLOQUES = ["p", "lista", "prompt", "tabla", "ojo"];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validarContenido({ guias, productos, novedades, publicos }) {
  const e = [];
  const slugs = (lista) => new Set(lista.map((x) => x.slug));
  const slugsPublicos = slugs(publicos);
  const slugsProductos = slugs(productos);
  const slugsGuias = slugs(guias);

  const repetidos = (lista, que) => {
    const vistos = new Set();
    for (const x of lista) {
      if (vistos.has(x.slug)) e.push(`${que} repetido: ${x.slug}`);
      vistos.add(x.slug);
      if (!SLUG.test(x.slug ?? "")) e.push(`${que} ${x.slug}: slug inválido (minúsculas, números y guiones)`);
    }
  };
  repetidos(guias, "guía");
  repetidos(productos, "producto");
  repetidos(novedades, "novedad");
  repetidos(publicos, "público");

  const faltan = (obj, id, campos) => {
    for (const c of campos) if (!obj[c]) e.push(`${id}: falta ${c}`);
  };
  const listaLlena = (obj, id, campo) => {
    if (!Array.isArray(obj[campo]) || obj[campo].length === 0) e.push(`${id}: falta ${campo}`);
  };

  const palabras = new Set();
  for (const g of guias) {
    const id = `guía ${g.slug}`;
    faltan(g, id, ["palabra", "titulo", "resumen"]);
    if (!TIPOS.includes(g.tipo)) e.push(`${id}: tipo inválido (${g.tipo})`);
    listaLlena(g, id, "publicos");
    for (const p of g.publicos ?? []) if (!slugsPublicos.has(p)) e.push(`${id}: público desconocido ${p}`);
    if (!(g.tiempo > 0)) e.push(`${id}: falta tiempo`);
    if (!FECHA.test(g.actualizado ?? "")) e.push(`${id}: actualizado debe ser AAAA-MM-DD`);
    if (g.productoRelacionado && !slugsProductos.has(g.productoRelacionado))
      e.push(`${id}: producto relacionado inexistente ${g.productoRelacionado}`);
    listaLlena(g, id, "secciones");
    for (const s of g.secciones ?? []) {
      if (!s.titulo) e.push(`${id}: sección sin título`);
      for (const b of s.bloques ?? []) if (!BLOQUES.some((k) => k in b)) e.push(`${id}: bloque desconocido en «${s.titulo}»`);
    }
    const libres = g.seccionesLibres ?? 1;
    if (!Number.isInteger(libres) || libres < 0 || libres > (g.secciones?.length ?? 0))
      e.push(`${id}: seccionesLibres fuera de rango (${libres})`);
    const n = normalizar(g.palabra);
    if (n && palabras.has(n)) e.push(`palabra repetida: ${g.palabra}`);
    palabras.add(n);
  }

  for (const p of productos) {
    const id = `producto ${p.slug}`;
    faltan(p, id, ["nombre", "promesa"]);
    for (const c of ["paraQuien", "noEsPara", "queIncluye", "requisitos"]) listaLlena(p, id, c);
    if (!["preventa", "disponible"].includes(p.estado)) e.push(`${id}: estado inválido (${p.estado})`);
    if (p.estado === "disponible" && !(p.precio > 0)) e.push(`${id}: disponible sin precio`);
    if (!["COP", "USD"].includes(p.moneda)) e.push(`${id}: moneda inválida (${p.moneda})`);
    if (!Array.isArray(p.faq)) e.push(`${id}: faq debe ser una lista`);
  }

  for (const n of novedades) {
    const id = `novedad ${n.slug}`;
    faltan(n, id, ["titulo", "queEs", "paraQueTeSirve"]);
    if (!FECHA.test(n.fecha ?? "")) e.push(`${id}: fecha debe ser AAAA-MM-DD`);
    if (!n.fuente?.nombre || !/^https:\/\/\S+$/.test(n.fuente?.url ?? "")) e.push(`${id}: falta fuente con nombre y URL https`);
    if (n.guiaRelacionada && !slugsGuias.has(n.guiaRelacionada)) e.push(`${id}: guía relacionada inexistente ${n.guiaRelacionada}`);
  }

  for (const p of publicos) faltan(p, `público ${p.slug}`, ["nombre", "titulo", "intro"]);
  return e;
}
