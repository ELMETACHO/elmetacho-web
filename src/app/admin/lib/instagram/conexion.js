// conexion.js — abre y cierra el Redis de la cuenta para una sola operación.
import { createClient } from "redis";
import { urlRedisDirecta } from "../../../api/lead/config.js";

export async function conRedis(fn) {
  const url = urlRedisDirecta(process.env);
  if (!url) throw new Error("Sin Redis (KV_REDIS_URL)");
  const r = createClient({ url });
  await r.connect();
  try {
    return await fn(r);
  } finally {
    r.quit().catch(() => {});
  }
}
