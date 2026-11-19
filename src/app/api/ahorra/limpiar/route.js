// Cron diario (vercel.json): borra del Blob lo que se subió a ahorra/ hace más de 1 hora y nunca se convirtió.
// Normalmente no hay nada: /api/ahorra/convertir borra cada archivo apenas lo convierte.
import { del, list } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(req) {
  const s = process.env.CRON_SECRET;
  if (!s || req.headers.get("authorization") !== `Bearer ${s}`) return new Response("No autorizado", { status: 401 });
  const limite = Date.now() - 3600e3;
  let cursor, borrados = 0;
  do {
    const r = await list({ prefix: "ahorra/", cursor });
    const viejos = r.blobs.filter((b) => new Date(b.uploadedAt).getTime() < limite).map((b) => b.pathname);
    if (viejos.length) { await del(viejos); borrados += viejos.length; }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return Response.json({ borrados });
}
