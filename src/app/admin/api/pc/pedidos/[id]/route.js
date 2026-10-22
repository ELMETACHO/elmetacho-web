import { conApi } from "../../../../lib/deps.js";
export const runtime = "nodejs";
export const DELETE = conApi((api, req, id) => api.pcEntregado(req, id));
