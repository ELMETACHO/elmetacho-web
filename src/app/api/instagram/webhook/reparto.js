// reparto.js — cada aviso de Meta trae entry.id = la cuenta de Instagram que lo recibe (spec §4.1).
// IG_CUENTA_CABINA (elmetacho_): DM → cola de la Cabina. IG_CUENTA_PALABRAS (metacholabs): comentarios y mensajes.
import { linksDe } from "./meta.js";

export function repartir(evento, { cabina, palabras }) {
  const acciones = [], desconocidas = [];
  for (const e of evento?.entry ?? []) {
    const cuenta = String(e?.id ?? "");
    if (!cuenta || (cuenta !== cabina && cuenta !== palabras)) { if (cuenta) desconocidas.push(cuenta); continue; }
    for (const m of e.messaging ?? []) {
      const msg = m?.message;
      if (!msg || msg.is_echo) continue;
      if (cuenta === cabina) {
        const links = linksDe({ entry: [{ messaging: [m] }] });
        if (links.length) acciones.push({ tipo: "links", cuenta, links });
      } else {
        acciones.push({ tipo: "mensaje", cuenta, usuario: String(m.sender?.id ?? ""), payload: msg.quick_reply?.payload ?? null });
      }
    }
    if (cuenta !== palabras) continue;
    for (const c of e.changes ?? []) {
      if (c?.field !== "comments") continue;
      const v = c.value ?? {};
      acciones.push({ tipo: "comentario", cuenta, id: String(v.id ?? v.comment_id ?? ""), usuario: String(v.from?.id ?? ""), texto: String(v.text ?? "") });
    }
  }
  return { acciones, desconocidas };
}
