// claves.js — nombres de las claves de Redis de Instagram (spec 2026-10-25 §5). Todo lo de palabras clave va por cuenta.
export const COLA = "cabina:dm:links";            // lista de {link, recibido}
export const VISTOS = "cabina:dm:vistos";         // links que ya entraron alguna vez
export const ENTREGADOS = "cabina:dm:entregados"; // hash link → hora en que el PC confirmó
export const clave = (cuenta, ...partes) => ["ig", cuenta, ...partes].join(":");
// Filtro de links (spec cantados 2026-10-26 §5).
export const REMITENTES = (link) => `cabina:dm:remitentes:${link}`; // set de huellas (16 hex) de quién lo mandó, EX 3 días
export const FORZAR = "cabina:dm:forzar";                           // hash link → hora: pase directo o «Rescatar»
export const RESULTADOS = "cabina:links:resultados";                // lista de JSON {link, origen, estado, nivel, motivo, nota?, fecha}
export const CONTEO = (fecha) => `cabina:links:conteo:${fecha}`;    // hash "<nivel>:<motivo corto>" → cuántos, EX 3 días
export const PASE = (link) => `cabina:dm:pase:${link}`;            // marca NX: el pase directo ya se dio en esta ventana, EX 3 días
export const TRES_DIAS_S = 259200;
