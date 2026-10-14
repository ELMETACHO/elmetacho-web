export const dynamic = "force-static";

export function GET() {
  return new Response("User-agent: *\nAllow: /\n\nSitemap: https://mlabs.elmetacho.com/sitemap.xml\n", { headers: { "Content-Type": "text/plain" } });
}
