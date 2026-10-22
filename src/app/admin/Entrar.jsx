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
    <form onSubmit={enviar} className="flex flex-col gap-3 pt-10">
      <h1 className="text-2xl font-bold">Admin</h1>
      <input
        type="password"
        value={clave}
        onChange={(e) => setClave(e.target.value)}
        placeholder="Clave"
        autoComplete="current-password"
        className="rounded border border-black/30 bg-white p-3 text-lg"
      />
      {error && <p className="text-[#E10600]">{error}</p>}
      <button disabled={cargando || !clave} className="rounded bg-[#E10600] p-4 text-lg font-bold text-white disabled:opacity-50">
        {cargando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
