// intentos.js — 5 claves malas por IP bloquean 15 min (contador en Redis con vencimiento).
export const MAX_INTENTOS = 5;
export const BLOQUEO_S = 900;
const clave = (ip) => `admin:intentos:${ip}`;
export const estaBloqueado = async (almacen, ip) => (await almacen.contador(clave(ip))) >= MAX_INTENTOS;
export const registrarFallo = (almacen, ip) => almacen.sumar(clave(ip), BLOQUEO_S);
export const limpiarIntentos = (almacen, ip) => almacen.borrarClave(clave(ip));
