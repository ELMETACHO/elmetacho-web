import { conApi } from "../../lib/deps.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = conApi((api, req) => api.catalogo(req));
