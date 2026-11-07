"use client";
import { useEffect, useState } from "react";
import { filtrarCatalogo } from "../../lib/catalogo.js";

// Versionar: Oscar escribe unas letras del título y van saliendo los cantados del PC que coinciden.
export default function BuscarCantado({ elegido, onElegir, deshabilitado }) {
  const [catalogo, setCatalogo] = useState(null); // null = cargando
  const [error, setError] = useState("");
  const [texto, setTexto] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch("/admin/api/catalogo")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((l) => vivo && setCatalogo(Array.isArray(l) ? l : []))
      .catch(() => vivo && (setCatalogo([]), setError("No pude cargar tus cantados. Recarga la página.")));
    return () => {
      vivo = false;
    };
  }, []);

  if (elegido)
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">
          <span className="font-semibold text-[var(--verde)]">Elegido: {elegido.titulo}</span>
          {elegido.fecha ? <span className="adm-sub"> · {elegido.fecha}</span> : null}
          {elegido.n ? <span className="adm-sub"> · {elegido.n} comentarios</span> : null}
        </p>
        <button className="adm-btn secundario chico" onClick={() => onElegir(null)} disabled={deshabilitado}>
          Cambiar
        </button>
      </div>
    );

  const sugerencias = filtrarCatalogo(catalogo || [], texto);
  return (
    <>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escribe parte del título, p. ej. «moto»"
        aria-label="Buscar el cantado"
        className="adm-campo"
        disabled={deshabilitado || catalogo === null}
      />
      {error && <p className="adm-error">{error}</p>}
      {catalogo === null && <p className="adm-sub text-sm">Cargando tus cantados…</p>}
      {catalogo?.length === 0 && !error && <p className="adm-sub text-sm">No hay cantados para versionar todavía.</p>}
      {texto.trim() && catalogo?.length > 0 && sugerencias.length === 0 && (
        <p className="adm-sub text-sm">Ningún cantado tiene esas palabras en el título.</p>
      )}
      {sugerencias.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sugerencias.map((x) => (
            <li key={x.clave}>
              <button className="adm-opcion flex w-full flex-col gap-1 p-3 text-left" onClick={() => onElegir(x)} disabled={deshabilitado}>
                <span className="text-sm font-bold">{x.titulo}</span>
                <span className="adm-sub text-xs">
                  {x.fecha} · {x.n} comentarios
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
