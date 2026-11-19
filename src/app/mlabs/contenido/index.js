// Punto único de entrada al contenido de MLABS. Valida todo al importarse: si algo está mal, el build se detiene.
import { productos } from "./productos.js";
import { ediciones, PALABRA_NOVEDADES } from "./novedades.js";
import { publicos } from "./publicos.js";
import { validarContenido } from "./validar.js";

// Todas las novedades sueltas (destacado + resto de cada edición), cada una con el slug de su edición.
const novedades = ediciones.flatMap((ed) => [ed.destacado, ...(ed.novedades ?? [])].filter(Boolean).map((n) => ({ ...n, edicion: ed.slug })));

// Las guías viven en Redis (contenido/recursos.js): aquí solo se valida lo que sigue en el código.
const guias = [];
const errores = validarContenido({ guias, productos, novedades: [], publicos, ediciones, palabraNovedades: PALABRA_NOVEDADES });
if (errores.length) throw new Error(`Contenido de MLABS inválido:\n- ${errores.join("\n- ")}`);

export { productos, novedades, publicos, ediciones, PALABRA_NOVEDADES };
export const productoPorSlug = (slug) => productos.find((p) => p.slug === slug);
export const publicoPorSlug = (slug) => publicos.find((p) => p.slug === slug);
export const novedadesRecientes = [...novedades].sort((a, b) => b.fecha.localeCompare(a.fecha));
export const edicionesRecientes = [...ediciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
export const edicionPorSlug = (slug) => ediciones.find((e) => e.slug === slug);
// Enlace a una novedad: la edición más reciente vive en /novedades; las anteriores en /novedades/<fecha>.
export const enlaceNovedad = (n) => `${n.edicion === edicionesRecientes[0]?.slug ? "/novedades" : `/novedades/${n.edicion}`}#${n.slug}`;

// Lo que se muestra al público: el producto de prueba solo existe en modo de pruebas de la tienda.
export const productosVisibles = (modo) => productos.filter((p) => !p.oculto && (!p.soloPruebas || modo === "pruebas"));
