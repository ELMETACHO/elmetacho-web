// llms.txt: resumen en texto plano para buscadores con IA (ChatGPT, Perplexity, Claude…). Se arma solo desde el contenido.
import { guias, productos, publicos, novedadesRecientes } from "../contenido/index.js";

export const dynamic = "force-static";

export function GET() {
  const base = "https://mlabs.elmetacho.com";
  const txt = `# MLABS

> MLABS es la agencia de El Metacho (EL METACHO S.A.S., Bogotá, Colombia). Monta para marcas y negocios de Latinoamérica sistemas de IA: videos animados todos los días, edición de video a cámara, respuestas automáticas por DM en Instagram y fidelización por WhatsApp.

Contacto: WhatsApp +57 320 264 6716 · contacto@elmetacho.com

## Páginas
- [Inicio](${base}/): guías gratis, productos y servicios de la agencia
- [Guías gratis](${base}/recursos): material de los videos de Metacho Labs
- [Novedades de IA](${base}/novedades): lo nuevo de la semana, con fuente oficial

## Guías
${guias.map((g) => `- [${g.titulo}](${base}/recursos/${g.slug}): ${g.resumen}`).join("\n")}

## Productos (preventa)
${productos.map((p) => `- [${p.nombre}](${base}/productos/${p.slug}): ${p.promesa}`).join("\n")}

## Por público
${publicos.map((p) => `- [${p.titulo}](${base}/para/${p.slug}): ${p.intro}`).join("\n")}

## Novedades recientes
${novedadesRecientes.slice(0, 10).map((n) => `- ${n.titulo} (${n.fecha}): ${n.queEs} Fuente: ${n.fuente.url}`).join("\n")}
`;
  return new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
