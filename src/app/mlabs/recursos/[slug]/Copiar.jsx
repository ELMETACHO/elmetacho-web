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
    <button type="button" onClick={copiar} className="rounded-full bg-[#E10600] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white active:scale-95">
      {ok ? "¡Copiado!" : "Copiar"}
    </button>
  );
}
