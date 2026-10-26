// automatizacion.js — comentario con palabra clave → respuesta pública + respuesta privada; «Ya te sigo» → link
// (spec 2026-10-25 §4.4–4.5). La doc de Meta no dice si una respuesta privada admite botones: por eso cualquier
// mensaje del usuario con espera vigente cuenta como «Ya te sigo».
import { clave } from "./claves.js";
import { enPausa } from "./estado.js";
import { buscarDisparador, esRespuestaPropia } from "./palabras.js";

export const BOTON = "Ya te sigo";
export const PAYLOAD = "YA_TE_SIGO";
const DIA_S = 86400;
const conBoton = (text) => ({ text, quick_replies: [{ content_type: "text", title: BOTON, payload: PAYLOAD }] });
const conLink = (d) => ({ text: `${d.mensaje_dm}\n${d.link}` });

export async function atenderComentario({ r, graph, disparadores, fallo }, a) {
  if (!a.id || !a.usuario || a.usuario === a.cuenta) return "propio";
  if (await enPausa(r, a.cuenta)) return "pausa";
  const d = buscarDisparador(a.texto, disparadores);
  if (!d || esRespuestaPropia(a.texto, disparadores)) return "sin palabra";
  const nuevo = await r.set(clave(a.cuenta, "respondido", a.id), "1", { condition: "NX", expiration: { type: "EX", value: 8 * DIA_S } });
  if (!nuevo) return "repetido";
  try {
    await graph.responderComentario(a.id, d.respuesta_publica);
  } catch (e) {
    await fallo(e);   // p. ej. es respuesta a otro comentario: igual va el DM
  }
  try {
    if (d.pedir_seguir) {
      await graph.privado(a.cuenta, a.id, conBoton("Para recibirlo, sígueme y toca 👇"));
      await r.set(clave(a.cuenta, "esperando", a.usuario), d.id, { expiration: { type: "EX", value: DIA_S } });
    } else {
      await graph.privado(a.cuenta, a.id, conLink(d));
    }
    return "enviado";
  } catch (e) {
    await fallo(e);
    return "fallo";
  }
}

export async function atenderMensaje({ r, graph, disparadores, fallo }, a) {
  const k = clave(a.cuenta, "esperando", a.usuario);
  const idD = a.usuario ? await r.get(k) : null;
  if (!idD) return "sin espera";
  if (await enPausa(r, a.cuenta)) return "pausa";
  const d = disparadores.find((x) => x.id === idD);
  if (!d) { await r.del(k); return "sin disparador"; }
  try {
    if (await graph.sigue(a.usuario)) {
      await graph.mensaje(a.cuenta, a.usuario, conLink(d));
      await r.del(k);
      return "enviado";
    }
    await graph.mensaje(a.cuenta, a.usuario, conBoton("Aún no me sigues 🙂 Sígueme y vuelve a tocar el botón"));
    return "no sigue";
  } catch (e) {
    await fallo(e);
    return "fallo";
  }
}
