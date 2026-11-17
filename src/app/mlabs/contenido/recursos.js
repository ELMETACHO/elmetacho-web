// recursos.js — guías de MLABS en tiempo de ejecución (solo servidor). Une las de Redis (hash mlabs:recursos, que
// llena /admin/api/pc/recursos) con las heredadas de guias.js; si un slug está en las dos, gana Redis. Si Redis no
// responde, se usan las heredadas: la página nunca se cae por eso.
import { cache } from "react";
import { guias as heredadas, productos, publicos } from "./index.js";
import { combinarRecursos, erroresRecurso } from "../lib/recursos/esquema.js";
import { crearIndice } from "../lib/buscar.js";
import { conRedis } from "../../admin/lib/instagram/conexion.js";

export const CLAVE_RECURSOS = "mlabs:recursos";
export const REVALIDAR_S = 300;

const contexto = { slugsPublicos: new Set(publicos.map((p) => p.slug)), slugsProductos: new Set(productos.map((p) => p.slug)) };

export async function leerRecursosRedis(r) {
  const h = await r.hGetAll(CLAVE_RECURSOS);
  const lista = [];
  for (const [slug, v] of Object.entries(h ?? {})) {
    try {
      const g = JSON.parse(v);
      // Un registro roto no tumba la página: se salta y se avisa en el log.
      const e = erroresRecurso(g, contexto);
      if (e.length) console.error(`[mlabs] recurso ${slug} inválido en Redis: ${e.join("; ")}`);
      else lista.push(g);
    } catch {
      console.error(`[mlabs] recurso ${slug}: JSON inválido en Redis`);
    }
  }
  return lista;
}

export const obtenerGuias = cache(async () => {
  try {
    return combinarRecursos(heredadas, await conRedis(leerRecursosRedis));
  } catch (e) {
    console.error(`[mlabs] sin Redis para recursos, uso las guías del código: ${e.message}`);
    return heredadas;
  }
});

// Solo lo que muestra una tarjeta: el catálogo es componente de cliente y no debe cargar el texto de las guías.
export const aTarjeta = ({ slug, tipo, tiempo, palabra, titulo, resumen, publicos: p, portada, actualizado }) =>
  ({ slug, tipo, tiempo, palabra, titulo, resumen, publicos: p, portada: portada ?? null, actualizado });

export async function contenidoGuias() {
  const guias = [...(await obtenerGuias())].sort((a, b) => b.actualizado.localeCompare(a.actualizado));
  return {
    guias,
    guiaPorSlug: (slug) => guias.find((g) => g.slug === slug),
    tarjetasGuias: guias.map(aTarjeta),
    indiceBusqueda: crearIndice([
      ...guias.map((g) => ({ ...aTarjeta(g), href: `/recursos/${g.slug}` })),
      ...productos.map((p) => ({ href: `/productos/${p.slug}`, titulo: p.nombre, tipo: "producto", resumen: p.promesa })),
    ]),
  };
}
