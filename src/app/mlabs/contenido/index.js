// Punto único de entrada al contenido de MLABS. Valida todo al importarse: si algo está mal, el build se detiene.
import { guias } from "./guias.js";
import { productos } from "./productos.js";
import { ediciones, PALABRA_NOVEDADES } from "./novedades.js";
import { publicos } from "./publicos.js";
import { validarContenido } from "./validar.js";
import { crearIndice } from "../lib/buscar.js";

// Todas las novedades sueltas (destacado + resto de cada edición), cada una con el slug de su edición.
const novedades = ediciones.flatMap((ed) => [ed.destacado, ...(ed.novedades ?? [])].filter(Boolean).map((n) => ({ ...n, edicion: ed.slug })));

const errores = validarContenido({ guias, productos, novedades: [], publicos, ediciones, palabraNovedades: PALABRA_NOVEDADES });
if (errores.length) throw new Error(`Contenido de MLABS inválido:\n- ${errores.join("\n- ")}`);

export { guias, productos, novedades, publicos, ediciones, PALABRA_NOVEDADES };
export const guiaPorSlug = (slug) => guias.find((g) => g.slug === slug);
export const productoPorSlug = (slug) => productos.find((p) => p.slug === slug);
export const publicoPorSlug = (slug) => publicos.find((p) => p.slug === slug);
export const novedadesRecientes = [...novedades].sort((a, b) => b.fecha.localeCompare(a.fecha));
export const edicionesRecientes = [...ediciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
export const edicionPorSlug = (slug) => ediciones.find((e) => e.slug === slug);
// Enlace a una novedad: la edición más reciente vive en /novedades; las anteriores en /novedades/<fecha>.
export const enlaceNovedad = (n) => `${n.edicion === edicionesRecientes[0]?.slug ? "/novedades" : `/novedades/${n.edicion}`}#${n.slug}`;

export const indiceBusqueda = crearIndice([
  ...guias.map((g) => ({ ...g, href: `/recursos/${g.slug}` })),
  ...productos.map((p) => ({ href: `/productos/${p.slug}`, titulo: p.nombre, tipo: "producto", resumen: p.promesa })),
]);

// Solo lo que muestra una tarjeta: el catálogo es componente de cliente y no debe cargar el texto completo de las guías.
export const tarjetasGuias = guias.map(({ slug, tipo, tiempo, palabra, titulo, resumen, publicos }) => ({ slug, tipo, tiempo, palabra, titulo, resumen, publicos }));
