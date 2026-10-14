// Sitemap de mlabs.elmetacho.com (el subdominio reescribe /sitemap.xml a esta ruta)
import { listaGuias } from "../recursos/guias";

export const dynamic = "force-static";

export function GET() {
  const base = "https://mlabs.elmetacho.com";
  const urls = ["", "/recursos", ...listaGuias.map((g) => `/recursos/${g.slug}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
