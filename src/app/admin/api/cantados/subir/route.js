// Subida directa del navegador a Blob privado (spec §5).
import { handleUpload } from "@vercel/blob/client";
import { conApi } from "../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi(async (api, req) => {
  try {
    const body = await req.json();
    const r = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await api.autorizarSubida(req, pathname, clientPayload);
        return { allowedContentTypes: ["video/*", "image/*"], maximumSizeInBytes: 2 * 1024 ** 3, addRandomSuffix: false, allowOverwrite: true };
      },
    });
    return Response.json(r);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
});
