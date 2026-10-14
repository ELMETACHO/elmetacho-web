// Recibe los leads de MLABS (formulario y guías). Los guarda en el Redis de la cuenta (lista "mlabs:leads", aparte de
// las claves de Mystery Cuadros) o en Postgres si existe DATABASE_URL, y avisa al bot central de Telegram
// (si TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID existen).
// No hay que pagar un servicio de correos: los datos quedan en nuestra base y se pueden exportar cuando se quiera.
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

const limpia = (v, max = 500) => String(v ?? "").trim().slice(0, max);

export async function POST(req) {
  let d;
  try {
    d = await req.json();
  } catch {
    return Response.json({ error: "Datos inválidos." }, { status: 400 });
  }
  if (d.empresa_web) return Response.json({ ok: true }); // trampa para bots
  const lead = {
    nombre: limpia(d.nombre, 120),
    telefono: limpia(d.telefono, 40),
    correo: limpia(d.correo, 160),
    mensaje: limpia(d.mensaje, 2000),
    origen: limpia(d.origen, 60) || "mlabs",
  };
  if (!lead.nombre || !(lead.telefono || lead.correo) || !d.acepta) {
    return Response.json({ error: "Faltan tu nombre y un teléfono o correo." }, { status: 400 });
  }

  let guardado = false;
  let avisado = false;
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    try {
      const r = await fetch(redisUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(["LPUSH", "mlabs:leads", JSON.stringify({ ...lead, creado: new Date().toISOString() })]),
      });
      guardado = r.ok;
    } catch (e) {
      console.error("lead redis", e);
    }
  }
  if (!guardado && process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      await sql`create table if not exists leads (id serial primary key, creado timestamptz default now(), nombre text, telefono text, correo text, mensaje text, origen text)`;
      await sql`insert into leads (nombre, telefono, correo, mensaje, origen) values (${lead.nombre}, ${lead.telefono}, ${lead.correo}, ${lead.mensaje}, ${lead.origen})`;
      guardado = true;
    } catch (e) {
      console.error("lead db", e);
    }
  }
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const texto = `🟥 Nuevo lead MLABS (${lead.origen})\n\n👤 ${lead.nombre}\n📱 ${lead.telefono || "—"}\n✉️ ${lead.correo || "—"}\n\n${lead.mensaje || ""}`;
      const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: texto.slice(0, 4000) }),
      });
      avisado = r.ok;
    } catch (e) {
      console.error("lead telegram", e);
    }
  }
  if (!guardado && !avisado) return Response.json({ error: "No pudimos guardar tus datos en este momento." }, { status: 503 });
  return Response.json({ ok: true });
}
