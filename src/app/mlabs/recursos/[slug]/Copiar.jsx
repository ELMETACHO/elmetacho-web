"use client";

import { useState } from "react";

export default function Copiar({ texto }) {
  const [ok, setOk] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setOk(true);
      setTimeout(() => setOk(false), 1800);
    } catch {}
  };
  return (
    <button type="button" onClick={copiar} className="m-boton m-boton-primario" style={{ minHeight: 34, padding: "0 14px", fontSize: 14 }}>
      {ok ? "¡Copiado!" : "Copiar"}
    </button>
  );
}
