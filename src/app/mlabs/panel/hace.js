// hace.js — «hace 3 s», «hace 5 min»… para el aviso del último DM.
export function hace(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return h < 48 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} días`;
}
