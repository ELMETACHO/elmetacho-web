import { conApi } from "../../../../lib/deps.js";
export const runtime = "nodejs";
export const PATCH = conApi((api, req, id) => api.revision(req, id));
