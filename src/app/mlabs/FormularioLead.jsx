"use client";

import { useState } from "react";
import { MLABS_WHATSAPP } from "./enlaces.js";
import { enviarLead } from "./lib/enviarLead.js";

// Formulario de contacto de MLABS: guarda el lead en nuestra base de datos (/api/lead) y avisa por Telegram.
// origen = de dónde vino (inicio, guía de RESEÑA, etc.) para saber qué convierte.
export default function FormularioLead({
  origen = "mlabs",
  boton = "Enviar",
  pedirMensaje = true,
  mensajeOk = "Te escribimos por WhatsApp en menos de un día hábil. Si es urgente, escríbenos tú ahora.",
}) {
  const [estado, setEstado] = useState("listo"); // listo | enviando | ok | error
  const [error, setError] = useState("");

  const enviar = async (ev) => {
    ev.preventDefault();
    const datos = Object.fromEntries(new FormData(ev.currentTarget));
    setEstado("enviando");
    setError("");
    try {
      await enviarLead({ ...datos, origen });
      setEstado("ok");
    } catch (e) {
      setError(e.message);
      setEstado("error");
    }
  };

  if (estado === "ok")
    return (
      <div className="rounded-[1.5rem] bg-black p-6 text-white sm:p-8" role="status">
        <p className="text-2xl font-black">Recibido.</p>
        <p className="mt-2 leading-7 text-white/80">{mensajeOk}</p>
        <a href={MLABS_WHATSAPP} className="mt-5 inline-block rounded-full bg-rojo px-6 py-3 font-bold">
          Abrir WhatsApp
        </a>
      </div>
    );

  const campo = "w-full rounded-2xl border border-black/15 bg-white px-4 py-4 text-base outline-none transition focus:border-rojo focus:ring-2 focus:ring-rojo/20";
  return (
    <form onSubmit={enviar} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Nombre</span>
        <input name="nombre" required autoComplete="name" className={campo} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">WhatsApp (con indicativo)</span>
        <input name="telefono" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+57 300 000 0000" className={campo} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Correo</span>
        <input name="correo" type="email" autoComplete="email" className={campo} />
      </label>
      {pedirMensaje && (
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">¿Qué vendes y qué te quita más tiempo?</span>
          <textarea name="mensaje" rows={3} className={campo} />
        </label>
      )}
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
          {error} Escríbenos directo por{" "}
          <a href={MLABS_WHATSAPP} className="font-bold underline">WhatsApp</a>.
        </p>
      )}
      <button type="submit" disabled={estado === "enviando"} className="w-full rounded-full bg-rojo px-6 py-4 text-base font-bold text-white disabled:opacity-60">
        {estado === "enviando" ? "Enviando…" : boton}
      </button>
    </form>
  );
}
