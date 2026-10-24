import { conApi } from "../../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req) => api.pcCabinaCrear(req));
export const GET = conApi((api, req) => api.pcCabinaLista(req));
