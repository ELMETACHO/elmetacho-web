"use client";
import { useState } from "react";
import { EN_EL_PC } from "./lib/pedido.js";

const ETIQUETA = {
  subiendo: () => "Sin enviar",
  listo: () => "Listo para las 2 p. m.",
  en_revision: () => "Esperando tu revisión",
  aprobado: () => "Aprobado: se edita en la franja de las 2 p. m.",
  necesita_pantallazos: (p) => (p.listos ? "Pantallazos recibidos: sale a las 2 p. m." : "TikTok no dejó leer los comentarios: sube pantallazos"),
  en_pc: () => "El PC lo está haciendo",
  fallido: (p) => `Falló: ${p.motivo || "sin detalle"}`,
};

const fecha = (iso) =>
  new Date(iso)
    .toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });

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
        <button onClick={salir} className="min-h-[44px] min-w-[44px] px-3 text-sm underline">Salir</button>
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
              <p className="text-xs text-black/60">{fecha(p.creado)}</p>
              <p className="text-sm text-black/70">{(ETIQUETA[p.estado] || (() => p.estado))(p)}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              {p.estado === "en_revision" && (
                <a href={`/admin/cantados/${p.id}/revisar`} className="min-h-[44px] rounded bg-[#E10600] px-3 py-2 text-center font-bold text-white">
                  Revisar
                </a>
              )}
              {p.estado === "necesita_pantallazos" && !p.listos && (
                <a href={`/admin/cantados/${p.id}/pantallazos`} className="min-h-[44px] rounded bg-[#E10600] px-3 py-2 text-center font-bold text-white">
                  Subir pantallazos
                </a>
              )}
              {!EN_EL_PC.includes(p.estado) && (
                <button onClick={() => cancelar(p.id)} className="min-h-[44px] rounded border border-[#E10600] px-3 py-2 text-[#E10600]">
                  Cancelar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
