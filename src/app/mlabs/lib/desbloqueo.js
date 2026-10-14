// Desbloqueo de guías por correo. Se recuerda en el navegador (localStorage) para no pedir el correo en cada guía.
// Si el navegador no deja guardar (modo privado, navegador de Instagram), todo sigue funcionando: solo no se recuerda.
export const CLAVE_DESBLOQUEO = "mlabs:desbloqueado";
export const CLAVE_PENDIENTE = "mlabs:lead-pendiente";

export function almacenSeguro() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function estaDesbloqueado(almacen) {
  try {
    return almacen?.getItem(CLAVE_DESBLOQUEO) === "1";
  } catch {
    return false;
  }
}

export function marcarDesbloqueado(almacen) {
  try {
    almacen?.setItem(CLAVE_DESBLOQUEO, "1");
  } catch {}
}

// Si /api/lead falla: la primera vez se muestra el error (no se desbloquea, para no perder el correo).
// Desde la segunda, se desbloquea igual y el lead queda pendiente para reintentarlo en la próxima visita.
export const trasFallo = (fallos) => (fallos >= 2 ? "desbloquear" : "mostrar-error");

export function guardarPendiente(almacen, datos) {
  try {
    almacen?.setItem(CLAVE_PENDIENTE, JSON.stringify(datos));
  } catch {}
}

export function tomarPendiente(almacen) {
  try {
    const v = almacen?.getItem(CLAVE_PENDIENTE);
    if (!v) return null;
    almacen.removeItem(CLAVE_PENDIENTE);
    return JSON.parse(v);
  } catch {
    return null;
  }
}

// Script en línea que corre antes de pintar: si ya desbloqueó, muestra el contenido sin parpadeo del formulario (CLS 0).
export const ESTILO_DESBLOQUEADO = `try{if(localStorage.getItem("${CLAVE_DESBLOQUEO}")==="1"){var s=document.createElement("style");s.textContent=".contenido-bloqueado{display:block!important}.formulario-desbloqueo{display:none!important}";document.head.appendChild(s)}}catch(e){}`;
