import { listaDe } from "./lista.js";
import ListaPedidos from "./ListaPedidos.jsx";

export const dynamic = "force-dynamic";

export default async function Admin() {
  // El layout ya muestra la entrada sin sesión, pero la página se ejecuta igual: no leer Redis sin sesión.
  const l = await listaDe("reel");
  return l && <ListaPedidos pedidos={l.pedidos} error={l.error} destino="reel" />;
}
