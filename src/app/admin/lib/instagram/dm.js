// dm.js — cola de links de DM para el PC (spec §4.2): el PC pide, guarda en PENDIENTES.txt y confirma.
import { COLA, ENTREGADOS } from "./claves.js";

export async function listaDm(r) {
  const [crudos, entregados] = await Promise.all([r.lRange(COLA, 0, -1), r.hGetAll(ENTREGADOS)]);
  return crudos.map((s) => JSON.parse(s)).map((x) => ({ ...x, entregado: entregados[x.link] ?? null }));
}

export async function pendientesDm(r) {
  return (await listaDm(r)).filter((x) => !x.entregado).reverse().map((x) => x.link);
}

export async function confirmarDm(r, links, ahoraIso) {
  let n = 0;
  for (const l of Array.isArray(links) ? links : []) {
    if (typeof l !== "string" || !l) continue;
    await r.hSet(ENTREGADOS, l, ahoraIso);
    n++;
  }
  return n;
}
