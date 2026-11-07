// Catálogo de cantados del PC para «Versionar» (spec 2026-11-07-admin-versionar-design §3): el PC lo sube en cada
// pasada y el buscador del formulario sugiere títulos mientras Oscar escribe.
export const CLAVE_CATALOGO = "cantados:catalogo";
export const MAX_CATALOGO = 3000;
export const CLAVE_PROYECTO = /^[A-Za-z0-9._-]{1,120}$/;

const plano = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function validarCatalogo(lista) {
  if (!Array.isArray(lista)) return { lista: [], error: "El catálogo debe ser una lista." };
  if (lista.length > MAX_CATALOGO) return { lista: [], error: `Máximo ${MAX_CATALOGO} cantados en el catálogo.` };
  const out = [];
  for (const x of lista) {
    const clave = x && typeof x === "object" ? x.clave : null;
    if (typeof clave !== "string" || !CLAVE_PROYECTO.test(clave) || clave.includes(".."))
      return { lista: [], error: "Hay un cantado con clave inválida." };
    const titulo = typeof x.titulo === "string" ? x.titulo.trim().slice(0, 200) : "";
    if (!titulo) return { lista: [], error: "Hay un cantado sin título." };
    const n = Number.isInteger(x.n) && x.n >= 0 ? x.n : 0;
    out.push({ clave, titulo, fecha: typeof x.fecha === "string" ? x.fecha.slice(0, 10) : "", n });
  }
  return { lista: out, error: null };
}

// Cada palabra escrita debe estar en el título (sin tildes ni mayúsculas); conserva el orden del catálogo (más nuevo primero).
export function filtrarCatalogo(lista, texto, max = 8) {
  const palabras = plano(texto).split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];
  return (lista || []).filter((x) => {
    const t = plano(x.titulo);
    return palabras.every((w) => t.includes(w));
  }).slice(0, max);
}
