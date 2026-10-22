"use client";
import { useState } from "react";

const ETIQUETA = {
  subiendo: () => "Sin enviar",
  listo: () => "Listo para las 2 p. m.",
  en_pc: () => "El PC lo está haciendo",
  fallido: (p) => `Falló: ${p.motivo || "sin detalle"}`,
};

export default function ListaPedidos({ pedidos, error }) {
  const [msg, setMsg] = useState("");

  async function cancelar(id) {
    if (!confirm("¿Cancelar este pedido?")) return;
    try {
      const r = await fetch(`/admin/api/cantados/${id}`, { method: "DELETE" });
      if (r.ok) return location.reload();
      const d = await r.json().catch(() => ({}));
      setMsg(d.error || "No se pudo cancelar.");
    } catch {
      setMsg("Sin conexión.");
    }
  }
  async function salir() {
    await fetch("/admin/api/salir", { method: "POST" }).catch(() => {});
    location.reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cantados</h1>
        <button onClick={salir} className="text-sm underline">Salir</button>
      </div>
      <a href="/admin/cantados/nuevo" className="rounded bg-[#E10600] p-4 text-center text-lg font-bold text-white">
        Nuevo video
      </a>
      {error && <p className="text-[#E10600]">{error}</p>}
      {msg && <p className="text-[#E10600]">{msg}</p>}
      {!error && pedidos.length === 0 && <p className="text-black/60">No hay pedidos.</p>}
      <ul className="flex flex-col gap-2">
        {pedidos.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 rounded border border-black/20 bg-white p-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{p.nombre}</p>
              <p className="text-sm text-black/70">{(ETIQUETA[p.estado] || (() => p.estado))(p)}</p>
            </div>
            {p.estado !== "en_pc" && (
              <button onClick={() => cancelar(p.id)} className="shrink-0 rounded border border-[#E10600] px-3 py-2 text-[#E10600]">
                Cancelar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
