// API de la Cabina (spec 2026-10-23-admin-cabina-design §4): el PC crea, sube y publica candidatos; Oscar los revisa con sesión.
// Contrato con el PC fijo: no cambiar rutas, cuerpos ni respuestas sin cambiar también el plan del PC.
import { esCabina, nuevoId } from "./pedido.js";
import { anotarTamano, nuevoCandidato, reglaDeSubida, validarCandidato } from "./cabina.js";

const INTENTOS_ID = 5;

export function rutasCabina({ almacen, blob, ahora, azar, json, cuerpo, delPc }) {
  const leerCandidato = async (id) => {
    const p = await almacen.leer(String(id || ""));
    return esCabina(p) ? p : null;
  };
  const noExiste = () => json({ error: "Ese candidato no existe." }, 404);

  return {
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
  };
}
