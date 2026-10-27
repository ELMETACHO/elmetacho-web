// dm.js — cola de links de DM para el PC (spec §4.2): el PC pide, guarda en PENDIENTES.txt y confirma.
// Filtro de links (spec cantados 2026-10-26 §5): los de pase directo o rescatados salen con forzar: true.
import { COLA, ENTREGADOS, FORZAR } from "./claves.js";

export async function listaDm(r) {
  const [crudos, entregados, forzar] = await Promise.all([r.lRange(COLA, 0, -1), r.hGetAll(ENTREGADOS), r.hGetAll(FORZAR)]);
  return crudos.map((s) => JSON.parse(s)).map((x) => ({ ...x, entregado: entregados[x.link] ?? null, forzar: forzar[x.link] ?? null }));
}

export async function pendientesDm(r) {
  return (await listaDm(r)).filter((x) => !x.entregado).reverse().map((x) => ({ link: x.link, forzar: Boolean(x.forzar) }));
}

export async function confirmarDm(r, links, ahoraIso) {
  let n = 0;
  for (const l of Array.isArray(links) ? links : []) {
    if (typeof l !== "string" || !l) continue;
    await r.hSet(ENTREGADOS, l, ahoraIso);
    await r.hDel(FORZAR, l);
    n++;
  }
  return n;
}

// Pase directo y «Rescatar»: el link vuelve a ser pendiente con forzar, aunque el PC ya lo hubiera recibido.
export async function forzarLink(r, link, ahora = new Date().toISOString()) {
  await r.hSet(FORZAR, link, ahora);
  await r.hDel(ENTREGADOS, link);
  const enCola = (await r.lRange(COLA, 0, -1)).some((s) => { try { return JSON.parse(s).link === link; } catch { return false; } });
  if (!enCola) await r.lPush(COLA, JSON.stringify({ link, recibido: ahora }));
}
