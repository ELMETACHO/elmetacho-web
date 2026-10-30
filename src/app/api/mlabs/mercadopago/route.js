// src/app/api/mlabs/mercadopago/route.js — avisos de Mercado Pago (spec 2026-10-26 §5). Verifica x-signature y
// siempre consulta el estado real antes de cambiar nada. Firma inválida → 401; avisos irrelevantes → 200;
// fallo real (Mercado Pago o Redis caídos) → 500 para que Mercado Pago reintente.
import { avisar } from "../../../admin/lib/deps.js";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { recibirAviso } from "../../../mlabs/lib/automatizar/cobro.js";
import { mp } from "../../../mlabs/lib/automatizar/deps.js";
import { firmaMpValida } from "../../../mlabs/lib/automatizar/mercadopago.js";

export const runtime = "nodejs";

export async function POST(req) {
  const q = new URL(req.url).searchParams;
  let cuerpo = {};
  try { cuerpo = await req.json(); } catch { /* algunos avisos solo traen query */ }
  const tipo = cuerpo?.type ?? q.get("type") ?? q.get("topic");
  const id = String(cuerpo?.data?.id ?? q.get("data.id") ?? q.get("id") ?? "");
  if (!process.env.MP_WEBHOOK_SECRETO) console.error("mercadopago: falta MP_WEBHOOK_SECRETO; se rechaza el aviso");
  // El manifiesto firma el data.id de la query (?data.id=…); firmaMpValida lo pasa a minúsculas.
  if (!firmaMpValida({ xSignature: req.headers.get("x-signature"), xRequestId: req.headers.get("x-request-id"), dataId: q.get("data.id") ?? id, secreto: process.env.MP_WEBHOOK_SECRETO })) {
    return new Response("Firma inválida", { status: 401 });
  }
  if (!id) return new Response("ok");
  try {
    const res = await conRedis((r) => recibirAviso({ r, mp: mp(), ahora: Date.now, avisar }, { tipo, id }));
    console.log(`mercadopago: ${tipo} ${id} → ${res}`);
    return new Response("ok");
  } catch (e) {
    console.error("mercadopago:", e?.message);
    return new Response("Error", { status: 500 });
  }
}
