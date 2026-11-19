// POST /api/ahorra/subida — token de subida directa a Vercel Blob privado (evita el límite de 4,5 MB de las funciones).
// Solo con sesión, saldo > 0 y dentro de la carpeta de la persona. El archivo se borra al convertirlo.
import { handleUpload } from "@vercel/blob/client";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { carpeta, saldoDe } from "../../../mlabs/lib/ahorra/creditos.js";
import { MAX_BYTES, TIPOS, tipoDe } from "../../../mlabs/lib/ahorra/convertir.js";
import { json, sesionDe } from "../../../mlabs/lib/ahorra/servidor.js";

export const runtime = "nodejs";

export async function POST(req) {
  const correo = sesionDe(req);
  if (!correo) return json({ error: "Escribe tu correo primero." }, 401);
  try {
    const body = await req.json();
    const r = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(carpeta(correo)) || !tipoDe(pathname)) throw new Error("Archivo no permitido.");
        if ((await conRedis((r) => saldoDe(r, correo))) < 1) throw new Error("Se acabaron tus archivos gratis.");
        return { allowedContentTypes: [...Object.values(TIPOS), "application/octet-stream"], maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return json(r);
  } catch (e) {
    return json({ error: e.message }, 400);
  }
}
