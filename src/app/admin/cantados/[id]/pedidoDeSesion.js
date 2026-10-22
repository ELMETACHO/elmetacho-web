// Lee un pedido para las páginas /admin/cantados/<id>/… (solo con sesión). Spec fase 2 §4.
import { cookies } from "next/headers";
import { urlRedisDirecta } from "../../../api/lead/config.js";
import { almacenRedis } from "../../lib/almacen.js";
import { COOKIE, sesionValida } from "../../lib/sesion.js";

export async function pedidoDeSesion(id, ahoraMs) {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!sesionValida(valor, process.env.ADMIN_CLAVE, ahoraMs)) return { dentro: false };   // el layout ya muestra la entrada
  let almacen;
  try {
    const url = urlRedisDirecta(process.env);
    if (!url) throw new Error("sin url");
    almacen = await almacenRedis(url);
    return { dentro: true, pedido: await almacen.leer(String(id)) };
  } catch {
    return { dentro: true, error: "No se pudo leer el pedido (Redis no responde)." };
  } finally {
    await almacen?.cerrar();
  }
}
