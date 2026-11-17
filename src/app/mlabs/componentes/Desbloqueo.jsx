"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MLABS_WHATSAPP } from "../enlaces.js";
import { enviarLead } from "../lib/enviarLead.js";
import {
  almacenSeguro, estaDesbloqueado, marcarDesbloqueado, trasFallo, guardarPendiente, tomarPendiente,
} from "../lib/desbloqueo.js";

const suscribir = (cb) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

// Formulario de correo + secciones bloqueadas de una guía. Las secciones siempre están en el HTML;
// solo se ocultan con la clase .contenido-bloqueado hasta que la persona deja su correo.
export default function Desbloqueo({
  slug,
  origen = `guia-${slug}`,
  titulo = "Desbloquea la guía completa",
  texto = "Déjanos tu correo y la ves completa ahora mismo, gratis.",
  boton = "Ver la guía completa",
  children,
}) {
  const guardado = useSyncExternalStore(suscribir, () => estaDesbloqueado(almacenSeguro()), () => false);
  const [recien, setRecien] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [estado, setEstado] = useState("listo"); // listo | enviando | error
  const [error, setError] = useState("");
  const libre = guardado || recien;

  // Si en una visita anterior el lead no se pudo guardar, se reintenta en silencio.
  useEffect(() => {
    const pendiente = tomarPendiente(almacenSeguro());
    if (pendiente) enviarLead(pendiente).catch(() => guardarPendiente(almacenSeguro(), pendiente));
  }, []);

  const abrir = () => {
    marcarDesbloqueado(almacenSeguro());
    setRecien(true);
  };

  const enviar = async (ev) => {
    ev.preventDefault();
    const datos = { ...Object.fromEntries(new FormData(ev.currentTarget)), origen };
    setEstado("enviando");
    setError("");
    try {
      await enviarLead(datos);
      abrir();
    } catch (e) {
      const n = fallos + 1;
      setFallos(n);
      if (trasFallo(n) === "desbloquear") {
        guardarPendiente(almacenSeguro(), datos);
        abrir();
      } else {
        setError(e.message);
        setEstado("error");
      }
    }
  };

  return (
    <>
      {!libre && (
        <form onSubmit={enviar} className="formulario-desbloqueo m-candado">
          <p>{titulo}</p>
          <p>{texto}</p>
          <label>
            <span>Nombre</span>
            <input name="nombre" required autoComplete="name" />
          </label>
          <label>
            <span>Correo</span>
            <input name="correo" required type="email" autoComplete="email" inputMode="email" placeholder="tu@correo.com" />
          </label>
          <label>
            <span>WhatsApp (opcional)</span>
            <input name="telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="+57 300 000 0000" />
          </label>
          <input name="empresa_web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <label className="m-acepto">
            <input type="checkbox" name="acepta" required />
            <span>
              Acepto que EL METACHO S.A.S. me contacte y trate mis datos según la{" "}
              <a href="https://www.elmetacho.com/privacidad">política de privacidad</a>.
            </span>
          </label>
          {estado === "error" && (
            <p role="alert">
              {error} Intenta de nuevo o escríbenos por <a href={MLABS_WHATSAPP}>WhatsApp</a>.
            </p>
          )}
          <button type="submit" disabled={estado === "enviando"} className="m-boton m-boton-primario m-boton-ancho">
            {estado === "enviando" ? "Abriendo…" : boton}
          </button>
        </form>
      )}
      <div className={libre ? "" : "contenido-bloqueado"}>
        <div className="m-cuerpo">{children}</div>
      </div>
    </>
  );
}
