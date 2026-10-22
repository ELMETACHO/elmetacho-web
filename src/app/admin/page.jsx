import { cookies } from "next/headers";
import { almacenRedis } from "./lib/almacen.js";
import { urlRedisDirecta } from "../api/lead/config.js";
import { nombreVisible } from "./lib/pedido.js";
import { COOKIE, sesionValida } from "./lib/sesion.js";
import ListaPedidos from "./ListaPedidos.jsx";

const ahora = () => Date.now();
export const dynamic = "force-dynamic";

export default async function Admin() {
  // El layout ya muestra la entrada sin sesión, pero la página se ejecuta igual: no leer Redis sin sesión.
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!sesionValida(valor, process.env.ADMIN_CLAVE, ahora())) return null;

  let pedidos = [];
  let error = "";
  let almacen;
  try {
    const url = urlRedisDirecta(process.env);
    if (!url) throw new Error("sin url");
    almacen = await almacenRedis(url);
    pedidos = (await almacen.listar()).map((p) => ({
      id: p.id, nombre: nombreVisible(p), creado: p.creado, estado: p.estado, motivo: p.motivo ?? null,
    }));
  } catch {
    error = "No se pudo leer la lista de pedidos (Redis no responde).";
  } finally {
    await almacen?.cerrar();
  }
  return <ListaPedidos pedidos={pedidos} error={error} />;
}
