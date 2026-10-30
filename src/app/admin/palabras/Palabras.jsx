"use client";
import { useEffect, useState } from "react";

const vacio = () => ({ palabra: "", respuesta_publica: "¡Enviado! Revisa tu DM 📩", mensaje_dm: "", link: "", pedir_seguir: false, activa: true });

const ERROR_CARGA = "No se pudo cargar (¿venció la sesión o falló el servidor?)";
const ERROR_GUARDAR = "No se pudo guardar (¿venció la sesión o falló el servidor?)";

export default function Palabras({ Titulo = "h1", api = "/admin/api/palabras", titulo = "Palabras clave · metacholabs", volver = { href: "/admin", texto: "← Admin" }, avisoPausa = "En pausa: el token no sirve o falta. Pega uno nuevo en Vercel (IG_TOKEN_LABS)." }) {
  const [lista, setLista] = useState(null);
  const [pausa, setPausa] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(api);
        const d = await r.json();
        if (!r.ok || d.error) return setMsg(d.error || ERROR_CARGA);
        setLista(d.disparadores);
        setPausa(d.pausa);
      } catch {
        setMsg(ERROR_CARGA);
      }
    })();
  }, []);
  const cambiar = (k, campo, valor) => { setMsg(""); setLista(lista.map((d, i) => (i === k ? { ...d, [campo]: valor } : d))); };
  async function guardar() {
    setMsg("Guardando…");
    try {
      const r = await fetch(api, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disparadores: lista }) });
      const d = await r.json();
      if (!r.ok) return setMsg(d.error || ERROR_GUARDAR);
      setLista(d.disparadores);
      setMsg("Guardado ✓");
    } catch {
      setMsg(ERROR_GUARDAR);
    }
  }
  if (!lista) return <p>{msg || "Cargando…"}</p>;
  return (
    <section>
      {volver && <a href={volver.href} className="text-sm underline">{volver.texto}</a>}
      <Titulo className="mt-2 text-2xl font-black">{titulo}</Titulo>
      {pausa && avisoPausa && <p className="mt-2 rounded bg-red-100 p-2 text-sm text-red-800">{avisoPausa}</p>}
      <p className="mt-1 text-sm opacity-70">Si un comentario contiene la palabra (sin importar mayúsculas ni tildes), se responde en público y le llega el DM con el link. La primera de la lista gana.</p>
      {lista.map((d, k) => (
        <div key={d.id || k} className="mt-4 space-y-2 rounded-lg border p-3 text-sm">
          <label className="block">Palabra <input className="w-full rounded border p-1" value={d.palabra} onChange={(e) => cambiar(k, "palabra", e.target.value)} /></label>
          <label className="block">Respuesta en el comentario <input className="w-full rounded border p-1" value={d.respuesta_publica} onChange={(e) => cambiar(k, "respuesta_publica", e.target.value)} /></label>
          <label className="block">Mensaje del DM <textarea className="w-full rounded border p-1" rows={3} value={d.mensaje_dm} onChange={(e) => cambiar(k, "mensaje_dm", e.target.value)} /></label>
          <label className="block">Link <input className="w-full rounded border p-1" value={d.link} onChange={(e) => cambiar(k, "link", e.target.value)} /></label>
          <label className="mr-4"><input type="checkbox" checked={d.pedir_seguir} onChange={(e) => cambiar(k, "pedir_seguir", e.target.checked)} /> Pedir que me siga</label>
          <label className="mr-4"><input type="checkbox" checked={d.activa} onChange={(e) => cambiar(k, "activa", e.target.checked)} /> Activa</label>
          <button className="text-red-700 underline" onClick={() => { setMsg(""); setLista(lista.filter((_, i) => i !== k)); }}>Quitar</button>
        </div>
      ))}
      <div className="mt-4 flex gap-3">
        <button className="rounded border px-3 py-1" onClick={() => { setMsg(""); setLista([...lista, vacio()]); }}>+ Palabra</button>
        <button className="rounded bg-black px-3 py-1 text-white" onClick={guardar}>Guardar</button>
      </div>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </section>
  );
}
