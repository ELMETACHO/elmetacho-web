"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MLABS_WHATSAPP } from "../MlabsMarco";
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
export default function Desbloqueo({ slug, children }) {
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
    const datos = { ...Object.fromEntries(new FormData(ev.currentTarget)), origen: `guia-${slug}` };
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

  const campo = "w-full rounded-2xl border border-black/15 bg-white px-4 py-4 text-base outline-none focus:border-rojo focus:ring-2 focus:ring-rojo/20";
  return (
    <>
      {!libre && (
        <form onSubmit={enviar} className="formulario-desbloqueo mt-10 space-y-3 rounded-[1.75rem] border-2 border-black p-5 sm:p-8">
          <p className="text-2xl font-black">Desbloquea la guía completa</p>
          <p className="leading-7 text-gris">Déjanos tu correo y la ves completa ahora mismo, gratis.</p>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Nombre</span>
            <input name="nombre" required autoComplete="name" className={campo} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Correo</span>
            <input name="correo" required type="email" autoComplete="email" inputMode="email" className={campo} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">WhatsApp (opcional)</span>
            <input name="telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="+57 300 000 0000" className={campo} />
          </label>
          <input name="empresa_web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <label className="flex gap-3 text-sm leading-5 text-gris">
            <input type="checkbox" name="acepta" required className="mt-0.5 h-5 w-5 shrink-0 accent-rojo" />
            <span>
              Acepto que EL METACHO S.A.S. me contacte y trate mis datos según la{" "}
              <a href="https://www.elmetacho.com/privacidad" className="underline">política de privacidad</a>.
            </span>
          </label>
          {estado === "error" && (
            <p className="rounded-2xl bg-rojo/10 p-3 text-sm text-rojo" role="alert">
              {error} Intenta de nuevo o escríbenos por{" "}
              <a href={MLABS_WHATSAPP} className="font-bold underline">WhatsApp</a>.
            </p>
          )}
          <button type="submit" disabled={estado === "enviando"} className="w-full rounded-full bg-rojo px-6 py-4 text-base font-bold text-white disabled:opacity-60">
            {estado === "enviando" ? "Abriendo…" : "Ver la guía completa"}
          </button>
        </form>
      )}
      <div className={libre ? "mt-10 space-y-10" : "contenido-bloqueado mt-10 space-y-10"}>{children}</div>
    </>
  );
}
