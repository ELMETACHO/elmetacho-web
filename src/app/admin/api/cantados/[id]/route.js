import { conApi } from "../../../lib/deps.js";
export const runtime = "nodejs";
export const PATCH = conApi((api, req, id) => api.cambiar(req, id));
export const DELETE = conApi((api, req, id) => api.cancelar(req, id));
