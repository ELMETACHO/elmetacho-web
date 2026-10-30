// deps.js — dependencias reales de las rutas de MLABS multimarca (spec 2026-10-26 §3). El entorno se lee al llamar, no al importar.
import * as instagram from "./instagram.js";
import * as mercadopago from "./mercadopago.js";

export const REDIRECT = "https://mlabs.elmetacho.com/api/mlabs/instagram/vuelta";
export const ig = (env = process.env) => ({
  canjearCodigo: ({ code }) => instagram.canjearCodigo({ code, clientId: env.IG_APP_ID, secreto: env.IG_APP_SECRET, redirectUri: REDIRECT }),
  tokenLargo: ({ token }) => instagram.tokenLargo({ token, secreto: env.IG_APP_SECRET }),
  perfil: instagram.perfil,
  suscribirWebhook: instagram.suscribirWebhook,
  desuscribirWebhook: instagram.desuscribirWebhook,
});

// Cliente de Mercado Pago con el token ya puesto. Sin MP_ACCESS_TOKEN falla claro (el token nunca se escribe en mensajes).
export const mp = (env = process.env) => {
  const token = () => { if (!env.MP_ACCESS_TOKEN) throw new Error("Falta MP_ACCESS_TOKEN"); return env.MP_ACCESS_TOKEN; };
  return {
    crearSuscripcion: (x) => mercadopago.crearSuscripcion({ ...x, token: token() }),
    consultarSuscripcion: (x) => mercadopago.consultarSuscripcion({ ...x, token: token() }),
    consultarCobro: (x) => mercadopago.consultarCobro({ ...x, token: token() }),
    cancelarSuscripcion: (x) => mercadopago.cancelarSuscripcion({ ...x, token: token() }),
  };
};
