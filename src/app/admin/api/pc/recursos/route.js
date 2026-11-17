// PUT/GET /admin/api/pc/recursos — crea o actualiza un recurso de MLABS (guía) y su regla de palabra en un solo paso.
// Solo con Authorization: Bearer ADMIN_PC_TOKEN. Lógica y pruebas en src/app/mlabs/lib/recursos/api.js.
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { tokenPcValido } from "../../../lib/sesion.js";
import { conRedis } from "../../../lib/instagram/conexion.js";
import { guardarDisparadores, leerDisparadores } from "../../../lib/instagram/palabras.js";
import { guardarRecurso, listarRecursos } from "../../../../mlabs/lib/recursos/api.js";
import { CLAVE_RECURSOS, leerRecursosRedis } from "../../../../mlabs/contenido/recursos.js";
import { productos, publicos, PALABRA_NOVEDADES } from "../../../../mlabs/contenido/index.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO = () => Response.json({ error: "No autorizado." }, { status: 401 });
const contexto = {
  heredadas: [],
  slugsPublicos: new Set(publicos.map((p) => p.slug)),
  slugsProductos: new Set(productos.map((p) => p.slug)),
  reservadas: [PALABRA_NOVEDADES],
};
const almacenDe = (r) => ({
  leerRecursos: () => leerRecursosRedis(r),
  guardarRecurso: (g) => r.hSet(CLAVE_RECURSOS, g.slug, JSON.stringify(g)),
  leerDisparadores: (cuenta) => leerDisparadores(r, cuenta),
  guardarDisparadores: (cuenta, lista) => guardarDisparadores(r, cuenta, lista),
});

export async function GET(req) {
  if (!tokenPcValido(req.headers.get("authorization"), process.env.ADMIN_PC_TOKEN)) return NO();
  const { status, body } = await conRedis((r) => listarRecursos({ almacen: almacenDe(r), contexto }));
  return Response.json(body, { status });
}

export async function PUT(req) {
  if (!tokenPcValido(req.headers.get("authorization"), process.env.ADMIN_PC_TOKEN)) return NO();
  let cuerpo = null;
  try { cuerpo = await req.json(); } catch { /* se valida abajo */ }
  const { status, body } = await conRedis((r) =>
    guardarRecurso(cuerpo, {
      almacen: almacenDe(r),
      contexto,
      nuevoId: () => randomUUID().slice(0, 8),
      revalidar: () => revalidatePath("/mlabs", "layout"),
    }),
  );
  return Response.json(body, { status });
}
