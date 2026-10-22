"use client";
import { useRef, useState } from "react";
import { editarLinea, lineaValida, meter, moverEn, ponerComa, quitar } from "../../../lib/revision.js";
import { esperarGuardado, guardarEnFila } from "../../cola.js";

const enlace = "adm-btn secundario chico shrink-0";

export default function Revisar({ id, nombre, comentarios, version, revisionInicial, horas, abierta, aviso }) {
  const porId = Object.fromEntries(comentarios.map((c) => [c.id, c]));
  const [rev, setRev] = useState({ orden: revisionInicial.orden, fuera: revisionInicial.fuera, lineas: revisionInicial.lineas });
  const [editando, setEditando] = useState(null); // { id, texto }
  const [error, setError] = useState("");
  const [recargar, setRecargar] = useState(false); // un guardado falló o la propuesta cambió: la pantalla puede diferir del servidor
  const [vieja, setVieja] = useState(false);         // la propuesta cambió (409): se bloquea todo
  const viejaRef = useRef(false);
  const [cerrada, setCerrada] = useState(abierta ? "" : aviso);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);                 // aprobar/trae-más en camino: ningún cambio puede adelantarse
  const cola = useRef(Promise.resolve());
  const ultimo = useRef(null);
  const linea = (cid) => rev.lineas[cid] ?? porId[cid].linea;

  function falla(e) {
    setRecargar(true);
    if (e.status === 409) {
      viejaRef.current = true;
      setVieja(true);
    }
    setError(e.message);
  }

  // Cada cambio se guarda enseguida, en fila (el servidor recibe el estado completo).
  function guardar(nueva) {
    if (nueva === rev || viejaRef.current || enviandoRef.current) return;
    setRev(nueva);
    setError("");
    guardarEnFila(cola, ultimo, `/admin/api/cantados/${id}/revision`, { ...nueva, version }, falla);
  }
  function quitarUno(cid) {
    if (rev.orden.length <= 1) return setError("Deja al menos un comentario.");
    guardar(quitar(rev, cid));
  }
  function guardarLinea() {
    const t = ponerComa(editando.texto);
    if (!lineaValida(t)) return setError("La línea no puede quedar vacía.");
    guardar(editarLinea(rev, editando.id, t, porId[editando.id].linea));
    setEditando(null);
  }
  async function cerrar(ruta, mensaje) {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setError("");
    try {
      const g = await esperarGuardado(ultimo);   // decide por el resultado del último guardado, no por una bandera
      if (viejaRef.current) throw new Error("La propuesta cambió: recarga la página.");
      if (!g.ok) throw new Error(`${g.error.message} Recarga la página.`);
      const r = await fetch(`/admin/api/cantados/${id}/${ruta}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(d.error || "No se pudo."), { status: r.status });
      setCerrada(mensaje);
    } catch (e) {
      if (e.status === 409) {
        viejaRef.current = true;
        setVieja(true);
      }
      setRecargar(true);
      setError(e.message);
    }
    enviandoRef.current = false;
    setEnviando(false);
  }
  const bloqueado = enviando || vieja;

  if (cerrada)
    return (
      <div className="adm-tarjeta mt-10 flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-xl font-bold text-[var(--verde)]">{cerrada}</p>
        <a href="/admin" className={enlace}>Volver a la lista</a>
      </div>
    );

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="flex items-center justify-between gap-2">
        <h1 className="adm-titulo min-w-0 truncate">{nombre}</h1>
        <a href="/admin" className={enlace}>Volver</a>
      </div>
      <p className="adm-aviso">
        Se aprueba solo en {horas} h (en la franja de las 2 p. m.). Cada cambio se guarda solo.
      </p>
      {error && (
        <div className="adm-error flex flex-col gap-2">
          <p>{error}</p>
          {recargar && (
            <button onClick={() => location.reload()} className="adm-btn peligro">
              Recargar
            </button>
          )}
        </div>
      )}
      <ol className="flex flex-col gap-3">
        {rev.orden.map((cid, i) => {
          const c = porId[cid];
          return (
            <li key={cid} className="adm-tarjeta flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="adm-etq numero shrink-0" aria-label="Dentro">✓ {i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="adm-sub text-xs">
                    {c.usuario}
                    {c.likes != null ? ` · ${c.likes} ♥` : ""}
                  </p>
                  <p className="adm-sub text-sm">{c.texto}</p>
                </div>
              </div>
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
                <button aria-label="Subir" disabled={bloqueado} className="adm-icono" onClick={() => guardar(moverEn(rev, i, -1))}>↑</button>
                <button aria-label="Bajar" disabled={bloqueado} className="adm-icono" onClick={() => guardar(moverEn(rev, i, 1))}>↓</button>
                <button aria-label="Corregir la línea" disabled={bloqueado} className="adm-icono" onClick={() => setEditando({ id: cid, texto: linea(cid) })}>✎</button>
                <button aria-label="Quitar" disabled={bloqueado} className="adm-icono peligro ml-auto" onClick={() => quitarUno(cid)}>✕</button>
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
                <button aria-label="Meter" disabled={bloqueado} className="adm-icono" onClick={() => guardar(meter(rev, cid))}>↩</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="adm-pie fixed inset-x-0 bottom-0 mx-auto grid max-w-[480px] grid-cols-2 gap-2 p-4">
        <button disabled={bloqueado} className="adm-btn contorno grande"
          onClick={() => confirm("¿Pedir otros comentarios en lugar de los que quitaste? Llegan en la franja de las 2 p. m.")
            && cerrar("trae-mas", "Listo: en la franja de las 2 p. m. Claude pone otros en lugar de los que quitaste y te llega el enlace otra vez.")}>
          Trae más
        </button>
        <button disabled={bloqueado} className="adm-btn primario grande"
          onClick={() => cerrar("aprobar", "Aprobado: se edita en la franja de las 2 p. m.")}>
          Aprobar
        </button>
      </div>
    </div>
  );
}
