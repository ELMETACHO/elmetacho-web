import { listaDe } from "../lista.js";
import ListaPedidos from "../ListaPedidos.jsx";

export const dynamic = "force-dynamic";

// Stories de Facebook: la misma lista que los videos, solo con destino story (spec stories 2026-10-22 §6).
export default async function Stories() {
  const l = await listaDe("story");
  return l && <ListaPedidos pedidos={l.pedidos} error={l.error} destino="story" />;
}
