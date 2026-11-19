// POST /api/ahorra/registro — correo → 3 archivos gratis (una vez por correo) + lead origen "markitdown" + cookie firmada.
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { COOKIE, cookieSesion, correoValido, normalizarCorreo, registrar } from "../../../mlabs/lib/ahorra/creditos.js";
import { ipDe, json, secreto } from "../../../mlabs/lib/ahorra/servidor.js";
import { avisarTelegram } from "../../../mlabs/lib/tienda/servidor.js";

export const runtime = "nodejs";

export async function POST(req) {
  if (!secreto()) return json({ error: "La herramienta no está configurada todavía." }, 503);
  let d = {};
  try { d = await req.json(); } catch { return json({ error: "Datos inválidos." }, 400); }
  if (d.empresa_web) return json({ ok: true });   // trampa para bots
  const correo = normalizarCorreo(d.correo);
  const nombre = String(d.nombre ?? "").trim().slice(0, 120);
  if (!nombre || !correoValido(correo)) return json({ error: "Escribe tu nombre y un correo válido." }, 400);
  if (!d.acepta) return json({ error: "Acepta el tratamiento de datos para seguir." }, 400);

  const r = await conRedis(async (r) => {
    const x = await registrar(r, correo, ipDe(req));
    if (x.nuevo) await r.lPush("mlabs:leads", JSON.stringify({ nombre, telefono: "", correo, mensaje: "", origen: "markitdown", creado: new Date().toISOString() }));
    return x;
  });
  if (r.error) return json({ error: r.error }, 429);
  if (r.nuevo) await avisarTelegram(`🟥 Nuevo lead MLABS (markitdown)\n\n👤 ${nombre}\n✉️ ${correo}`);
  const cookie = `${COOKIE}=${encodeURIComponent(cookieSesion(correo, secreto()))}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`;
  return json({ ok: true, saldo: r.saldo, correo }, 200, { "set-cookie": cookie });
}
