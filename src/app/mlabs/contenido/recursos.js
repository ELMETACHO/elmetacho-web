// recursos.js — guías de MLABS en tiempo de ejecución (solo servidor). Viven en Redis (hash mlabs:recursos, que llena
// /admin/api/pc/recursos); desde 2026-11-16 ya no hay guías en el código: el texto bloqueado no está en el repo público.
import { cache } from "react";
import { productos, publicos } from "./index.js";
import { urlRedisDirecta } from "../../api/lead/config.js";
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

// Sin Redis configurado (desarrollo local) no hay guías. Con Redis configurado, un fallo se lanza: así el ISR sigue
// mostrando la última versión buena en vez de una página vacía, y un build sin Redis no se publica.
export const obtenerGuias = cache(async () => {
  if (!urlRedisDirecta(process.env)) {
    console.warn("[mlabs] sin KV_REDIS_URL: las guías salen vacías (solo en local)");
    return [];
  }
  return combinarRecursos([], await conRedis(leerRecursosRedis));
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
      ...productos.filter((p) => !p.soloPruebas && !p.oculto).map((p) => ({ href: `/productos/${p.slug}`, titulo: p.nombre, tipo: "producto", resumen: p.promesa })),
    ]),
  };
}
