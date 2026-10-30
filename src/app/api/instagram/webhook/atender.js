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

// ¿Podría haber algo que hacer? Reparte suponiendo que todas las cuentas del aviso responden (el máximo posible):
// si ni así sale una acción, no hace falta abrir Redis (ecos, DMs sin link, cuentas ajenas).
export const hayAcciones = (evento, env = process.env) =>
  repartir(evento, { cabina: env.IG_CUENTA_CABINA, responden: new Set(cuentasDe(evento)) }).acciones.length > 0;

export async function atenderEvento(r, evento, { env = process.env, avisar = avisarDeVerdad, ahora = Date.now } = {}) {
  const casa = env.IG_CUENTA_PALABRAS;
  const responden = new Set();
  for (const c of cuentasDe(evento)) {
    if (c === casa || responde(await leerMarca(r, c))) responden.add(c);
  }
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
