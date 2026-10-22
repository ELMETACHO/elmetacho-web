// Dependencias reales de las API de /admin: Redis de la cuenta, Vercel Blob privado y el bot central de Telegram.
import { randomBytes } from "node:crypto";
import { del, head, issueSignedToken, list, presignUrl } from "@vercel/blob";
import { urlRedisDirecta } from "../../api/lead/config.js";
import { almacenRedis } from "./almacen.js";
import { crearApi } from "./api.js";

const blob = {
  tamano: async (pathname) => { try { return (await head(pathname)).size; } catch { return null; } },
  // Borra TODO lo que haya bajo el prefijo (incluye subidas reemplazadas o nunca registradas).
  borrarPrefijo: async (prefix) => {
    let cursor;
    do {
      const r = await list({ prefix, cursor });
      if (r.blobs.length) await del(r.blobs.map((b) => b.url));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
  },
  enlace: async (pathname) => {
    const validUntil = Date.now() + 12 * 3600e3;   // el PC puede tardar en bajar; 12 h
    const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
    return (await presignUrl(token, { operation: "get", pathname, access: "private", validUntil })).presignedUrl;
  },
};
async function avisar(texto) {
  const { TELEGRAM_BOT_TOKEN: t, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!t || !chat) return;
  await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text: texto.slice(0, 4000) }), signal: AbortSignal.timeout(10000),
  });
}
export function conApi(fn) {
  return async (req, ctx) => {
    const almacen = await almacenRedis(urlRedisDirecta(process.env));
    try {
      const api = crearApi({ almacen, blob, avisar, env: process.env, ahora: Date.now, azar: () => randomBytes(2).toString("hex") });
      return await fn(api, req, (await ctx?.params)?.id);
    } finally {
      almacen.cerrar();
    }
  };
}
