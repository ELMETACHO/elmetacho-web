// claves.js — nombres de las claves de Redis de Instagram (spec 2026-10-25 §5). Todo lo de palabras clave va por cuenta.
export const COLA = "cabina:dm:links";            // lista de {link, recibido}
export const VISTOS = "cabina:dm:vistos";         // links que ya entraron alguna vez
export const ENTREGADOS = "cabina:dm:entregados"; // hash link → hora en que el PC confirmó
export const clave = (cuenta, ...partes) => ["ig", cuenta, ...partes].join(":");
