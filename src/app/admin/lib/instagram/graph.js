// graph.js — llamadas a la Graph API de Instagram (Instagram Login), con fetch inyectable para las pruebas.
// Doc (2026-10-25): host graph.instagram.com, Authorization: Bearer; respuesta privada con recipient.comment_id;
// is_user_follow_business solo tras un mensaje del usuario; refresh_access_token con ig_refresh_token.
export const BASE = "https://graph.instagram.com/v26.0";
export const PLAZO = 8000;

export class ErrorMeta extends Error {
  constructor(mensaje, codigo) { super(mensaje); this.codigo = codigo; }
}
export const tokenInvalido = (e) => e instanceof ErrorMeta && e.codigo === 190;

export async function leer(r) {
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d?.error) throw new ErrorMeta(d?.error?.message || `HTTP ${r.status}`, d?.error?.code ?? null);
  return d;
}

export function crearGraph({ token, fetch: f = fetch }) {
  const llamar = async (metodo, ruta, cuerpo) => leer(await f(`${BASE}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(PLAZO),
  }));
  return {
    responderComentario: (id, texto) => llamar("POST", `/${id}/replies?message=${encodeURIComponent(texto)}`),
    privado: (cuenta, comentarioId, message) => llamar("POST", `/${cuenta}/messages`, { recipient: { comment_id: comentarioId }, message }),
    mensaje: (cuenta, usuario, message) => llamar("POST", `/${cuenta}/messages`, { recipient: { id: usuario }, message }),
    sigue: async (usuario) => (await llamar("GET", `/${usuario}?fields=is_user_follow_business`)).is_user_follow_business === true,
  };
}

export async function renovarToken(token, f = fetch) {
  const d = await leer(await f(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(PLAZO) }));
  return { access_token: d.access_token, expires_in: Number(d.expires_in) };
}
