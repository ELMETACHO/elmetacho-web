"use client";
import { useState } from "react";

export default function Entrar() {
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const r = await fetch("/admin/api/entrar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clave }),
      });
      if (r.ok) return location.reload();
      const d = await r.json().catch(() => ({}));
      setError(d.error || "No se pudo entrar.");
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    }
    setCargando(false);
  }

  return (
    <form onSubmit={enviar} className="adm-tarjeta mt-10 flex flex-col gap-3 p-5">
      <h1 className="adm-titulo">Admin</h1>
      <input
        type="password"
        value={clave}
        onChange={(e) => setClave(e.target.value)}
        placeholder="Clave"
        autoComplete="current-password"
        className="adm-campo text-lg"
      />
      {error && <p className="adm-error">{error}</p>}
      <button disabled={cargando || !clave} className="adm-btn primario grande">
        {cargando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
