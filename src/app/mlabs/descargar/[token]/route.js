// GET /descargar/<token> (mlabs.elmetacho.com) — entrega del producto comprado. El token está firmado con
// MLABS_ENTREGA_SECRETO y vence a los 7 días; además el pedido tiene que estar pagado en Redis. Redirige a un link
// de Vercel Blob privado que vale 15 minutos.
import { productoPorSlug } from "../../contenido/index.js";
import { leerTokenEntrega } from "../../lib/tienda/tienda.js";
import { almacenTienda, enlaceArchivo } from "../../lib/tienda/servidor.js";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const texto = (t, status) => new Response(t, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" } });

export async function GET(_req, { params }) {
  const secreto = process.env.MLABS_ENTREGA_SECRETO;
  if (!secreto) return texto("La entrega no está configurada todavía.", 503);
  const { token } = await params;
  const t = leerTokenEntrega(decodeURIComponent(token), secreto, Date.now());
  if (!t) return texto("Este link no es válido.", 404);
  if (t.vencido) return texto("Este link venció. Escríbenos por WhatsApp (+57 320 264 6716) con tu número de pedido y te mandamos uno nuevo.", 410);
  const p = await conRedis((r) => almacenTienda(r).leerPedido(t.pedido));
  if (p?.estado !== "pagado") return texto("Ese pedido no aparece pagado. Si ya pagaste, espera unos minutos o escríbenos.", 403);
  const producto = productoPorSlug(p.slug);
  if (!producto?.archivo) return texto("El archivo no está disponible. Ya nos avisaron; te escribimos.", 500);
  return Response.redirect(await enlaceArchivo(producto.archivo), 302);
}
