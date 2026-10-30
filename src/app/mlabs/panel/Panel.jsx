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
  return (
    <section>
      <h1 className="text-2xl font-black">@{e.usuario}</h1>
      <p className="mt-1 text-sm">Estado: {e.estado}</p>
      <div className="mt-6">
        <Palabras api="/api/mlabs/palabras" titulo="Tus palabras clave" volver={null} avisoPausa="" />
      </div>
    </section>
  );
}
