// servidor.js — piezas compartidas por las rutas de AHORRA (/api/ahorra/*).
import { leerSesion, COOKIE } from "./creditos.js";

export const secreto = () => process.env.MLABS_AHORRA_SECRETO || process.env.MLABS_SESION_SECRETO || "";
export const ipDe = (req) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sin-ip";
export const leerCookie = (req, nombre) =>
  (req.headers.get("cookie") || "").split(";").map((s) => s.trim()).find((s) => s.startsWith(`${nombre}=`))?.slice(nombre.length + 1) ?? null;
export const sesionDe = (req) => leerSesion(decodeURIComponent(leerCookie(req, COOKIE) ?? ""), secreto());
export const json = (d, status = 200, headers = {}) => Response.json(d, { status, headers });
