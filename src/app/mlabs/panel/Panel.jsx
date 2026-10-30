"use client";
// Panel.jsx — estado de la cuenta (se amplía en las Tareas 8, 10 y 11).
import { useEffect, useState } from "react";
import Palabras from "../../admin/palabras/Palabras.jsx";

export default function Panel() {
  const [e, setE] = useState(null);
  const [msg, setMsg] = useState("Cargando…");
  useEffect(() => {
    fetch("/api/mlabs/estado").then(async (r) => { const d = await r.json(); if (!r.ok) return setMsg(d.error); setE(d); }).catch(() => setMsg("No se pudo cargar."));
  }, []);
  if (!e) return <p>{msg}</p>;
  const dia = (ms) => new Date(ms).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  const s = e.suscripcion;
  async function enviar(ruta, cuerpo) {
    setMsg("…");
    try {
      const r = await fetch(ruta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo ?? {}) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(d.error || "No se pudo.");
      if (d.ir) window.location.href = d.ir; else window.location.reload();
    } catch {
      setMsg("No se pudo conectar. Revisa tu internet e intenta otra vez.");
    }
  }
  return (
    <section>
      <h1 className="text-2xl font-black">@{e.usuario}</h1>
      <p className="mt-1 text-sm">Estado: {e.estado}</p>
      {e.reconectar && <p className="mt-2 rounded bg-red-100 p-2 text-sm text-red-800">Instagram ya no nos deja responder por ti. <a className="font-bold underline" href="/api/mlabs/instagram/entrar">Vuelve a conectar Instagram</a>.</p>}
      {!e.casa && (e.estado === "sin_pago" || e.estado === "cancelada") && (
        <form className="mt-4 space-y-2 rounded-lg border p-3 text-sm" onSubmit={(ev) => { ev.preventDefault(); const f = new FormData(ev.currentTarget); enviar("/api/mlabs/activar", { correo: f.get("correo"), codigo: f.get("codigo") }); }}>
          <p className="font-bold">{e.uso_gratis ? "Activa tu automatización: mensualidad con Mercado Pago; el cobro empieza hoy (ya usaste tus 7 días gratis)." : "Activa tu automatización: 7 días gratis, luego mensualidad con Mercado Pago."}</p>
          <label className="block">Tu correo <input name="correo" type="email" className="w-full rounded border p-1" /></label>
          <details><summary className="cursor-pointer opacity-70">Tengo un código de acceso</summary><input name="codigo" className="mt-1 w-full rounded border p-1" /></details>
          <button className="rounded bg-black px-3 py-1 text-white">Activar</button>
        </form>
      )}
      {!e.casa && e.estado !== "sin_pago" && e.estado !== "cancelada" && (
        <div className="mt-4 rounded-lg border p-3 text-sm">
          {e.estado === "pago_fallido" && <p className="text-red-800">Tu último pago no pasó. Mercado Pago lo reintentará; revisa tu tarjeta.</p>}
          {s?.fin_servicio ? <p>Cancelada: funciona hasta el {dia(s.fin_servicio)}.</p>
            : s?.fin_gratis && Date.now() < s.fin_gratis ? <p>Gratis hasta el {dia(s.fin_gratis)}.</p>
            : s?.proximo_cobro ? <p>Próximo cobro: {dia(s.proximo_cobro)}.</p> : <p>Activa.</p>}
          {s?.id_mp && !s.fin_servicio && <button className="mt-2 text-red-700 underline" onClick={() => confirm("¿Cancelar tu suscripción?") && enviar("/api/mlabs/cancelar")}>Cancelar suscripción</button>}
        </div>
      )}
      {msg !== "Cargando…" && msg && <p className="mt-2 text-sm">{msg}</p>}
      <div className="mt-6">
        <Palabras api="/api/mlabs/palabras" titulo="Tus palabras clave" volver={null} avisoPausa="" />
      </div>
    </section>
  );
}
