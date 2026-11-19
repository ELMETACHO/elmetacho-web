// POST /api/ahorra/convertir { pathname } — gasta 1 crédito, baja el archivo del Blob privado, lo convierte a Markdown
// y lo BORRA siempre (salga bien o mal). No se guarda el contenido. Si la conversión falla, el crédito se devuelve.
import { del, issueSignedToken, presignUrl } from "@vercel/blob";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { carpeta, devolver, gastar } from "../../../mlabs/lib/ahorra/creditos.js";
import { convertir, ErrorUsuario, MAX_BYTES } from "../../../mlabs/lib/ahorra/convertir.js";
import { ipDe, json, sesionDe } from "../../../mlabs/lib/ahorra/servidor.js";

export const runtime = "nodejs";
export const maxDuration = 60;

async function bajar(pathname) {
  const validUntil = Date.now() + 5 * 60e3;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const url = (await presignUrl(token, { operation: "get", pathname, access: "private", validUntil })).presignedUrl;
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new ErrorUsuario("No encontramos el archivo. Súbelo otra vez.");
  const buf = await r.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new ErrorUsuario("El archivo pasa de 20 MB.");
  return buf;
}

export async function POST(req) {
  const correo = sesionDe(req);
  if (!correo) return json({ error: "Escribe tu correo primero." }, 401);
  let pathname = "";
  try { ({ pathname } = await req.json()); } catch { /* abajo */ }
  if (typeof pathname !== "string" || !pathname.startsWith(carpeta(correo)) || pathname.includes("..")) return json({ error: "Archivo no válido." }, 400);

  const g = await conRedis((r) => gastar(r, correo, ipDe(req)));
  if (g.error) {
    await del(pathname).catch(() => {});
    return json({ error: g.error, sinSaldo: Boolean(g.sinSaldo) }, g.sinSaldo ? 402 : 429);
  }
  const inicio = Date.now();
  try {
    const nombre = pathname.split("/").pop();
    const r = await convertir(await bajar(pathname), nombre);
    console.log(`[ahorra] ${r.tipo} ${r.paginas ?? "-"} pág ${Date.now() - inicio} ms`);
    return json({ ...r, saldo: g.saldo });
  } catch (e) {
    await conRedis((r) => devolver(r, correo));
    const usuario = e instanceof ErrorUsuario;
    if (!usuario) console.error("[ahorra] fallo", e.message);
    return json({ error: usuario ? e.message : "No pudimos leer ese archivo. ¿Está dañado o protegido con clave? No se descontó tu crédito." }, usuario ? 400 : 422);
  } finally {
    await del(pathname).catch((e) => console.error("[ahorra] no se pudo borrar", e.message));
  }
}
