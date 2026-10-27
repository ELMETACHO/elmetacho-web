"use client";
import { useState } from "react";

export default function Rescatar({ link }) {
  const [estado, setEstado] = useState({ cargando: false, listo: false, error: "" });
  async function rescatar() {
    setEstado({ cargando: true, listo: false, error: "" });
    try {
      const res = await fetch("/admin/api/links/rescatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
      setEstado({ cargando: false, listo: true, error: "" });
    } catch (e) {
      setEstado({ cargando: false, listo: false, error: `No se pudo rescatar: ${e.message}` });
    }
  }
  if (estado.listo) return <span className="text-green-700">Rescatado ✓</span>;
  return (
    <span>
      <button type="button" onClick={rescatar} disabled={estado.cargando} className="rounded border px-2 py-0.5 text-xs font-bold disabled:opacity-50">
        {estado.cargando ? "Rescatando…" : "Rescatar"}
      </button>
      {estado.error && <span className="ml-2 text-red-600">{estado.error}</span>}
    </span>
  );
}
