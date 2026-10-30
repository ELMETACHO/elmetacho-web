// atender.js — lo que hace el webhook con un aviso ya verificado (spec 2026-10-26 §6). Vive aparte de route.js
// para poder probarlo con un Redis en memoria: Next solo admite los métodos HTTP como exportaciones de la ruta.
import { avisar as avisarDeVerdad } from "../../../admin/lib/deps.js";
import { atenderComentario, atenderMensaje } from "../../../admin/lib/instagram/automatizacion.js";
import { crearManejoDeError, pausar } from "../../../admin/lib/instagram/estado.js";
import { crearGraph } from "../../../admin/lib/instagram/graph.js";
import { leerDisparadores } from "../../../admin/lib/instagram/palabras.js";
import { tokenDe } from "../../../admin/lib/instagram/token.js";
import { leerMarca, responde } from "../../../mlabs/lib/automatizar/marcas.js";
import { guardarLinks, huellaDe } from "./meta.js";
import { cuentasDe, repartir } from "./reparto.js";

// ¿Podría haber algo que hacer? Reparte suponiendo que todas las cuentas del aviso responden (el máximo posible),
// salvo la Cabina, que solo recibe DMs con link: si ni así sale una acción, no hace falta abrir Redis.
export const hayAcciones = (evento, env = process.env) =>
  repartir(evento, { cabina: env.IG_CUENTA_CABINA, responden: new Set(cuentasDe(evento).filter((c) => c !== env.IG_CUENTA_CABINA)) }).acciones.length > 0;

// Cuentas que responden: la casa (IG_CUENTA_PALABRAS) y las marcas con ficha que responde y token legible. Nunca la
// Cabina. Un fallo con una marca se registra y se salta: no tumba el aviso para las demás.
async function cuentasQueResponden(r, evento, env) {
  const responden = new Set();
  for (const c of cuentasDe(evento)) {
    if (c === env.IG_CUENTA_CABINA) continue;
    if (c === env.IG_CUENTA_PALABRAS) { responden.add(c); continue; }
    try {
      if (!responde(await leerMarca(r, c))) continue;
      if (!(await tokenDe(r, env, c))) { console.warn(`webhook instagram: la marca ${c} está activa pero no tiene token, se salta`); continue; }
      responden.add(c);
    } catch (e) {
      console.error(`webhook instagram: ficha o token ilegible en ${c}, se salta (${e?.name})`);
    }
  }
  return responden;
}

export async function atenderEvento(r, evento, { env = process.env, avisar = avisarDeVerdad, ahora = Date.now } = {}) {
  const casa = env.IG_CUENTA_PALABRAS;
  const responden = await cuentasQueResponden(r, evento, env);
  const { acciones, desconocidas } = repartir(evento, { cabina: env.IG_CUENTA_CABINA, responden });
  if (desconocidas.length) console.log(`webhook instagram: cuenta sin uso ${desconocidas.join(", ")}`);
  if (!env.IG_HUELLA_SECRETA && acciones.some((a) => a.tipo === "links")) {
    console.log("webhook instagram: falta IG_HUELLA_SECRETA, el pase directo está apagado");
  }
  for (const a of acciones) {
    if (a.tipo === "links") {
      const n = await guardarLinks(r, a.links, undefined, { huella: huellaDe(a.usuario, env.IG_HUELLA_SECRETA) });
      console.log(`webhook instagram: ${a.links.length} link(s), ${n} nuevo(s) en la cola`);
    }
    if (a.tipo === "comentario" || a.tipo === "mensaje") {
      const esCasa = a.cuenta === casa;
      const token = await tokenDe(r, env, a.cuenta);
      if (!token) { if (esCasa) await pausar(r, a.cuenta, avisar, "falta IG_TOKEN_LABS"); continue; }
      const fallo = crearManejoDeError({ r, cuenta: a.cuenta, ahora, avisar, token, casa: esCasa });
      const deps = { r, graph: crearGraph({ token }), disparadores: await leerDisparadores(r, a.cuenta), fallo, token };
      const res = a.tipo === "comentario" ? await atenderComentario(deps, a) : await atenderMensaje(deps, a);
      console.log(`webhook instagram: ${a.cuenta} ${a.tipo} → ${res}`);
    }
  }
}
