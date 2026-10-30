// mantenimiento.js — trabajo diario del cron (spec 2026-10-26 §6): renueva tokens de la casa y de cada cliente,
// apaga las marcas cuyo periodo (gratis o pagado) ya terminó sin pago y borra a quien lleva 30 días sin reconectar.
// Una cuenta tras otra: el fallo de una no detiene a las demás.
import { avisarSeguro } from "../../../admin/lib/instagram/estado.js";
import { renovarSiHaceFalta } from "../../../admin/lib/instagram/token.js";
import { guardarMarca, guardarSuscripcion, leerMarca, leerSuscripcion, listarClientes } from "./marcas.js";
import { aplicarSuscripcion } from "./mercadopago.js";

const DIA = 864e5;

// Una marca `activa` cuyo fin_servicio o fin_gratis ya pasó se apaga solo si Mercado Pago confirma que no hay pago vigente.
// Con `mp`, lo que Mercado Pago dice ahora manda (aplicarSuscripcion): authorized sigue activa; cancelled/paused queda cancelada
// salvo que aún tenga un periodo pagado por delante. Si no responde, no se toca nada y mañana se reintenta.
// Sin `mp` (o suscripción que Mercado Pago ya no conoce) solo se apaga por fin_servicio vencido, que es una cancelación ya decidida.
async function apagarSiVencida({ r, mp, ahora, avisar }, cuenta, m, s) {
  if (m.estado !== "activa" || m.origen === "codigo" || !s) return m;
  const t = ahora();
  const vencida = (s.fin_servicio && t >= s.fin_servicio) || (s.fin_gratis && t >= s.fin_gratis);
  if (!vencida) return m;
  let nueva = null;
  let pre = null;
  if (mp && s.id_mp) {
    try { pre = await mp.consultarSuscripcion({ id: s.id_mp }); } catch (e) {
      if (e?.status !== 404) { console.error(`mantenimiento ${cuenta}: Mercado Pago no respondió, no se apaga hoy:`, e?.message); return m; }
    }
  }
  if (pre) {
    const res = aplicarSuscripcion(m, s, pre, t);
    if (res.suscripcion) await guardarSuscripcion(r, cuenta, res.suscripcion);
    nueva = res.marca;
  } else if (s.fin_servicio && t >= s.fin_servicio) {
    nueva = { ...m, estado: "cancelada" };
  }
  if (!nueva || nueva === m) return m;
  await guardarMarca(r, cuenta, nueva);
  if (nueva.estado !== m.estado) await avisarSeguro(avisar, `MLABS @${m.usuario}: 🛑 su periodo terminó y se apagó la automatización.`);
  return nueva;
}

export async function mantenerCuentas({ r, env, ahora, renovar, avisar, desconectar, mp }) {
  const res = {};
  if (env.IG_CUENTA_PALABRAS) {
    try { res[env.IG_CUENTA_PALABRAS] = await renovarSiHaceFalta({ r, env, cuenta: env.IG_CUENTA_PALABRAS, ahora, renovar, avisar }); } catch (e) { res[env.IG_CUENTA_PALABRAS] = "error"; console.error("mantenimiento casa:", e?.message); }
  }
  for (const cuenta of await listarClientes(r)) {
    try {
      const m = await leerMarca(r, cuenta);
      if (!m) { res[cuenta] = "sin ficha"; continue; }
      if (m.reconectar_desde && ahora() - m.reconectar_desde >= 30 * DIA) {
        await desconectar(cuenta);
        res[cuenta] = "borrada (30 días sin reconectar)";
        continue;
      }
      await apagarSiVencida({ r, mp, ahora, avisar }, cuenta, m, await leerSuscripcion(r, cuenta));
      res[cuenta] = m.reconectar_desde ? "esperando reconexión" : await renovarSiHaceFalta({ r, env, cuenta, ahora, renovar, avisar });
    } catch (e) {
      res[cuenta] = "error";
      console.error(`mantenimiento ${cuenta}:`, e?.message);
    }
  }
  return res;
}
