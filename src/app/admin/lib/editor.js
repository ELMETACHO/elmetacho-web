// Editor de tramos y orden de pantallazos (lógica pura de la pantalla de nuevo pedido).
const d = (x) => Math.round(x * 10) / 10;
export function marcar(tramos, pendiente, t) {
  if (pendiente === null) return { tramos, pendiente: d(t) };
  const [a, z] = [Math.min(pendiente, t), Math.max(pendiente, t)];
  return { tramos: z > a ? [...tramos, [d(a), d(z)]].sort((x, y) => x[0] - y[0]) : tramos, pendiente: null };
}
export function ajustar(tramos, i, extremo, delta, duracion) {
  return tramos.map((t, k) => {
    if (k !== i) return t;
    let [a, z] = t;
    if (extremo === "inicio") a = Math.min(Math.max(0, d(a + delta)), d(z - 0.1));
    else z = Math.max(Math.min(duracion ?? Infinity, d(z + delta)), d(a + 0.1));
    return [d(a), d(z)];
  });
}
export function mover(lista, i, paso) {
  const j = i + paso;
  if (j < 0 || j >= lista.length) return lista;
  const out = [...lista];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
export const extension = (nombre) => (/\.[a-z0-9]+$/i.exec(nombre || "")?.[0] || ".bin").toLowerCase();
// Extensión que acepta el servidor (2 a 5 caracteres a-z0-9); si no sirve, una segura según el tipo.
export function extSegura(nombre, tipo) {
  const e = extension(nombre);
  return /^\.[a-z0-9]{2,5}$/.test(e) && e !== ".bin" ? e : tipo === "video" ? ".mp4" : ".jpg";
}
