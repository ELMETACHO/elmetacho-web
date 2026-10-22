// almacen.js — pedidos del admin en el Redis de la cuenta (misma conexión que /api/lead).
import { createClient } from "redis";

const IDS = "admin:cantados:ids";
const clave = (id) => `admin:cantados:${id}`;

export async function almacenRedis(url) {
  const c = createClient({ url });
  await c.connect();
  return {
    leer: async (id) => { const v = await c.get(clave(id)); return v ? JSON.parse(v) : null; },
    guardar: async (p) => { await c.set(clave(p.id), JSON.stringify(p)); await c.sAdd(IDS, p.id); },
    borrar: async (id) => { await c.del(clave(id)); await c.sRem(IDS, id); },
    listar: async () => {
      const ids = await c.sMembers(IDS);
      const vals = ids.length ? await c.mGet(ids.map(clave)) : [];
      return vals.filter(Boolean).map((v) => JSON.parse(v)).sort((x, y) => y.creado.localeCompare(x.creado));
    },
    contador: async (k) => Number((await c.get(k)) || 0),
    // Atómico (MULTI): INCR y EXPIRE viajan juntos, así la clave nunca queda sin TTL. EXPIRE en cada fallo (válido en cualquier Redis; NX exige Redis 7).
    sumar: async (k, ttlS) => { const [n] = await c.multi().incr(k).expire(k, ttlS).exec(); return Number(n); },
    borrarClave: async (k) => void (await c.del(k)),
    cerrar: () => c.quit().catch(() => {}),
  };
}
