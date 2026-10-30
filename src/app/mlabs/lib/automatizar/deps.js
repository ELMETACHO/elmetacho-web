// deps.js — dependencias reales de las rutas de MLABS multimarca (spec 2026-10-26 §3). El entorno se lee al llamar, no al importar.
import * as instagram from "./instagram.js";

export const REDIRECT = "https://mlabs.elmetacho.com/api/mlabs/instagram/vuelta";
export const ig = (env = process.env) => ({
  canjearCodigo: ({ code }) => instagram.canjearCodigo({ code, clientId: env.IG_APP_ID, secreto: env.IG_APP_SECRET, redirectUri: REDIRECT }),
  tokenLargo: ({ token }) => instagram.tokenLargo({ token, secreto: env.IG_APP_SECRET }),
  perfil: instagram.perfil,
  suscribirWebhook: instagram.suscribirWebhook,
  desuscribirWebhook: instagram.desuscribirWebhook,
});
