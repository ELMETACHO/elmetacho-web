// servidor.js — dependencias reales del publicador: cola en Redis, Graph API de Instagram (token propio de la app
// de publicación) y Vercel Blob privado (links temporales para que Meta baje el video).
import { del, issueSignedToken, presignUrl } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { BASE, leer, renovarToken } from "../../../admin/lib/instagram/graph.js";
import { cifrar, descifrar } from "../automatizar/cifrado.js";

const COLA = "ig:pub:cola";                      // zset id → programado (ms)
const ITEM = (id) => `ig:pub:item:${id}`;
const TOKEN = (cuenta) => `ig:${cuenta}:token-publicar`;
const FINALES = ["publicado", "error", "simulado"];

export const almacenPublicador = (r) => ({
  leer: async (id) => { const v = await r.get(ITEM(id)); return v ? JSON.parse(v) : null; },
  guardar: async (i) => {
    await r.set(ITEM(i.id), JSON.stringify(i));
    if (FINALES.includes(i.estado)) await r.zRem(COLA, i.id);
    else await r.zAdd(COLA, { score: Date.parse(i.programado), value: i.id });
  },
  pendientes: async (ahora) => {
    const ids = await r.zRangeByScore(COLA, 0, ahora);
    const vals = ids.length ? await r.mGet(ids.map(ITEM)) : [];
    return vals.filter(Boolean).map((v) => JSON.parse(v)).filter((i) => ["cola", "procesando"].includes(i.estado));
  },
  todos: async () => {
    const ids = await r.zRange(COLA, 0, -1);
    const vals = ids.length ? await r.mGet(ids.map(ITEM)) : [];
    return vals.filter(Boolean).map((v) => JSON.parse(v));
  },
});

// Token de la app de publicación: el renovado (cifrado en Redis) o, la primera vez, IG_TOKEN_PUBLICADOR de Vercel.
// Se renueva solo cuando faltan menos de 10 días (los tokens largos de Instagram Login duran 60).
export async function tokenPublicador(r, env, cuenta, ahora) {
  const g = await r.get(TOKEN(cuenta));
  let t = null, vence = 0;
  if (g) { const v = JSON.parse(g); t = descifrar(v.cifrado, env.MLABS_CLAVE_TOKENS); vence = v.vence; }
  if (!t) t = env.IG_TOKEN_PUBLICADOR;
  if (!t) throw new Error("falta IG_TOKEN_PUBLICADOR");
  if (vence - ahora < 10 * 86400e3) {
    try {
      const n = await renovarToken(t);
      await r.set(TOKEN(cuenta), JSON.stringify({ cifrado: cifrar(n.access_token, env.MLABS_CLAVE_TOKENS), vence: ahora + n.expires_in * 1000 }));
      t = n.access_token;
    } catch (e) {
      if (!vence) console.warn("[publicador] no se pudo renovar el token inicial:", e.message);   // < 24 h de creado es normal
    }
  }
  return t;
}

export function igPublicador(token, f = fetch) {
  const llamar = async (metodo, ruta, cuerpo) => leer(await f(`${BASE}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(15000),
  }));
  return {
    limite: async (cuenta) => {
      const d = (await llamar("GET", `/${cuenta}/content_publishing_limit?fields=quota_usage,config`)).data?.[0] ?? {};
      return { usado: Number(d.quota_usage ?? 0), total: Number(d.config?.quota_total ?? 50) };
    },
    crear: async (cuenta, d) => (await llamar("POST", `/${cuenta}/media`, { media_type: "REELS", ...d })).id,
    estado: async (contenedor) => (await llamar("GET", `/${contenedor}?fields=status_code`)).status_code,
    publicar: async (cuenta, contenedor) => (await llamar("POST", `/${cuenta}/media_publish`, { creation_id: contenedor })).id,
  };
}

export const blobPublicador = {
  // Meta descarga el video de esta URL: vale 3 horas (el contenedor se crea en segundos y procesa en minutos).
  enlace: async (pathname) => {
    const validUntil = Date.now() + 3 * 3600e3;
    const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
    return (await presignUrl(token, { operation: "get", pathname, access: "private", validUntil })).presignedUrl;
  },
  borrar: (pathnames) => del(pathnames),
  tokenSubida: (pathname, maximo, tipos) => generateClientTokenFromReadWriteToken({
    pathname, maximumSizeInBytes: maximo, allowedContentTypes: tipos, allowOverwrite: true, addRandomSuffix: false, validUntil: Date.now() + 3600e3,
  }),
};
