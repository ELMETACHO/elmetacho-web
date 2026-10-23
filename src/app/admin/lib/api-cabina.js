// API de la Cabina (spec 2026-10-23-admin-cabina-design §4): el PC crea, sube y publica candidatos; Oscar los revisa con sesión.
// Contrato con el PC fijo: no cambiar rutas, cuerpos ni respuestas sin cambiar también el plan del PC.
import { esCabina, nuevoId, prefijo } from "./pedido.js";
import { aPurgar, anotarTamano, archivosDelCandidato, nuevoCandidato, paraElPc, publicarCandidato, reglaDeSubida, validarCandidato,
  vencerCandidato, yaPublicado } from "./cabina.js";

const INTENTOS_ID = 5;

export function rutasCabina({ almacen, blob, ahora, azar, json, cuerpo, conSesion, delPc }) {
  const leerCandidato = async (id) => {
    const p = await almacen.leer(String(id || ""));
    return esCabina(p) ? p : null;
  };
  const noExiste = () => json({ error: "Ese candidato no existe." }, 404);
  const ganchoFirmado = async (g) =>
    (g ? { pathname: g.pathname, tamano: g.tamano, ancho: g.ancho ?? null, alto: g.alto ?? null, duracion: g.duracion ?? null, url: await blob.enlace(g.pathname) } : null);

  return {
    // Con sesión: URLs de lectura (12 h) de la vista previa y de las imágenes/GIF, para la página /admin/cabina/<id>.
    cabinaMedios: conSesion(async (req, id) => {
      const p = await leerCandidato(id);
      if (!p) return noExiste();
      if (p.estado !== "en_revision" || !p.vista_previa || !p.propuesta) return json({ error: "Este candidato ya no está en la Cabina." }, 409);
      const conMedio = p.propuesta.comentarios.filter((c) => c.medio?.pathname);
      const [vista, ...urls] = await Promise.all([blob.enlace(p.vista_previa.pathname), ...conMedio.map((c) => blob.enlace(c.medio.pathname))]);
      return json({ vista, medios: Object.fromEntries(conMedio.map((c, k) => [c.id, urls[k]])) });
    }),
    pcCabinaCrear: delPc(async (req) => {
      const c = await cuerpo(req);
      let id = null;
      for (let k = 0; k < INTENTOS_ID && !id; k++) {
        const prueba = nuevoId(new Date(ahora()), azar());
        if (!(await almacen.leer(prueba))) id = prueba;   // nunca pisar un registro (4 hex por día)
      }
      if (!id) return json({ error: "No hubo un id libre; reintenta." }, 503);
      const d = validarCandidato(id, c);
      if (d.errores.length) return json({ error: d.errores.join(" ") }, 400);
      await almacen.guardar(nuevoCandidato(id, new Date(ahora()).toISOString(), d));
      return json({ id });
    }),
    // Token de cliente de Vercel Blob para UNA ruta del candidato; el PC sube con put(pathname, body, {access: "private", token}).
    pcCabinaSubida: delPc(async (req, id) => {
      const p = await leerCandidato(id);
      if (!p) return noExiste();
      if (p.estado !== "subiendo") return json({ error: "Ese candidato ya no está subiendo.", estado: p.estado }, 409);
      const { pathname, tamano } = await cuerpo(req);
      const regla = reglaDeSubida(p, pathname);
      if (!regla) return json({ error: "Esa ruta no es de este candidato." }, 400);
      if (!Number.isInteger(tamano) || tamano <= 0 || tamano > regla.max)
        return json({ error: `Tamaño no válido: máximo ${regla.max / 1024 ** 2} MB.` }, 400);
      const token = await blob.tokenSubida(pathname, tamano, regla.tipos);
      await almacen.guardar(anotarTamano(p, pathname, tamano));
      return json({ token });
    }),
    pcCabinaPublicar: delPc(async (req, id) => {
      const p = await leerCandidato(id);
      if (!p) return noExiste();
      // Repetición (se perdió la respuesta): misma propuesta, sin aviso nuevo.
      if (yaPublicado(p)) return json({ ok: true, version: p.propuesta.version, vence: p.propuesta.vence });
      if (p.estado !== "subiendo") return json({ error: "Ese candidato no se puede publicar.", estado: p.estado }, 409);
      const faltan = [];
      for (const a of archivosDelCandidato(p)) if (!(a.tamano > 0) || (await blob.tamano(a.pathname)) !== a.tamano) faltan.push(a.pathname);
      if (faltan.length) return json({ error: `Faltan archivos: ${faltan.map((x) => x.split("/").pop()).join(", ")}.`, faltan }, 409);
      const nuevo = publicarCandidato(p, ahora());
      await almacen.guardar(nuevo);
      // Sin aviso por candidato: el PC manda un solo resumen por franja («🎬 Cabina: N candidatos nuevos»).
      return json({ ok: true, version: nuevo.propuesta.version, vence: nuevo.propuesta.vence });
    }),
    // Orden: purga (24 h sin publicar, 7 días en revisión) → vencer (70 h → automatico) → responder.
    // vivos = TODOS los ids de tipo cabina que siguen existiendo, en cualquier estado.
    pcCabinaLista: delPc(async () => {
      const t = ahora();
      const vivos = [], decididos = [];
      for (const leido of await almacen.listar()) {
        if (!esCabina(leido)) continue;
        if (aPurgar(leido, t)) {
          await blob.borrarPrefijo(prefijo(leido.id));
          await almacen.borrar(leido.id);
          continue;
        }
        const p = vencerCandidato(leido, t);
        if (p !== leido) await almacen.guardar(p);
        vivos.push(p.id);
        if (p.estado === "aprobado" || p.estado === "automatico") decididos.push(p);
      }
      return json({ decididos: await Promise.all(decididos.map(async (p) => ({ ...paraElPc(p), gancho: await ganchoFirmado(p.gancho) }))), vivos });
    }),
    pcCabinaBajado: delPc(async (req, id) => {
      const p = await leerCandidato(id);
      if (!p) return noExiste();
      if (p.estado === "en_pc") return json({ ok: true });   // repetido
      if (p.estado !== "aprobado" && p.estado !== "automatico") return json({ error: "Ese candidato no está decidido.", estado: p.estado }, 409);
      await blob.borrarPrefijo(prefijo(p.id));
      await almacen.guardar({ ...p, estado: "en_pc", gancho: null, vista_previa: null,
        propuesta: { ...p.propuesta, comentarios: p.propuesta.comentarios.map((c) => ({ ...c, medio: null })) } });
      return json({ ok: true });
    }),
    pcCabinaEntregado: delPc(async (req, id) => {
      const p = await almacen.leer(String(id || ""));
      if (p && !esCabina(p)) return noExiste();   // no borrar un pedido normal por error
      if (p) await blob.borrarPrefijo(prefijo(p.id));
      await almacen.borrar(String(id || ""));
      return json({ ok: true });
    }),
  };
}
