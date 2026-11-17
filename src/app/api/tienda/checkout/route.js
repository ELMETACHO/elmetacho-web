// POST /api/tienda/checkout — crea el pedido con el precio del servidor y devuelve los datos firmados del botón de Bold.
// Solo funciona con MLABS_TIENDA = "pruebas" | "real" y las llaves puestas (ver docs/mlabs-tienda.md).
import { randomBytes } from "node:crypto";
import { productoPorSlug } from "../../../mlabs/contenido/index.js";
import { modoTienda, sePuedeComprar, MONEDAS, nuevoPedidoId, nuevoPedido, firmaIntegridad, correoValido } from "../../../mlabs/lib/tienda/tienda.js";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { almacenTienda } from "../../../mlabs/lib/tienda/servidor.js";

export const runtime = "nodejs";
const no = (error, status = 400) => Response.json({ error }, { status });

export async function POST(req) {
  const modo = modoTienda(process.env);
  if (!modo) return no("La tienda todavía no está abierta.", 503);
  let d = {};
  try { d = await req.json(); } catch { return no("Datos inválidos."); }
  if (d.empresa_web) return no("Datos inválidos.");   // trampa para bots, igual que /api/lead
  const p = productoPorSlug(String(d.slug ?? ""));
  if (!p || !sePuedeComprar(p, modo)) return no("Ese producto no está a la venta.", 404);
  const moneda = MONEDAS.includes(d.moneda) ? d.moneda : null;
  if (!moneda) return no("Elige COP o USD.");
  if (!correoValido(d.correo)) return no("Revisa tu correo: ahí te llega el producto.");
  if (!d.acepta) return no("Acepta los términos y la política de datos para seguir.");

  const id = nuevoPedidoId(Date.now(), randomBytes(3).toString("hex"));
  const pedido = nuevoPedido({ id, producto: p, moneda, nombre: d.nombre, correo: d.correo, ahora: Date.now(), modo });
  await conRedis((r) => almacenTienda(r).guardarPedido(pedido));

  return Response.json({
    apiKey: process.env.BOLD_IDENTITY_KEY,
    orderId: id,
    amount: String(pedido.monto),
    currency: moneda,
    description: `MLABS · ${p.nombre}`.slice(0, 100),
    integritySignature: firmaIntegridad(id, pedido.monto, moneda, process.env.BOLD_SECRET_KEY),
    prueba: modo === "pruebas",
  });
}
