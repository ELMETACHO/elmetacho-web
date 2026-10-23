"use client";
import { useRef, useState } from "react";
import { editarLinea, meter, moverAEn, moverEn, quitar } from "../../../lib/revision.js";
import { esperarGuardado, guardarEnFila } from "../../cola.js";
import ListaComentarios from "../../ListaComentarios.jsx";

const enlace = "adm-btn secundario chico shrink-0";

export default function Revisar({ id, nombre, comentarios, version, revisionInicial, horas, abierta, aviso }) {
  const porId = Object.fromEntries(comentarios.map((c) => [c.id, c]));
  const [rev, setRev] = useState({ orden: revisionInicial.orden, fuera: revisionInicial.fuera, lineas: revisionInicial.lineas });
  const [error, setError] = useState("");
  const [recargar, setRecargar] = useState(false); // un guardado falló o la propuesta cambió: la pantalla puede diferir del servidor
  const [vieja, setVieja] = useState(false);         // la propuesta cambió (409): se bloquea todo
  const viejaRef = useRef(false);
  const [cerrada, setCerrada] = useState(abierta ? "" : aviso);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);                 // aprobar/trae-más en camino: ningún cambio puede adelantarse
  const cola = useRef(Promise.resolve());
  const ultimo = useRef(null);

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
        Se aprueba solo en {horas} h (en la franja de las 2 p. m.). Cada cambio se guarda solo. Arrastra desde ⠿ o usa las flechas.
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
      <ListaComentarios porId={porId} rev={rev} bloqueado={bloqueado}
        onMover={(i, paso) => guardar(moverEn(rev, i, paso))}
        onMoverA={(de, a) => guardar(moverAEn(rev, de, a))}
        onQuitar={quitarUno}
        onMeter={(cid) => guardar(meter(rev, cid))}
        onLinea={(cid, t) => guardar(editarLinea(rev, cid, t, porId[cid].linea))}
        onError={setError} />
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
