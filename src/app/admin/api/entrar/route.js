import { conApi } from "../../lib/deps.js";
export const runtime = "nodejs";
export const POST = conApi((api, req) => api.entrar(req));
