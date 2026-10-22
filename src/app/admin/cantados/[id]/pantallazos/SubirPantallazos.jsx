"use client";
import { useRef, useState } from "react";
import Barra from "../../Barra.jsx";
import ListaPantallazos from "../../ListaPantallazos.jsx";
import { encolarPatch, esperarGuardado } from "../../cola.js";
import { subirArchivo, usePantallazos, useTrabajos } from "../../subidas.js";

export default function SubirPantallazos({ id, nombre, motivo, remix = false }) {
  const { trabajos, fijarTrabajo, conOcupado, subiendo } = useTrabajos();
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const cola = useRef(Promise.resolve());
  const ultimo = useRef(null);

  // Cada guardado lleva la lista completa: se registra el último para decidir el envío por su resultado.
  const patch = (cuerpo) => {
    const p = encolarPatch(cola, `/admin/api/cantados/${id}`, cuerpo);
    ultimo.current = p.then(() => ({ ok: true }), (e) => ({ ok: false, error: e }));
    return p;
  };
  const { pants, elegir, moverPant, quitarPant } = usePantallazos({
    listoParaElegir: () => true,
    subir: (clave, file, nombreArchivo) => subirArchivo(id, clave, file, nombreArchivo, fijarTrabajo),
    patch,
    conOcupado,
    alError: setError,
    alLimpiar: () => setError(""),
  });

  async function enviar() {
    setEnviando(true);
    setError("");
    try {
      const g = await esperarGuardado(ultimo);
      if (!g.ok) throw new Error(g.error?.message || "No se pudo guardar.");
      const r = await fetch(`/admin/api/cantados/${id}/enviar`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo enviar.");
      setListo(true);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  if (listo)
    return (
      <div className="adm-tarjeta mt-10 flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-xl font-bold text-[var(--verde)]">
          {remix ? "Listo: el remix sale a las 2 p. m. con estos pantallazos." : "Listo: sale a las 2 p. m. como pedido con pantallazos."}
        </p>
        <a href="/admin" className="adm-btn secundario">Volver a la lista</a>
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="adm-titulo">Pantallazos</h1>
        <a href="/admin" className="adm-btn secundario chico">Volver</a>
      </div>
      <p className="adm-aviso">
        {nombre}: {motivo || "TikTok no dejó leer los comentarios"}.{" "}
        {remix
          ? "Sube pantallazos de los comentarios que salen en tu video publicado, en el mismo orden en que aparecen en el video. El PC los usa para armar el remix y luego los reordena."
          : "Sube los pantallazos en el orden que quieres; el video, el bucle y el gancho ya los tiene el PC."}
      </p>
      {error && <p className="adm-error">{error}</p>}
      <div className="adm-tarjeta">
        <input type="file" accept="image/*" multiple onChange={elegir} />
      </div>
      {Object.entries(trabajos).map(([k, t]) => (
        <Barra key={k} t={t} />
      ))}
      <ListaPantallazos pants={pants} onMover={moverPant} onQuitar={quitarPant} />
      <button className="adm-btn primario grande"
        disabled={subiendo || enviando || pants.length === 0} onClick={enviar}>
        {enviando ? "Enviando…" : subiendo ? "Subiendo…" : "Enviar pantallazos"}
      </button>
    </div>
  );
}
