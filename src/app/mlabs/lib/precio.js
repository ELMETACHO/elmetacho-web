// "97.000 COP" / "29 USD". Sin precio (null o 0) devuelve null: la página dice que se anuncia luego.
export function formatoPrecio(valor, moneda) {
  if (!(valor > 0)) return null;
  return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(valor)} ${moneda}`;
}
