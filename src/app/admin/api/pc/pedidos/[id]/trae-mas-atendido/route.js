import { conApi } from "../../../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req, id) => api.pcTraeMasAtendido(req, id));
