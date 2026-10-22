import { conApi } from "../../../lib/deps.js";
export const runtime = "nodejs";
export const GET = conApi((api, req) => api.pcPedidos(req));
