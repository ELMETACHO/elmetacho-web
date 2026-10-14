// URL de Redis por conexión directa (redis://…). La integración de Redis de Vercel la crea como KV_REDIS_URL;
// los otros nombres quedan por compatibilidad (Redis Cloud, otras integraciones).
export const urlRedisDirecta = (env) => env.KV_REDIS_URL || env.KV_URL || env.REDIS_URL || env.STORAGE_URL;
