"use client";
import { useState } from "react";
import { marcaDe } from "../lib/arrastre.js";
import { lineaValida, ponerComa } from "../lib/revision.js";
import { useArrastre } from "./useArrastre.js";

// Tarjetas de comentarios en orden (✓ n, asa ⠿ para arrastrar, ↑↓, ✎, ✕) y la sección «Fuera» con ↩.
// La usan Revisar (pedidos por link) y la Cabina. `medios`: { idComentario: url firmada } (solo la Cabina).
export default function ListaComentarios({ porId, rev, bloqueado, medios = {}, onMover, onMoverA, onQuitar, onMeter, onLinea, onError }) {
  const [editando, setEditando] = useState(null); // { id, texto }
  const { registrar, asa, de, hueco } = useArrastre(rev.orden.length, onMoverA, bloqueado);
  const linea = (cid) => rev.lineas[cid] ?? porId[cid].linea;

  function guardarLinea() {
    const t = ponerComa(editando.texto);
    if (!lineaValida(t)) return onError("La línea no puede quedar vacía.");
    onLinea(editando.id, t);
    setEditando(null);
  }

  return (
    <>
      <ol className="flex flex-col gap-3">
        {rev.orden.map((cid, i) => {
          const c = porId[cid];
          return (
            <li key={cid} ref={registrar(i)}
              className={`adm-tarjeta adm-arrastrable flex flex-col gap-2 ${de === i ? "levantado" : ""} ${marcaDe(i, rev.orden.length, de, hueco)}`}>
              <div className="flex items-start gap-2">
                <span className="adm-etq numero shrink-0" aria-label="Dentro">✓ {i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="adm-sub text-xs">
                    {c.usuario}
                    {c.likes != null ? ` · ${c.likes} ♥` : ""}
                    {c.respuestas != null ? ` · ${c.respuestas} ↩` : ""}
                  </p>
                  <p className="adm-sub text-sm">{c.texto}</p>
                </div>
              </div>
              <Medio comentario={c} url={medios[cid]} />
              {editando?.id === cid ? (
                <div className="flex flex-col gap-2">
                  <textarea value={editando.texto} rows={2} className="adm-campo" disabled={bloqueado}
                    onChange={(e) => setEditando({ id: cid, texto: e.target.value })} />
                  <div className="flex gap-2">
                    <button onClick={guardarLinea} disabled={bloqueado} className="adm-btn primario flex-1">Guardar</button>
                    <button onClick={() => setEditando(null)} className="adm-btn secundario flex-1">Cancelar</button>
                  </div>
                </div>
              ) : (
                <p className="text-lg font-bold leading-snug">{linea(cid)}</p>
              )}
              <div className="flex gap-2">
                <button aria-label="Arrastrar para ordenar" disabled={bloqueado} className="adm-icono adm-asa" {...asa(i)}>⠿</button>
                <button aria-label="Subir" disabled={bloqueado} className="adm-icono" onClick={() => onMover(i, -1)}>↑</button>
                <button aria-label="Bajar" disabled={bloqueado} className="adm-icono" onClick={() => onMover(i, 1)}>↓</button>
                <button aria-label="Corregir la línea" disabled={bloqueado} className="adm-icono" onClick={() => setEditando({ id: cid, texto: linea(cid) })}>✎</button>
                <button aria-label="Quitar" disabled={bloqueado} className="adm-icono peligro ml-auto" onClick={() => onQuitar(cid)}>✕</button>
              </div>
            </li>
          );
        })}
      </ol>
      {rev.fuera.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="adm-h2">Fuera</h2>
          <ul className="flex flex-col gap-2">
            {rev.fuera.map((cid) => (
              <li key={cid} className="adm-tarjeta tenue flex items-center gap-2 p-2">
                <span className="adm-sub min-w-0 flex-1 text-sm">{linea(cid)}</span>
                <button aria-label="Meter" disabled={bloqueado} className="adm-icono" onClick={() => onMeter(cid)}>↩</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// Imagen o GIF del comentario (la Cabina), según la extensión: jpg/jpeg/png/webp/gif → <img> (el GIF llega como .gif y se anima solo);
// solo .mp4 → video mudo en bucle.
function Medio({ comentario, url }) {
  if (!comentario.medio || !url) return null;
  if (comentario.medio.pathname.endsWith(".mp4"))
    return <video src={url} muted autoPlay loop playsInline className="adm-medio" aria-label={`GIF del comentario de ${comentario.usuario}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={`Imagen del comentario de ${comentario.usuario}`} className="adm-medio" />;
}
