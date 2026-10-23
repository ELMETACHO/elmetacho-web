import { cookies } from "next/headers";
import { almacenRedis } from "./lib/almacen.js";
import { urlRedisDirecta } from "../api/lead/config.js";
import { deDestino, nombreVisible, ordenarLista, tipoDe } from "./lib/pedido.js";
import { COOKIE, sesionValida } from "./lib/sesion.js";

// Lista de /admin (reels) o /admin/stories: null si no hay sesión (el layout ya muestra la entrada).
export async function listaDe(destino) {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!sesionValida(valor, process.env.ADMIN_CLAVE, Date.now())) return null;
  let pedidos = [];
  let error = "";
  let almacen;
  try {
    const url = urlRedisDirecta(process.env);
    if (!url) throw new Error("sin url");
    almacen = await almacenRedis(url);
    pedidos = ordenarLista(deDestino(await almacen.listar(), destino)).map((p) => ({
      id: p.id, nombre: nombreVisible(p), creado: p.creado, estado: p.estado, motivo: p.motivo ?? null,
      tipo: tipoDe(p), listos: Boolean(p.pantallazos_listos),
    }));
  } catch {
    error = "No se pudo leer la lista de pedidos (Redis no responde).";
  } finally {
    await almacen?.cerrar();
  }
  return { pedidos, error };
}
