// Tramos del bucle que marca Oscar: hasta 3, sin tope de duración (aviso si pasa de 25 s). Spec admin §2.3.
export const MAX_TRAMOS = 3;
export const AVISO_S = 25;
export const LARGO_S = 7;
const HOLGURA_S = 0.3;
const decima = (x) => Math.round(Number(x) * 10) / 10;

export const totalContexto = (tramos) => decima(tramos.reduce((s, [a, z]) => s + (z - a), 0));
export const avisoLargo = (tramos) => totalContexto(tramos) > AVISO_S;

export function validarTramos(tramos, duracion) {
  if (!Array.isArray(tramos) || tramos.length === 0) return { tramos: [], errores: ["Marca al menos un tramo."] };
  if (tramos.length > MAX_TRAMOS) return { tramos: [], errores: [`Son máximo ${MAX_TRAMOS} tramos.`] };
  const errores = [];
  let out = tramos.map((t) => (Array.isArray(t) ? [decima(t[0]), decima(t[1])] : [NaN, NaN])).sort((x, y) => x[0] - y[0]);
  out = out.map(([a, z]) => {
    if (!Number.isFinite(a) || !Number.isFinite(z) || a < 0 || z <= a) {
      errores.push("Cada tramo necesita un inicio y un fin después del inicio.");
      return [a, z];
    }
    if (duracion && z > duracion) {
      if (z - duracion <= HOLGURA_S) return [a, decima(duracion)];
      errores.push(`El tramo ${a}–${z} s se pasa: el video dura ${decima(duracion)} s.`);
    }
    return [a, z];
  });
  for (let k = 1; k < out.length; k++) if (out[k][0] < out[k - 1][1]) errores.push("Hay tramos que se pisan.");
  return { tramos: errores.length ? [] : out, errores };
}
