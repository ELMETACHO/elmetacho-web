// redis-memoria.js — lo justo de node-redis 6 para las pruebas, con vencimientos según un reloj inyectable.
export function redisMemoria(reloj = () => Date.now()) {
  const datos = new Map();
  const vivo = (k) => {
    const e = datos.get(k);
    if (e && e.vence && e.vence <= reloj()) { datos.delete(k); return undefined; }
    return e;
  };
  const val = (k, def) => vivo(k)?.v ?? def;
  const poner = (k, v, vence = 0) => void datos.set(k, { v, vence });
  return {
    get: async (k) => { const v = val(k); return typeof v === "string" ? v : null; },
    set: async (k, v, o = {}) => {
      if (o.condition === "NX" && vivo(k)) return null;
      poner(k, String(v), o.expiration ? reloj() + o.expiration.value * 1000 : 0);
      return "OK";
    },
    del: async (k) => (datos.delete(k) ? 1 : 0),
    incr: async (k) => { const e = vivo(k); const n = Number(e?.v || 0) + 1; poner(k, String(n), e?.vence || 0); return n; },
    expire: async (k, s) => { const e = vivo(k); if (!e) return 0; e.vence = reloj() + s * 1000; return 1; },
    sAdd: async (k, m) => { const s = val(k, new Set()); if (s.has(m)) return 0; s.add(m); poner(k, s); return 1; },
    lPush: async (k, m) => { const l = val(k, []); l.unshift(m); poner(k, l); return l.length; },
    lRange: async (k, a, b) => val(k, []).slice(a, b === -1 ? undefined : b + 1),
    hSet: async (k, f, v) => { const h = val(k, {}); h[f] = String(v); poner(k, h); return 1; },
    hGetAll: async (k) => ({ ...val(k, {}) }),
  };
}
