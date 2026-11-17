// POST /api/bold/webhook — notificaciones de Bold (SALE_APPROVED, SALE_REJECTED…). Verifica x-bold-signature
// (hex de HMAC-SHA256 sobre el cuerpo en Base64, con la llave secreta; en pruebas Bold firma con llave vacía),
// procesa cada evento una sola vez y responde 200 rápido. Se configura en el panel de Bold: Integraciones › Webhooks.
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { firmaWebhookValida, pagoDeEvento, confirmarPago, modoTienda } from "../../../mlabs/lib/tienda/tienda.js";
import { almacenTienda, avisarTelegram } from "../../../mlabs/lib/tienda/servidor.js";

export const runtime = "nodejs";

export async function POST(req) {
  const crudo = await req.text();
  const modo = modoTienda(process.env);
  const llaves = [process.env.BOLD_SECRET_KEY, ...(modo === "pruebas" ? [""] : [])].filter((k) => typeof k === "string");
  if (!firmaWebhookValida(crudo, req.headers.get("x-bold-signature"), llaves)) return Response.json({ error: "Firma inválida." }, { status: 401 });

  let ev;
  try { ev = JSON.parse(crudo); } catch { return Response.json({ ok: true }); }
  const pago = pagoDeEvento(ev);
  if (!pago) return Response.json({ ok: true });

  try {
    await conRedis(async (r) => {
      const almacen = almacenTienda(r);
      const idEvento = ev.id ?? `${ev.type}:${pago.idBold}`;
      if (!(await almacen.eventoNuevo(idEvento))) return;
      try {
        await confirmarPago(pago, { almacen, ahora: Date.now(), avisar: avisarTelegram });
      } catch (e) {
        await almacen.olvidarEvento(idEvento);   // así el reintento de Bold sí se procesa
        throw e;
      }
    });
  } catch (e) {
    // 500 → Bold reintenta más tarde (hasta 5 veces). Si falla, se borra la marca del evento para que el reintento cuente.
    console.error("[bold webhook]", e.message);
    return Response.json({ error: "Reintenta." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
