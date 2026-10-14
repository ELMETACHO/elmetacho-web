// Prepara un pago del botón de Bold: crea el identificador del pedido y la firma de integridad
// (SHA-256 de pedido + monto + moneda + llave secreta, en ese orden). La llave secreta nunca sale del servidor.
// En Vercel: Production usa las llaves de producción y Preview las de pruebas (BOLD_IDENTITY_KEY / BOLD_SECRET_KEY).
import { createHash, randomBytes } from "node:crypto";

export const runtime = "nodejs";

const MINIMO = { COP: 1000, USD: 1 };

export async function POST(req) {
  const apiKey = process.env.BOLD_IDENTITY_KEY;
  const secreta = process.env.BOLD_SECRET_KEY;
  if (!apiKey || !secreta) return Response.json({ error: "Los pagos no están configurados todavía." }, { status: 503 });

  let d;
  try {
    d = await req.json();
  } catch {
    return Response.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const moneda = d.moneda === "USD" ? "USD" : "COP";
  const monto = Math.round(Number(String(d.monto ?? "").replace(/[^\d]/g, "")));
  if (!Number.isFinite(monto) || monto < MINIMO[moneda]) {
    return Response.json({ error: `El monto mínimo es ${moneda === "COP" ? "$1.000 COP" : "USD 1"}.` }, { status: 400 });
  }
  const descripcion = String(d.descripcion || "Servicios MLABS").replace(/https?:\/\/\S+/g, "").trim().slice(0, 100).padEnd(2, " ");
  const pedido = `MLABS-${Date.now()}-${randomBytes(3).toString("hex")}`;
  const firma = createHash("sha256").update(`${pedido}${monto}${moneda}${secreta}`).digest("hex");

  return Response.json({ apiKey, orderId: pedido, amount: String(monto), currency: moneda, description: descripcion, integritySignature: firma });
}
