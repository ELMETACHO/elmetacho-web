// Consulta en Bold el estado real de un pago (no confiamos en lo que diga el navegador) y, si quedó aprobado,
// avisa una sola vez al bot central de Telegram.
import { createClient } from "redis";

export const runtime = "nodejs";

async function avisarUnaVez(pedido, texto) {
  const tcp = process.env.KV_URL || process.env.REDIS_URL || process.env.STORAGE_URL;
  if (tcp) {
    const cliente = createClient({ url: tcp });
    try {
      await cliente.connect();
      const nuevo = await cliente.set(`mlabs:pago-avisado:${pedido}`, "1", { NX: true, EX: 60 * 60 * 24 * 30 });
      if (!nuevo) return;
    } catch (e) {
      console.error("pago redis", e);
    } finally {
      cliente.quit().catch(() => {});
    }
  }
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: texto }),
  }).catch(() => {});
}

export async function GET(req) {
  const pedido = new URL(req.url).searchParams.get("pedido") || "";
  if (!/^MLABS-\d+-[a-f0-9]{6}$/.test(pedido)) return Response.json({ error: "Pedido inválido." }, { status: 400 });
  const apiKey = process.env.BOLD_IDENTITY_KEY;
  if (!apiKey) return Response.json({ error: "Los pagos no están configurados todavía." }, { status: 503 });

  const r = await fetch(`https://payments.api.bold.co/v2/payment-voucher/${pedido}`, { headers: { Authorization: `x-api-key ${apiKey}` }, cache: "no-store" });
  if (!r.ok) return Response.json({ estado: "DESCONOCIDO" }, { status: 200 });
  const v = await r.json();
  const estado = v.payment_status || "DESCONOCIDO";
  if (estado === "APPROVED") {
    await avisarUnaVez(pedido, `💰 Pago aprobado en MLABS\n\n${v.description || ""}\nTotal: ${v.total ?? "?"}\nMedio: ${v.payment_method || "?"}\nCorreo: ${v.payer_email || "—"}\nPedido: ${pedido}`);
  }
  return Response.json({ estado, total: v.total, descripcion: v.description, medio: v.payment_method });
}
