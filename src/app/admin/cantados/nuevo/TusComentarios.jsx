"use client";
import { useState } from "react";
import { MAX_PROPIOS_PEDIDO, MAX_TEXTO_PROPIO_PEDIDO } from "../../lib/pedido.js";

// Comentarios que Oscar escribe (con pantallazos y versionar): salen con nombres y fotos al azar.
export default function TusComentarios({ propios, onCambio, deshabilitado, ayuda }) {
  const [texto, setTexto] = useState("");
  const lleno = propios.length >= MAX_PROPIOS_PEDIDO;

  function agregar() {
    const t = texto.trim();
    if (!t || deshabilitado || lleno) return;
    setTexto("");
    onCambio([...propios, t.slice(0, MAX_TEXTO_PROPIO_PEDIDO)]);
  }

  return (
    <>
      <p className="adm-sub text-sm">{ayuda}</p>
      <textarea
        value={texto}
        rows={2}
        maxLength={MAX_TEXTO_PROPIO_PEDIDO}
        className="adm-campo"
        placeholder="Escribe un comentario"
        aria-label="Escribe un comentario"
        disabled={deshabilitado || lleno}
        onChange={(e) => setTexto(e.target.value)}
      />
      <button className="adm-btn secundario" onClick={agregar} disabled={deshabilitado || !texto.trim() || lleno}>
        Agregar comentario
      </button>
      {lleno && <p className="adm-sub text-sm">Ya agregaste {MAX_PROPIOS_PEDIDO} comentarios tuyos.</p>}
      {propios.length > 0 && (
        <ol className="flex flex-col gap-2">
          {propios.map((t, i) => (
            <li key={`${i}-${t}`} className="adm-tarjeta flex items-start justify-between gap-2 p-3">
              <span className="text-sm">
                <span className="adm-etq neutro mr-2">Tuyo</span>
                {t}
              </span>
              <button className="adm-btn secundario chico" aria-label={`Quitar «${t}»`} onClick={() => onCambio(propios.filter((_, j) => j !== i))}>
                Quitar
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
