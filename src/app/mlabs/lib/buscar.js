// Buscador de MLABS: el índice se arma al compilar y la búsqueda corre en el navegador, sin servidor.
import { normalizar } from "./texto.js";

export function crearIndice(items) {
  return items.map(({ href, titulo, tipo, palabra = "", resumen = "", publicos = [] }) => ({
    href,
    titulo,
    tipo,
    palabra,
    p: normalizar(palabra),
    t: normalizar([palabra, titulo, resumen, ...publicos].join(" ")),
  }));
}

export function buscar(indice, consulta, max = 8) {
  const q = normalizar(consulta);
  if (!q) return { exacta: null, resultados: [] };
  const palabras = q.split(/\s+/);
  const exacta = indice.find((x) => x.p && x.p === q) ?? null;
  const resultados = indice
    .filter((x) => palabras.every((w) => x.t.includes(w)))
    .sort((a, b) => Number(b.p.startsWith(q)) - Number(a.p.startsWith(q)))
    .slice(0, max);
  return { exacta, resultados };
}
