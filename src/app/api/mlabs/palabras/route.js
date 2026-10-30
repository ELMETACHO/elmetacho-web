// src/app/api/mlabs/palabras/route.js — palabras clave de la marca de la sesión (spec 2026-10-26 §3).
// PUT reemplaza la lista completa, con la misma validación que /admin/api/palabras.
import { randomUUID } from "node:crypto";
import { conRedis } from "../../../admin/lib/instagram/conexion.js";
import { guardarDisparadores, leerDisparadores, validarDisparadores } from "../../../admin/lib/instagram/palabras.js";
import { leerMarca } from "../../../mlabs/lib/automatizar/marcas.js";
import { cuentaDeReq, mismoOrigen } from "../../../mlabs/lib/automatizar/sesion.js";

export const runtime = "nodejs";
const NO = () => Response.json({ error: "Inicia sesión otra vez." }, { status: 401 });
// Tras desconectar o borrar, una sesión viva no puede recrear datos: se exige la ficha (la casa no tiene ficha).
const sinFicha = async (r, cuenta) => cuenta !== process.env.IG_CUENTA_PALABRAS && !(await leerMarca(r, cuenta));

export async function GET(req) {
  const cuenta = cuentaDeReq(req, process.env, Date.now());
  if (!cuenta) return NO();
  const d = await conRedis(async (r) => ((await sinFicha(r, cuenta)) ? null : leerDisparadores(r, cuenta)));
  return d ? Response.json({ disparadores: d, pausa: false }) : NO();
}

export async function PUT(req) {
  const cuenta = cuentaDeReq(req, process.env, Date.now());
  if (!cuenta) return NO();
  if (!mismoOrigen(req)) return Response.json({ error: "Origen no permitido." }, { status: 403 });
  let c = {};
  try { c = await req.json(); } catch { /* se valida abajo */ }
  const { disparadores, errores } = validarDisparadores(c?.disparadores, () => randomUUID().slice(0, 8));
  if (errores.length) return Response.json({ error: errores.join(" ") }, { status: 400 });
  const guardado = await conRedis(async (r) => {
    if (await sinFicha(r, cuenta)) return false;
    await guardarDisparadores(r, cuenta, disparadores);
    return true;
  });
  return guardado ? Response.json({ disparadores }) : NO();
}
