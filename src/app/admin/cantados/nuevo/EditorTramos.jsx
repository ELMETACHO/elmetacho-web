"use client";
import { useState } from "react";
import { ajustar, marcar } from "../../lib/editor.js";
import { MAX_TRAMOS, avisoLargo, totalContexto, validarTramos } from "../../lib/tramos.js";

const boton = "rounded bg-[#E10600] px-3 py-3 font-bold text-white disabled:opacity-40";
const fmt = (n) => String(n).replace(".", ",");

export default function EditorTramos({ duracion, tramos, onCambio, videoRef }) {
  const [pendiente, setPendiente] = useState(null);
  const [sel, setSel] = useState({ i: 0, extremo: "inicio" });
  const [error, setError] = useState("");

  // Aplica un cambio: si es válido lo informa al padre (que lo guarda); si no, muestra el error.
  function aplicar(nuevos) {
    if (nuevos.length === 0) {
      setError("");
      return onCambio([]);
    }
    const r = validarTramos(nuevos, duracion);
    if (r.errores.length) return setError(r.errores.join(" "));
    setError("");
    onCambio(r.tramos);
  }

  function marcarInicio() {
    const v = videoRef.current;
    if (!v) return;
    if (tramos.length >= MAX_TRAMOS) return setError(`Son máximo ${MAX_TRAMOS} tramos.`);
    setError("");
    setPendiente(marcar(tramos, null, v.currentTime).pendiente);
  }

  function marcarFin() {
    const v = videoRef.current;
    if (!v || pendiente === null) return;
    const r = marcar(tramos, pendiente, v.currentTime);
    setPendiente(null);
    if (r.tramos === tramos) return setError("El fin debe ir después del inicio.");
    aplicar(r.tramos);
  }

  function reproducir(a, z) {
    const v = videoRef.current;
    if (!v) return;
    const parar = () => {
      if (v.currentTime >= z) {
        v.pause();
        v.removeEventListener("timeupdate", parar);
      }
    };
    v.addEventListener("timeupdate", parar);
    v.currentTime = a;
    v.play().catch(() => {});
  }

  const i = Math.min(sel.i, Math.max(0, tramos.length - 1));
  const mueve = (delta) => aplicar(ajustar(tramos, i, sel.extremo, delta, duracion));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-4 rounded bg-black/15">
        {tramos.map(([a, z], k) => (
          <div
            key={k}
            className="absolute top-0 h-4 rounded bg-[#E10600]"
            style={{ left: `${(a / duracion) * 100}%`, width: `${((z - a) / duracion) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className={boton} onClick={marcarInicio}>
          Marca inicio{pendiente !== null ? ` (${fmt(pendiente)} s)` : ""}
        </button>
        <button className={boton} onClick={marcarFin} disabled={pendiente === null}>
          Marca fin
        </button>
      </div>

      {tramos.map(([a, z], k) => (
        <div
          key={k}
          className={`flex items-center gap-2 rounded border p-2 ${k === i ? "border-[#E10600] bg-white" : "border-black/20"}`}
        >
          <button className="flex-1 text-left" onClick={() => setSel({ ...sel, i: k })}>
            Tramo {k + 1}: {fmt(a)} – {fmt(z)} s
          </button>
          <button aria-label="Reproducir tramo" className="px-2 py-2 text-xl" onClick={() => reproducir(a, z)}>
            ▶
          </button>
          <button
            aria-label="Borrar tramo"
            className="px-2 py-2 text-xl"
            onClick={() => aplicar(tramos.filter((_, j) => j !== k))}
          >
            🗑
          </button>
        </div>
      ))}

      {tramos.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {["inicio", "fin"].map((e) => (
              <button
                key={e}
                onClick={() => setSel({ ...sel, i, extremo: e })}
                className={`rounded border-2 p-2 ${sel.extremo === e ? "border-[#E10600] font-bold" : "border-black/20"}`}
              >
                Ajustar {e}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[-1, -0.1, 0.1, 1].map((dl) => (
              <button key={dl} className={boton} onClick={() => mueve(dl)}>
                {dl > 0 ? "+" : "−"}
                {fmt(Math.abs(dl))}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="font-semibold">Contexto: {fmt(totalContexto(tramos))} s</p>
      {avisoLargo(tramos) && (
        <p className="rounded bg-yellow-200 p-2">Más de 25 s: más riesgo de reclamo por contenido reutilizado</p>
      )}
      {error && <p className="text-[#E10600]">{error}</p>}
    </div>
  );
}
