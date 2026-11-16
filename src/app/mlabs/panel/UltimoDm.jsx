"use client";
// UltimoDm.jsx — el último DM que MLABS envió por la marca, al momento: se consulta cada 4 s mientras la página está a
// la vista. Muestra el envío dentro de la app (lo pidió el revisor de Meta en la revisión de nov. 2026).
import { useEffect, useState } from "react";
import { hace } from "./hace.js";

const TIPO = { comentario: "respuesta privada al comentario (private reply to the comment)", mensaje: "respuesta al mensaje (reply to the message)" };

export default function UltimoDm() {
  const [u, setU] = useState(null);
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    let vivo = true;
    const leer = () => {
      if (document.hidden) return;
      fetch("/api/mlabs/ultimo-dm", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (vivo && d) setU(d.ultimo); }).catch(() => {});
    };
    leer();
    const t = setInterval(leer, 4000);
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => { vivo = false; clearInterval(t); clearInterval(reloj); };
  }, []);
  return (
    <div className="mt-6 rounded-lg border p-3 text-sm">
      <h2 className="font-bold">Último DM enviado por MLABS <span className="font-normal opacity-60">(Last DM sent by MLABS)</span></h2>
      {!u ? (
        <p className="mt-1 opacity-70">Todavía no se ha enviado ninguno. (No DM sent yet.)</p>
      ) : (
        <>
          <p className="mt-1"><b>{hace(ahora - u.hora)}</b> · palabra «{u.palabra}» · {TIPO[u.tipo] ?? u.tipo}</p>
          <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-gray-100 p-2">{u.texto}</p>
          <p className="mt-1 text-xs opacity-60">Enviado con la API de Instagram: POST /{"{ig-id}"}/messages. (Sent with the Instagram API.)</p>
        </>
      )}
    </div>
  );
}
