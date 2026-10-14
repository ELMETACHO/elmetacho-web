// Punto único de entrada al contenido de MLABS. Valida todo al importarse: si algo está mal, el build se detiene.
import { guias } from "./guias.js";
import { productos } from "./productos.js";
import { novedades } from "./novedades.js";
import { publicos } from "./publicos.js";
import { validarContenido } from "./validar.js";
import { crearIndice } from "../lib/buscar.js";

const errores = validarContenido({ guias, productos, novedades, publicos });
if (errores.length) throw new Error(`Contenido de MLABS inválido:\n- ${errores.join("\n- ")}`);

export { guias, productos, novedades, publicos };
export const guiaPorSlug = (slug) => guias.find((g) => g.slug === slug);
export const productoPorSlug = (slug) => productos.find((p) => p.slug === slug);
export const publicoPorSlug = (slug) => publicos.find((p) => p.slug === slug);
export const novedadesRecientes = [...novedades].sort((a, b) => b.fecha.localeCompare(a.fecha));

export const indiceBusqueda = crearIndice([
  ...guias.map((g) => ({ ...g, href: `/recursos/${g.slug}` })),
  ...productos.map((p) => ({ href: `/productos/${p.slug}`, titulo: p.nombre, tipo: "producto", resumen: p.promesa })),
]);
