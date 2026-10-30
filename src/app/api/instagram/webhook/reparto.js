// reparto.js — cada aviso de Meta trae entry.id = la cuenta de Instagram que lo recibe (spec 2026-10-25 §4.1 y
// 2026-10-26 §6). IG_CUENTA_CABINA: DM → cola de la Cabina. Cuentas en «responden» (casa + marcas que pagan):
// comentarios y mensajes. El resto se ignora.
import { linksDe } from "./meta.js";

export const cuentasDe = (evento) => [...new Set((evento?.entry ?? []).map((e) => String(e?.id ?? "")).filter(Boolean))];

export function repartir(evento, { cabina, responden }) {
  const acciones = [], desconocidas = [];
  for (const e of evento?.entry ?? []) {
    const cuenta = String(e?.id ?? "");
    const atiende = responden?.has(cuenta);
    if (!cuenta || (cuenta !== cabina && !atiende)) { if (cuenta) desconocidas.push(cuenta); continue; }
    for (const m of e.messaging ?? []) {
      const msg = m?.message;
      if (!msg || msg.is_echo) continue;
      if (cuenta === cabina) {
        const links = linksDe({ entry: [{ messaging: [m] }] });
        if (links.length) acciones.push({ tipo: "links", cuenta, usuario: String(m.sender?.id ?? ""), links });   // usuario: solo para la huella
      } else {
        acciones.push({ tipo: "mensaje", cuenta, usuario: String(m.sender?.id ?? ""), payload: msg.quick_reply?.payload ?? null });
      }
    }
    if (!atiende) continue;
    for (const c of e.changes ?? []) {
      if (c?.field !== "comments") continue;
      const v = c.value ?? {};
      acciones.push({ tipo: "comentario", cuenta, id: String(v.id ?? v.comment_id ?? ""), usuario: String(v.from?.id ?? ""), texto: String(v.text ?? ""), respuestaA: v.parent_id ?? null });
    }
  }
  return { acciones, desconocidas };
}
