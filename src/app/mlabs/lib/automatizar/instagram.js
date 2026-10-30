// instagram.js — inicio de sesión con Instagram para las marcas (spec 2026-10-26 §3). Doc (2026-10-26):
// developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
// code válido 1 h y de un solo uso, con sufijo "#_"; token largo de ~60 días con ig_exchange_token.
import { BASE, ErrorMeta, PLAZO, leer } from "../../../admin/lib/instagram/graph.js";

export const ALCANCES = "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments";

// El endpoint OAuth responde los errores como {error_type, code, error_message}; graph.js solo conoce {error:{…}}.
async function leerIG(r) {
  const d = await r.clone().json().catch(() => ({}));
  if (d?.error_type) throw new ErrorMeta(d.error_message || `HTTP ${r.status}`, d.code ?? null);
  return leer(r);
}

export function urlAutorizacion({ clientId, redirectUri, state }) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: ALCANCES, state }).toString();
  return u.toString();
}

// Code vencido, repetido o respuesta rara: siempre ErrorMeta (la vuelta lo muestra como «No se conectó tu cuenta»).
export async function canjearCodigo({ code, clientId, secreto, redirectUri, fetch: f = fetch }) {
  const body = new URLSearchParams({ client_id: clientId, client_secret: secreto, grant_type: "authorization_code", redirect_uri: redirectUri, code: String(code).replace(/#_$/, "") });
  const d = await leerIG(await f("https://api.instagram.com/oauth/access_token", { method: "POST", body, signal: AbortSignal.timeout(PLAZO) }));
  const x = Array.isArray(d.data) ? d.data[0] : d;
  if (!x?.access_token) throw new ErrorMeta("Instagram no devolvió el token", null);
  return { token: x.access_token };
}

export async function tokenLargo({ token, secreto, fetch: f = fetch }) {
  const q = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: secreto, access_token: token });
  const d = await leerIG(await f(`https://graph.instagram.com/access_token?${q}`, { signal: AbortSignal.timeout(PLAZO) }));
  if (!d.access_token || !Number.isFinite(Number(d.expires_in)) || d.expires_in === null || d.expires_in === "") throw new ErrorMeta("Instagram no devolvió el token largo", null);
  return { access_token: d.access_token, expires_in: Number(d.expires_in) };
}

const conToken = (f, token, metodo, ruta) => f(`${BASE}${ruta}`, { method: metodo, headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(PLAZO) });

// user_id = id profesional (el de entry[].id de los webhooks); id = app-scoped, se guarda como asid.
export async function perfil({ token, fetch: f = fetch }) {
  const d = await leerIG(await conToken(f, token, "GET", "/me?fields=user_id,username,account_type,id"));
  if (d.user_id == null || d.user_id === "") throw new ErrorMeta("Instagram no devolvió el id de la cuenta", null);
  return { cuenta: String(d.user_id), usuario: String(d.username ?? ""), tipo: d.account_type ?? null, asid: d.id == null ? null : String(d.id) };
}

export const suscribirWebhook = async ({ token, fetch: f = fetch }) => leerIG(await conToken(f, token, "POST", "/me/subscribed_apps?subscribed_fields=comments%2Cmessages"));
// DELETE /subscribed_apps no está documentado: quien llama debe tolerar el fallo (se prueba en vivo).
export const desuscribirWebhook = async ({ token, fetch: f = fetch }) => leerIG(await conToken(f, token, "DELETE", "/me/subscribed_apps"));
