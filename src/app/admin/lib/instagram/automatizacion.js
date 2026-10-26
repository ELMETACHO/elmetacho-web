// automatizacion.js — comentario con palabra clave → respuesta pública + respuesta privada; «Ya te sigo» → link
// (spec 2026-10-25 §4.4–4.5). La doc de Meta no dice si una respuesta privada admite botones: por eso cualquier
// mensaje del usuario con espera vigente cuenta como «Ya te sigo».
import { clave } from "./claves.js";
import { pausaVigente } from "./estado.js";
import { tokenInvalido } from "./graph.js";
import { buscarDisparador, esRespuestaPropia } from "./palabras.js";

export const BOTON = "Ya te sigo";
export const PAYLOAD = "YA_TE_SIGO";
const DIA_S = 86400;
const conBoton = (text) => ({ text, quick_replies: [{ content_type: "text", title: BOTON, payload: PAYLOAD }] });
const conLink = (d) => ({ text: `${d.mensaje_dm}\n${d.link}` });

export async function atenderComentario({ r, graph, disparadores, fallo, token }, a) {
  if (!a.id || !a.usuario || a.usuario === a.cuenta) return "propio";
  if (await pausaVigente(r, a.cuenta, token)) return "pausa";
  const d = buscarDisparador(a.texto, disparadores);
  if (!d || esRespuestaPropia(a.texto, disparadores)) return "sin palabra";
  const nuevo = await r.set(clave(a.cuenta, "respondido", a.id), "1", { condition: "NX", expiration: { type: "EX", value: 8 * DIA_S } });
  if (!nuevo) return "repetido";
  if (!a.respuestaA) {   // Meta solo deja responder en público comentarios de primer nivel; al resto solo va el DM
    try {
      await graph.responderComentario(a.id, d.respuesta_publica);
    } catch (e) {
      await fallo(e);
    }
  }
  try {
    if (d.pedir_seguir) {
      await r.set(clave(a.cuenta, "esperando", a.usuario), d.id, { expiration: { type: "EX", value: DIA_S } });   // antes de enviar: el toque puede llegar enseguida
      await privadoConRespaldo(graph, a.cuenta, a.id);
    } else {
      await graph.privado(a.cuenta, a.id, conLink(d));
    }
    return "enviado";
  } catch (e) {
    await fallo(e);
    return "fallo";
  }
}

// Si Meta rechaza el botón en la respuesta privada, se reintenta una vez con solo texto (cualquier mensaje cuenta).
async function privadoConRespaldo(graph, cuenta, id) {
  try {
    await graph.privado(cuenta, id, conBoton("Para recibirlo, sígueme y toca 👇"));
  } catch (e) {
    if (tokenInvalido(e)) throw e;
    await graph.privado(cuenta, id, { text: "Para recibirlo, sígueme y respóndeme cualquier mensaje 👇" });
  }
}

export async function atenderMensaje({ r, graph, disparadores, fallo, token }, a) {
  const k = clave(a.cuenta, "esperando", a.usuario);
  const idD = a.usuario ? await r.get(k) : null;
  if (!idD) return "sin espera";
  if (await pausaVigente(r, a.cuenta, token)) return "pausa";
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
