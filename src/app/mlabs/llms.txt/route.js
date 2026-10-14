// llms.txt: resumen en texto plano para buscadores con IA (ChatGPT, Perplexity, Claude…)
import { guias } from "../contenido/index.js";

export const dynamic = "force-static";

export function GET() {
  const base = "https://mlabs.elmetacho.com";
  const txt = `# MLABS

> MLABS es la agencia de El Metacho (EL METACHO S.A.S., Bogotá, Colombia). Monta para marcas y negocios de Latinoamérica sistemas de IA: videos animados todos los días, edición de video a cámara, respuestas automáticas por DM en Instagram y fidelización por WhatsApp.

Contacto: WhatsApp +57 320 264 6716 · contacto@elmetacho.com

## Páginas
- [Inicio](${base}/): servicios, cómo trabajamos y contacto
- [Guías gratis](${base}/recursos): material de los videos de Metacho Labs

## Guías
${guias.map((g) => `- [${g.titulo}](${base}/recursos/${g.slug}): ${g.resumen}`).join("\n")}
`;
  return new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
