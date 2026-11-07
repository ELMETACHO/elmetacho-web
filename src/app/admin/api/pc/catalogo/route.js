import { conApi } from "../../../lib/deps.js";
export const runtime = "nodejs";
export const PUT = conApi((api, req) => api.pcCatalogo(req));
