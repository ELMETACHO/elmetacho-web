// Lógica pura del arrastre para ordenar (spec cabina §4 «Arrastre»): sin DOM, probada con node:test.

// Lleva el elemento de `de` a la posición final `a`. Sin cambio, fuera de rango o con basura: la misma lista.
export function moverA(lista, de, a) {
  const n = lista.length;
  if (![de, a].every(Number.isInteger) || de < 0 || a < 0 || de >= n || a >= n || de === a) return lista;
  const out = [...lista];
  const [x] = out.splice(de, 1);
  out.splice(a, 0, x);
  return out;
}

// Hueco donde caería el puntero: 0 = antes de la primera tarjeta, n = después de la última. `centros` = centro vertical de cada una.
export function huecoEn(centros, y) {
  let k = 0;
  while (k < centros.length && y > centros[k]) k += 1;
  return k;
}

// El hueco cuenta la tarjeta que se arrastra; el índice final no.
export const destinoDeHueco = (de, hueco) => (hueco > de ? hueco - 1 : hueco);

// Raya que marca dónde cae: arriba de la tarjeta i («cae-antes») o, si es la última, abajo («cae-despues»).
export function marcaDe(i, n, de, hueco) {
  if (de === null || hueco === null || destinoDeHueco(de, hueco) === de) return "";
  if (hueco === i) return "cae-antes";
  if (hueco === n && i === n - 1) return "cae-despues";
  return "";
}

// Desplazamiento por cuadro cuando el dedo está cerca de un borde de la pantalla (negativo = hacia arriba).
export function velocidadBorde(y, alto, margen = 80, max = 18) {
  if (y < margen) return -Math.ceil(((margen - Math.max(0, y)) / margen) * max);
  if (y > alto - margen) return Math.ceil(((Math.min(alto, y) - (alto - margen)) / margen) * max);
  return 0;
}
