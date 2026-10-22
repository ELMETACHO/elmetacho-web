// Lógica de las API de /admin con dependencias inyectadas (las rutas pasan Redis, Blob y Telegram reales). Spec admin §6.
import { COOKIE, claveCorrecta, cookieBorrada, cookieSesion, firmarSesion, leerCookie, sesionValida, tokenPcValido } from "./sesion.js";
import { estaBloqueado, limpiarIntentos, registrarFallo } from "./intentos.js";
import { aplicarCambios, archivos, borradorVencido, erroresParaEnviar, nombreVisible, nuevoId, nuevoPedido, prefijo } from "./pedido.js";

const json = (d, status = 200, headers = {}) => Response.json(d, { status, headers });
const NO = () => json({ error: "No autorizado." }, 401);
const ip = (req) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sin-ip";
const cuerpo = async (req) => { try { return await req.json(); } catch { return {}; } };

export function crearApi({ almacen, blob, avisar, env, ahora, azar }) {
  const sesionDe = (req) => sesionValida(leerCookie(req.headers.get("cookie"), COOKIE), env.ADMIN_CLAVE, ahora());
  const esPc = (req) => tokenPcValido(req.headers.get("authorization"), env.ADMIN_PC_TOKEN);
  const conSesion = (f) => async (req, id) => (sesionDe(req) ? f(req, id) : NO());
  const delPc = (f) => async (req, id) => (esPc(req) ? f(req, id) : NO());

  async function verificarArchivos(c) {
    const lista = [c.original, c.gancho, ...(Array.isArray(c.pantallazos) ? c.pantallazos : [])].filter(Boolean);
    for (const a of lista) if ((await blob.tamano(a.pathname)) !== Number(a.tamano)) return `El archivo ${a.pathname.split("/").pop()} no terminó de subir.`;
    return null;
  }

  return {
    sesionDe,
    entrar: async (req) => {
      if (await estaBloqueado(almacen, ip(req))) return json({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
      const { clave } = await cuerpo(req);
      if (!claveCorrecta(clave, env.ADMIN_CLAVE)) { await registrarFallo(almacen, ip(req)); return json({ error: "Clave incorrecta." }, 401); }
      await limpiarIntentos(almacen, ip(req));
      return json({ ok: true }, 200, { "set-cookie": cookieSesion(firmarSesion(env.ADMIN_CLAVE, ahora())) });
    },
    salir: conSesion(async () => json({ ok: true }, 200, { "set-cookie": cookieBorrada() })),
    crear: conSesion(async () => {
      const p = nuevoPedido(nuevoId(new Date(ahora()), azar()), new Date(ahora()).toISOString());
      await almacen.guardar(p);
      return json({ id: p.id });
    }),
    cambiar: conSesion(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      const c = await cuerpo(req);
      const { pedido, errores } = aplicarCambios(p, c);
      if (errores.length) return json({ error: errores.join(" ") }, 400);
      const malo = await verificarArchivos(c);
      if (malo) return json({ error: malo }, 400);
      await almacen.guardar(pedido);
      return json(pedido);
    }),
    enviar: conSesion(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      if (p.estado !== "subiendo") return json({ error: "Ya estaba enviado." }, 409);
      const e = erroresParaEnviar(p);
      if (e.length) return json({ error: e.join(" ") }, 400);
      await almacen.guardar({ ...p, estado: "listo" });
      await avisar(`📥 Recibí: ${nombreVisible(p)} — sale a las 2 p. m.`).catch(() => {});
      return json({ ok: true });
    }),
    cancelar: conSesion(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ ok: true });
      if (p.estado === "en_pc") return json({ error: "El PC lo está haciendo; ya no se puede cancelar." }, 409);
      await blob.borrar(archivos(p));
      await almacen.borrar(id);
      return json({ ok: true });
    }),
    autorizarSubida: async (req, pathname, id) => {
      if (!sesionDe(req)) throw new Error("No autorizado.");
      const p = await almacen.leer(String(id || ""));
      if (!p || p.estado !== "subiendo" || !pathname.startsWith(prefijo(p.id)) || pathname.includes("..")) throw new Error("Subida no permitida.");
    },
    pcPedidos: delPc(async () => {
      const todos = await almacen.listar();
      for (const p of todos.filter((x) => borradorVencido(x, ahora()))) { await blob.borrar(archivos(p)); await almacen.borrar(p.id); }
      const firmar = async (a) => ({ ...a, url: await blob.enlace(a.pathname) });
      const listos = todos.filter((p) => p.estado === "listo");
      return json(await Promise.all(listos.map(async (p) => ({
        id: p.id, creado: p.creado, titulo: p.titulo, estilo: p.estilo, tramos: p.tramos,
        original: await firmar(p.original), gancho: await firmar(p.gancho), pantallazos: await Promise.all(p.pantallazos.map(firmar)),
      }))));
    }),
    pcBajado: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      await blob.borrar(archivos(p));
      await almacen.guardar({ ...p, estado: "en_pc", original: null, gancho: null, pantallazos: [] });
      return json({ ok: true });
    }),
    pcFallido: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      const { motivo } = await cuerpo(req);
      await almacen.guardar({ ...p, estado: "fallido", motivo: String(motivo || "sin detalle").slice(0, 300) });
      return json({ ok: true });
    }),
    pcEntregado: delPc(async (req, id) => { await almacen.borrar(id); return json({ ok: true }); }),
  };
}
