// Sitemap de mlabs.elmetacho.com (el subdominio reescribe /sitemap.xml a esta ruta)
import { guias, productos, publicos, novedadesRecientes } from "../contenido/index.js";

export const dynamic = "force-static";

export function GET() {
  const base = "https://mlabs.elmetacho.com";
  const urls = [
    { u: "" },
    { u: "/recursos" },
    { u: "/novedades", f: novedadesRecientes[0]?.fecha },
    ...guias.map((g) => ({ u: `/recursos/${g.slug}`, f: g.actualizado })),
    ...productos.map((p) => ({ u: `/productos/${p.slug}` })),
    ...publicos.map((p) => ({ u: `/para/${p.slug}` })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(({ u, f }) => `  <url><loc>${base}${u}</loc>${f ? `<lastmod>${f}</lastmod>` : ""}</url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
