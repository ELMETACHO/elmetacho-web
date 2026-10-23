// Lógica de las API de /admin con dependencias inyectadas (las rutas pasan Redis, Blob y Telegram reales). Spec admin §6.
import { COOKIE, claveCorrecta, cookieBorrada, cookieSesion, firmarSesion, leerCookie, sesionValida, tokenPcValido } from "./sesion.js";
import { estaBloqueado, limpiarIntentos, registrarFallo } from "./intentos.js";
import { DESTINOS, EN_EL_PC, TIPOS_DISPONIBLES, TIPOS_STORY, destinoDe, aplicarCambios, borradorVencido, erroresParaEnviar, nombreVisible, nuevoId, nuevoPedido, prefijo, subidaPermitida, tipoDe } from "./pedido.js";
import { aplicarRevision, aprobarRevision, aprobarVencido, listaFinal, masAtendido, noEditable, pedirMas, publicarPropuesta, puedePublicarPropuesta, validarPropuesta, vencida, yaPublicada } from "./revision.js";
import { rutasCabina } from "./api-cabina.js";

const json = (d, status = 200, headers = {}) => Response.json(d, { status, headers });
const NO = () => json({ error: "No autorizado." }, 401);
const ip = (req) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sin-ip";
const cuerpo = async (req) => { try { const c = await req.json(); return c && typeof c === "object" && !Array.isArray(c) ? c : {}; } catch { return {}; } };
// Enlace absoluto a una página del pedido (sirve igual en la vista previa del PR y en producción).
const enlace = (req, id, pagina) => `${new URL(req.url).origin}/admin/cantados/${id}/${pagina}`;

export function crearApi({ almacen, blob, avisar, env, ahora, azar }) {
  const sesionDe = (req) => sesionValida(leerCookie(req.headers.get("cookie"), COOKIE), env.ADMIN_CLAVE, ahora());
  const esPc = (req) => tokenPcValido(req.headers.get("authorization"), env.ADMIN_PC_TOKEN);
  const conSesion = (f) => async (req, id) => (sesionDe(req) ? f(req, id) : NO());
  const delPc = (f) => async (req, id) => (esPc(req) ? f(req, id) : NO());

  async function verificarArchivos(c) {
    const lista = [c.original, c.gancho, c.publicado, ...(Array.isArray(c.pantallazos) ? c.pantallazos : [])].filter(Boolean);
    for (const a of lista) if ((await blob.tamano(a.pathname)) !== Number(a.tamano)) return `El archivo ${a.pathname.split("/").pop()} no terminó de subir.`;
    return null;
  }

  // Aprobar o pedir más: cierra la revisión de Oscar (409 si ya no se puede o la propuesta cambió).
  async function cerrarRevision(req, id, paso) {
    const p = await almacen.leer(id);
    if (!p) return json({ error: "Ese pedido no existe." }, 404);
    const { version } = await cuerpo(req);
    const { pedido, errores } = paso(p, ahora(), version);
    if (errores.length) return json({ error: errores.join(" ") }, 409);
    await almacen.guardar(pedido);
    return json({ ok: true });
  }

  return {
    ...rutasCabina({ almacen, blob, avisar, ahora, azar, json, cuerpo, conSesion, delPc }),
    sesionDe,
    entrar: async (req) => {
      if (await estaBloqueado(almacen, ip(req))) return json({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
      const { clave } = await cuerpo(req);
      if (!claveCorrecta(clave, env.ADMIN_CLAVE)) { await registrarFallo(almacen, ip(req)); return json({ error: "Clave incorrecta." }, 401); }
      await limpiarIntentos(almacen, ip(req));
      return json({ ok: true }, 200, { "set-cookie": cookieSesion(firmarSesion(env.ADMIN_CLAVE, ahora())) });
    },
    salir: conSesion(async () => json({ ok: true }, 200, { "set-cookie": cookieBorrada() })),
    crear: conSesion(async (req) => {
      const { tipo = "pantallazos", destino = "reel" } = await cuerpo(req);
      if (!TIPOS_DISPONIBLES.includes(tipo)) return json({ error: "Tipo de pedido no válido." }, 400);
      if (!DESTINOS.includes(destino)) return json({ error: "Destino no válido." }, 400);
      if (destino === "story" && !TIPOS_STORY.includes(tipo)) return json({ error: "Una story solo puede ser con pantallazos." }, 400);
      const p = nuevoPedido(nuevoId(new Date(ahora()), azar()), new Date(ahora()).toISOString(), tipo, destino);
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
      if (p.estado === "necesita_pantallazos") {
        if (p.pantallazos_listos) return json({ error: "Ya enviaste los pantallazos." }, 409);
        if (!p.pantallazos?.length || !p.pantallazos.every((a) => a.tamano > 0)) return json({ error: "Faltan los pantallazos." }, 400);
        const malo = await verificarArchivos(p);
        if (malo) return json({ error: malo }, 400);
        await almacen.guardar({ ...p, pantallazos_listos: true });
        await avisar(`📥 Recibí los pantallazos de ${nombreVisible(p)} — sale a las 2 p. m.`).catch(() => {});
        return json({ ok: true });
      }
      if (p.estado !== "subiendo") return json({ error: "Ya estaba enviado." }, 409);
      const e = erroresParaEnviar(p);
      if (e.length) return json({ error: e.join(" ") }, 400);
      const malo = await verificarArchivos(p);
      if (malo) return json({ error: malo }, 400);
      await almacen.guardar({ ...p, estado: "listo" });
      const cuando = {
        link: "a las 2 p. m. Claude escoge los comentarios y te mando el enlace para revisarlos.",
        remix: "remix: sale a las 2 p. m., sin revisión (mismos comentarios en otro orden, con otra canción).",
      }[tipoDe(p)] ?? "sale a las 2 p. m.";
      await avisar(`📥 Recibí${destinoDe(p) === "story" ? " la story" : ""}: ${nombreVisible(p)} — ${cuando}`).catch(() => {});
      return json({ ok: true });
    }),
    cancelar: conSesion(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ ok: true });
      if (EN_EL_PC.includes(p.estado)) return json({ error: "El PC lo está haciendo; ya no se puede cancelar." }, 409);
      await blob.borrarPrefijo(prefijo(p.id));
      await almacen.borrar(id);
      return json({ ok: true });
    }),
    revision: conSesion(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      const no = noEditable(p, ahora());
      if (no) return json({ error: no }, 409);
      const c = await cuerpo(req);
      const { pedido, errores, conflicto } = aplicarRevision(p, c, ahora());
      if (errores.length) return json({ error: errores.join(" ") }, conflicto ? 409 : 400);
      await almacen.guardar(pedido);
      return json({ ok: true });
    }),
    aprobar: conSesion((req, id) => cerrarRevision(req, id, aprobarRevision)),
    traeMas: conSesion((req, id) => cerrarRevision(req, id, pedirMas)),
    autorizarSubida: async (req, pathname, id) => {
      if (!sesionDe(req)) throw new Error("No autorizado.");
      const p = await almacen.leer(String(id || ""));
      if (!subidaPermitida(p, pathname)) throw new Error("Subida no permitida.");
    },
    pcPedidos: delPc(async () => {
      const todos = await almacen.listar();
      for (const p of todos.filter((x) => borradorVencido(x, ahora()))) { await blob.borrarPrefijo(prefijo(p.id)); await almacen.borrar(p.id); }
      const firmar = async (a) => (a ? { ...a, url: await blob.enlace(a.pathname) } : null);
      const paraPc = todos.filter((p) => p.estado === "listo" || (p.estado === "necesita_pantallazos" && p.pantallazos_listos));
      return json(await Promise.all(paraPc.map(async (p) => ({
        id: p.id, estado: p.estado, tipo: tipoDe(p), destino: destinoDe(p), link: p.link ?? null, creado: p.creado, titulo: p.titulo, estilo: p.estilo, tramos: p.tramos,
        original: await firmar(p.original), gancho: await firmar(p.gancho), publicado: await firmar(p.publicado ?? null),
        pantallazos: await Promise.all((p.pantallazos || []).map(firmar)),
      }))));
    }),
    pcBajado: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      if (!["listo", "necesita_pantallazos"].includes(p.estado)) return json({ ok: true });   // repetido: no pisar en_pc/en_revision
      await blob.borrarPrefijo(prefijo(p.id));
      await almacen.guardar({ ...p, estado: "en_pc", original: null, gancho: null, publicado: null, pantallazos: [] });
      return json({ ok: true });
    }),
    pcFallido: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      const { motivo } = await cuerpo(req);
      await blob.borrarPrefijo(prefijo(p.id));
      const { propuesta: _p, revision: _r, ...resto } = p;   // el texto de los comentarios solo vive mientras está en revisión
      await almacen.guardar({ ...resto, estado: "fallido", motivo: String(motivo || "sin detalle").slice(0, 300) });
      return json({ ok: true });
    }),
    pcEntregado: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (p) await blob.borrarPrefijo(prefijo(p.id));
      await almacen.borrar(id);
      return json({ ok: true });
    }),
    pcPropuesta: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      if (tipoDe(p) !== "link") return json({ error: "Ese pedido no es por link." }, 400);
      const { comentarios, errores } = validarPropuesta((await cuerpo(req)).comentarios);
      // Ruling Q: repetir la misma propuesta (respuesta perdida) responde 200 sin tocar la revisión ni avisar otra vez.
      if (!errores.length && yaPublicada(p, comentarios)) return json({ ok: true, version: p.propuesta.version, vence: p.propuesta.vence });
      if (!puedePublicarPropuesta(p))
        return json({ error: "Ese pedido no está esperando propuesta.", estado: p.estado, version: p.propuesta?.version ?? null }, 409);
      if (errores.length) return json({ error: errores.join(" ") }, 400);
      const nuevo = publicarPropuesta(p, comentarios, ahora());
      await almacen.guardar(nuevo);
      await avisar(`📝 Ya puedes revisar los comentarios de ${nombreVisible(p)}: ${enlace(req, p.id, "revisar")} — si no lo revisas, se aprueba solo en la franja de mañana.`).catch(() => {});
      return json({ ok: true, version: nuevo.propuesta.version, vence: nuevo.propuesta.vence });
    }),
    pcAprobados: delPc(async () => {
      const todos = await almacen.listar();
      for (const [k, p] of todos.entries()) {
        if (vencida(p, ahora())) {
          todos[k] = aprobarVencido(p, ahora());
          await almacen.guardar(todos[k]);
        }
      }
      const salen = todos.filter((p) => p.propuesta && p.revision && (p.estado === "aprobado" || (p.estado === "en_revision" && p.revision?.trae_mas)));
      return json(salen.map((p) => ({ id: p.id, version: p.propuesta.version, trae_mas: Boolean(p.revision?.trae_mas),
        automatico: Boolean(p.automatico), orden: listaFinal(p), fuera: p.revision?.fuera ?? [] })));
    }),
    pcTraeMasAtendido: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      const { pedido, errores } = masAtendido(p, ahora());
      if (errores.length) return json({ error: errores.join(" ") }, 409);
      const { motivo } = await cuerpo(req);
      await almacen.guardar(pedido);
      const porque = motivo === "sin_quitados"
        ? `No quitaste ninguno en ${nombreVisible(p)}, así que no hay a quién reponer.`
        : `No hay más comentarios para reponer en ${nombreVisible(p)}.`;
      await avisar(`🔄 ${porque} Sigue en revisión: ${enlace(req, p.id, "revisar")}`).catch(() => {});
      return json({ ok: true });
    }),
    pcNecesitaPantallazos: delPc(async (req, id) => {
      const p = await almacen.leer(id);
      if (!p) return json({ error: "Ese pedido no existe." }, 404);
      // Repetición del PC (se perdió la respuesta): ya los está pidiendo; no se borra lo subido ni se avisa otra vez.
      const conLink = ["link", "remix"].includes(tipoDe(p));   // remix: los pantallazos reemplazan la búsqueda en TikTok
      if (conLink && p.estado === "necesita_pantallazos") return json({ ok: true });
      if (!conLink || p.estado !== "en_pc") return json({ error: "Ese pedido no puede pasar a pantallazos." }, 409);
      const motivo = String((await cuerpo(req)).motivo || "TikTok no dejó leer los comentarios").slice(0, 300);
      await almacen.guardar({ ...p, estado: "necesita_pantallazos", pantallazos: [], pantallazos_listos: false, motivo });
      await avisar(`📸 ${nombreVisible(p)}: ${motivo}. Sube los pantallazos aquí: ${enlace(req, p.id, "pantallazos")}`).catch(() => {});
      return json({ ok: true });
    }),
  };
}
