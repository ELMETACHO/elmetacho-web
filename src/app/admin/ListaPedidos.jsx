"use client";
import { useState } from "react";
import { textoDias } from "./lib/cabina.js";
import { EN_EL_PC, tonoEstado } from "./lib/pedido.js";

const ETIQUETA = {
  subiendo: () => "Sin enviar",
  listo: () => "Listo para las 5 a. m.",
  en_revision: () => "Esperando tu revisión",
  aprobado: () => "Aprobado: se edita en la franja de las 5 a. m.",
  necesita_pantallazos: (p) => (p.listos ? "Pantallazos recibidos: sale a las 5 a. m." : "No se pudieron leer los comentarios (TikTok o Instagram): sube pantallazos"),
  en_pc: () => "El PC lo está haciendo",
  fallido: (p) => `Falló: ${p.motivo || "sin detalle"}`,
};

const fecha = (iso) =>
  new Date(iso)
    .toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });

export default function ListaPedidos({ pedidos, cabina = [], error }) {
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
        <h1 className="adm-titulo">Cantados</h1>
        <button onClick={salir} className="adm-btn secundario chico">Salir</button>
      </div>
      <a href="/admin/cantados/nuevo" className="adm-btn primario grande">
        Nuevo video
      </a>
      {error && <p className="adm-error">{error}</p>}
      {msg && <p className="adm-error">{msg}</p>}
      {cabina.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="titulo-cabina">
          <h2 id="titulo-cabina" className="adm-h2">Cabina ({cabina.length})</h2>
          <ul className="flex flex-col gap-2">
            {cabina.map((c) => (
              <li key={c.id}>
                <a href={`/admin/cabina/${c.id}`} className="adm-tarjeta flex items-center gap-3 text-inherit no-underline">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.nombre}</p>
                    <p className="adm-sub text-xs">{c.comentarios} {c.comentarios === 1 ? "comentario" : "comentarios"}</p>
                  </div>
                  <span className={`adm-etq shrink-0 ${c.dias <= 1 ? "espera" : "camino"}`}>{textoDias(c.dias)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!error && pedidos.length === 0 && <p className="adm-sub text-center">No hay pedidos.</p>}
      <ul className="flex flex-col gap-3">
        {pedidos.map((p) => (
          <li key={p.id} className="adm-tarjeta flex flex-col gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {p.story && <span className="adm-etq camino mr-2">Story</span>}
                {p.nombre}
              </p>
              {/* El servidor y el navegador escriben "a. m." con espacios distintos: no es un error real. */}
              <p className="adm-sub text-xs" suppressHydrationWarning>{fecha(p.creado)}</p>
              <p className={`adm-etq mt-2 ${tonoEstado(p)}`}>{(ETIQUETA[p.estado] || (() => p.estado))(p)}</p>
            </div>
            <div className="flex flex-wrap gap-2 empty:hidden">
              {p.estado === "en_revision" && (
                <a href={`/admin/cantados/${p.id}/revisar`} className="adm-btn primario flex-1">
                  Revisar
                </a>
              )}
              {p.estado === "necesita_pantallazos" && !p.listos && (
                <a href={`/admin/cantados/${p.id}/pantallazos`} className="adm-btn primario flex-1">
                  Subir pantallazos
                </a>
              )}
              {!EN_EL_PC.includes(p.estado) && (
                <button onClick={() => cancelar(p.id)} className="adm-btn peligro">
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
