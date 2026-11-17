// /admin/api/pc/publicar — cola del publicador de Reels de @metacholabs (token del PC).
//   POST { id }            → tokens de subida (1 h) para publicar/<id>/video.mp4 y publicar/<id>/portada.jpg
//   PUT  { id, video, portada?, caption, programado, share_to_feed? } → agrega o reprograma en la cola
//   GET                    → la cola (sin los terminados)
// Encolar no publica nada: el cron solo publica con MLABS_PUBLICADOR=activo (ver docs/mlabs-publicador.md).
import { head } from "@vercel/blob";
import { tokenPcValido } from "../../../lib/sesion.js";
import { conRedis } from "../../../lib/instagram/conexion.js";
import { nuevoItem, validarEntrada } from "../../../../mlabs/lib/publicador/publicador.js";
import { almacenPublicador, blobPublicador } from "../../../../mlabs/lib/publicador/servidor.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO = () => Response.json({ error: "No autorizado." }, { status: 401 });
const pc = (req) => tokenPcValido(req.headers.get("authorization"), process.env.ADMIN_PC_TOKEN);
const cuerpo = async (req) => { try { return await req.json(); } catch { return {}; } };
const existe = async (p) => { try { return Boolean(await head(p)); } catch { return false; } };

export async function POST(req) {
  if (!pc(req)) return NO();
  const { id } = await cuerpo(req);
  if (!/^[a-z0-9-]{3,60}$/.test(id ?? "")) return Response.json({ error: "id inválido." }, { status: 400 });
  return Response.json({
    video: { pathname: `publicar/${id}/video.mp4`, token: await blobPublicador.tokenSubida(`publicar/${id}/video.mp4`, 300 * 1024 * 1024, ["video/mp4"]) },
    portada: { pathname: `publicar/${id}/portada.jpg`, token: await blobPublicador.tokenSubida(`publicar/${id}/portada.jpg`, 8 * 1024 * 1024, ["image/jpeg"]) },
  });
}

export async function PUT(req) {
  if (!pc(req)) return NO();
  const x = await cuerpo(req);
  const errores = validarEntrada(x);
  if (errores.length) return Response.json({ error: errores.join(" ") }, { status: 400 });
  if (!(await existe(x.video))) return Response.json({ error: "El video no está en Blob: súbelo primero." }, { status: 400 });
  if (x.portada && !(await existe(x.portada))) return Response.json({ error: "La portada no está en Blob." }, { status: 400 });
  const item = nuevoItem(x, Date.now());
  const r = await conRedis(async (r) => {
    const a = almacenPublicador(r);
    const previo = await a.leer(item.id);
    if (previo && !["cola", "error", "simulado"].includes(previo.estado)) return { error: `Ya está ${previo.estado}.` };
    await a.guardar(item);
    return { ok: true, item };
  });
  return Response.json(r, { status: r.error ? 409 : 200 });
}

export async function GET(req) {
  if (!pc(req)) return NO();
  return Response.json({ cola: await conRedis((r) => almacenPublicador(r).todos()) });
}
