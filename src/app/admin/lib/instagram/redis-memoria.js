// redis-memoria.js — lo justo de node-redis 6 para las pruebas, con vencimientos según un reloj inyectable.
// Como en Redis: cambiar el contenido de una clave no borra su vencimiento, y un set, hash o lista vacíos desaparecen.
export function redisMemoria(reloj = () => Date.now()) {
  const datos = new Map();
  const vivo = (k) => {
    const e = datos.get(k);
    if (e && e.vence && e.vence <= reloj()) { datos.delete(k); return undefined; }
    return e;
  };
  const val = (k, def) => vivo(k)?.v ?? def;
  const poner = (k, v, vence = 0) => void datos.set(k, { v, vence });
  const cambiar = (k, v) => poner(k, v, vivo(k)?.vence || 0);   // conserva el vencimiento (SET sí lo borra)
  const vacio = (v) => (v instanceof Set ? v.size : Array.isArray(v) ? v.length : Object.keys(v).length) === 0;
  const guardar = (k, v) => (vacio(v) ? datos.delete(k) : cambiar(k, v));
  const tramo = (n, a, b) => {   // índices inclusivos de Redis, con negativos desde el final
    const i = a < 0 ? Math.max(n + a, 0) : a, j = b < 0 ? n + b : Math.min(b, n - 1);
    return [i, j];
  };
  return {
    get: async (k) => { const v = val(k); return typeof v === "string" ? v : null; },
    set: async (k, v, o = {}) => {
      if (o.condition === "NX" && vivo(k)) return null;
      poner(k, String(v), o.expiration ? reloj() + o.expiration.value * 1000 : 0);
      return "OK";
    },
    del: async (k) => (vivo(k) && datos.delete(k) ? 1 : 0),
    incr: async (k) => { const e = vivo(k); const n = Number(e?.v || 0) + 1; poner(k, String(n), e?.vence || 0); return n; },
    expire: async (k, s) => { const e = vivo(k); if (!e) return 0; e.vence = reloj() + s * 1000; return 1; },
    sAdd: async (k, m) => { const s = val(k, new Set()); if (s.has(m)) return 0; s.add(m); cambiar(k, s); return 1; },
    sCard: async (k) => val(k, new Set()).size,
    lPush: async (k, m) => { const l = val(k, []); l.unshift(m); cambiar(k, l); return l.length; },
    lRange: async (k, a, b) => { const l = val(k, []); const [i, j] = tramo(l.length, a, b); return l.slice(i, j + 1); },
    lTrim: async (k, a, b) => { const l = val(k, []); const [i, j] = tramo(l.length, a, b); if (vivo(k)) guardar(k, l.slice(i, j + 1)); return "OK"; },
    hSet: async (k, f, v) => { const h = val(k, {}); const nuevo = !(f in h); h[f] = String(v); cambiar(k, h); return nuevo ? 1 : 0; },
    hDel: async (k, fs) => {
      const h = val(k, {}); let n = 0;
      for (const f of [fs].flat()) if (f in h) { delete h[f]; n++; }
      if (vivo(k)) guardar(k, h);
      return n;
    },
    hIncrBy: async (k, f, inc) => { const h = val(k, {}); const n = Number(h[f] || 0) + inc; h[f] = String(n); cambiar(k, h); return n; },
    hGetAll: async (k) => ({ ...val(k, {}) }),
  };
}
