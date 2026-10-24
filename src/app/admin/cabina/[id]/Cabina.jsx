"use client";
import { useEffect, useRef, useState } from "react";
import Barra from "../../cantados/Barra.jsx";
import ListaComentarios from "../../cantados/ListaComentarios.jsx";
import EditorTramos from "../../cantados/nuevo/EditorTramos.jsx";
import { esperarGuardado, guardarEnFila } from "../../cantados/cola.js";
import { leerMeta, subirArchivo, useTrabajos } from "../../cantados/subidas.js";
import { textoDias } from "../../lib/cabina.js";
import { extSegura } from "../../lib/editor.js";
import { editarLinea, meter, moverAEn, moverEn, quitar } from "../../lib/revision.js";

const chico = "adm-btn secundario chico shrink-0";
const Seccion = ({ titulo, children }) => (
  <section className="adm-tarjeta flex flex-col gap-3">
    <h2 className="adm-h2">{titulo}</h2>
    {children}
  </section>
);

export default function Cabina({ id, nombre, link, comentarios, version, revisionInicial, vista, tramosIniciales, destinoInicial, ganchoInicial, dias }) {
  const porId = Object.fromEntries(comentarios.map((c) => [c.id, c]));
  const [rev, setRev] = useState(revisionInicial);
  const [tramos, setTramos] = useState(tramosIniciales);
  const [destino, setDestino] = useState(destinoInicial);
  const [gancho, setGancho] = useState(ganchoInicial);
  const [avisoGancho, setAvisoGancho] = useState("");
  const [urls, setUrls] = useState({ vista: null, medios: {} });
  const [error, setError] = useState("");
  const [recargar, setRecargar] = useState(false);
  const [vieja, setVieja] = useState(false);        // 409: venció, ya se decidió o cambió en otro lado; se bloquea todo
  const viejaRef = useRef(false);
  const [cerrada, setCerrada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const { trabajos, fijarTrabajo, conOcupado, subiendo } = useTrabajos();
  const videoRef = useRef(null);
  // UNA sola fila para TODOS los guardados (/revision y /<id>: tramos, destino, gancho): el servidor reescribe el registro entero.
  const cola = useRef(Promise.resolve());
  const ultimo = useRef(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/admin/api/cabina/${id}/medios`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "No se pudo cargar el video.");
        return d;
      })
      .then((d) => vivo && setUrls({ vista: d.vista, medios: d.medios || {} }))
      .catch((e) => vivo && setError(e.message));
    return () => {
      vivo = false;
    };
  }, [id]);

  function falla(e) {
    setRecargar(true);
    if (e.status === 409) {
      viejaRef.current = true;
      setVieja(true);
    }
    setError(e.message);
  }
  const bloqueado = enviando || vieja;
  const puedeGuardar = () => !viejaRef.current && !enviandoRef.current;

  function guardarRev(nueva) {
    if (nueva === rev || !puedeGuardar()) return;
    setRev(nueva);
    setError("");
    guardarEnFila(cola, ultimo, `/admin/api/cantados/${id}/revision`, { ...nueva, version }, falla);
  }
  function guardarCampos(cuerpo) {
    if (!puedeGuardar()) return Promise.resolve({ ok: false });
    setError("");
    return guardarEnFila(cola, ultimo, `/admin/api/cantados/${id}`, cuerpo, falla);
  }
  function quitarUno(cid) {
    if (rev.orden.length <= 1) return setError("Deja al menos un comentario.");
    guardarRev(quitar(rev, cid));
  }
  function cambioTramos(nuevos) {
    if (!puedeGuardar()) return;   // bloqueado: no se cambia en pantalla lo que no se va a guardar
    setTramos(nuevos);
    if (nuevos.length) guardarCampos({ tramos: nuevos });   // sin tramos no se guarda: «Aprobar» queda pidiendo uno
  }
  function elegirDestino(d) {
    if (d === destino || bloqueado) return;
    setDestino(d);
    guardarCampos({ destino: d });
  }
  async function elegirGancho(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || bloqueado) return;
    setError("");
    setAvisoGancho("");
    setGancho(null);
    await conOcupado(async () => {
      const url = URL.createObjectURL(file);
      let meta;
      try {
        meta = await leerMeta(url);
      } catch (err) {
        return setError(err.message);
      } finally {
        URL.revokeObjectURL(url);
      }
      if (Math.min(meta.ancho, meta.alto) < 1080) setAvisoGancho("Tu gancho no está en 1080p");
      try {
        const f = await subirArchivo(id, "gancho", file, `gancho${extSegura(file.name, "video")}`, fijarTrabajo);
        const g = await guardarCampos({ gancho: { ...f, duracion: meta.duracion, ancho: meta.ancho, alto: meta.alto } });
        if (g.ok) setGancho({ nombre: file.name });
      } catch (err) {
        setError(err.message);
      }
    });
  }

  const faltan = [!gancho && "tu gancho", tramos.length === 0 && "marcar al menos un tramo"].filter(Boolean);

  async function aprobar() {
    if (enviandoRef.current || faltan.length || subiendo || recargar) return;   // recargar = hay un guardado fallido sin reponer
    enviandoRef.current = true;
    setEnviando(true);
    setError("");
    try {
      const g = await esperarGuardado(ultimo);   // decide por el último guardado, no por una bandera
      if (viejaRef.current) throw new Error("El candidato cambió: recarga la página.");
      if (!g.ok) throw new Error(`${g.error?.message || "No se pudo guardar."} Recarga la página.`);
      const r = await fetch(`/admin/api/cantados/${id}/aprobar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(d.error || "No se pudo aprobar."), { status: r.status });
      setCerrada("Aprobado: sale en la franja de las 5 a. m.");
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
  async function descartar() {
    if (enviandoRef.current || subiendo || !confirm("¿Descartar este candidato? Se borra del todo.")) return;
    enviandoRef.current = true;
    setEnviando(true);
    setError("");
    try {
      await esperarGuardado(ultimo);   // que ningún PATCH en vuelo reviva el registro después de borrarlo
      const r = await fetch(`/admin/api/cantados/${id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo descartar.");
      setCerrada("Descartado.");
    } catch (e) {
      setError(e.message);
    }
    enviandoRef.current = false;
    setEnviando(false);
  }

  if (cerrada)
    return (
      <div className="adm-tarjeta mt-10 flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-xl font-bold text-[var(--verde)]">{cerrada}</p>
        <a href="/admin" className={chico}>Volver a la lista</a>
      </div>
    );

  return (
    <div className="flex flex-col gap-4 pb-36">
      <div className="flex items-center justify-between gap-2">
        <h1 className="adm-titulo">Cabina</h1>
        <a href="/admin" className={chico}>Volver</a>
      </div>
      <a href={link} target="_blank" rel="noreferrer" className="adm-sub truncate text-sm underline">{nombre}</a>
      <p className="adm-aviso">
        Si no lo apruebas, {textoDias(dias)} como story corta. Cada cambio se guarda solo. Arrastra desde ⠿ o usa las flechas.
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

      <Seccion titulo="1. Video y tramos">
        {urls.vista ? (
          <video ref={videoRef} src={urls.vista} controls playsInline preload="metadata" className="adm-video" />
        ) : (
          <p className="adm-sub text-sm">Cargando el video…</p>
        )}
        <EditorTramos duracion={vista.duracion} tramos={tramos} onCambio={cambioTramos} videoRef={videoRef} />
      </Seccion>

      <Seccion titulo="2. Comentarios">
        <ListaComentarios porId={porId} rev={rev} bloqueado={bloqueado} medios={urls.medios}
          onMover={(i, paso) => guardarRev(moverEn(rev, i, paso))}
          onMoverA={(de, a) => guardarRev(moverAEn(rev, de, a))}
          onQuitar={quitarUno}
          onMeter={(cid) => guardarRev(meter(rev, cid))}
          onLinea={(cid, t) => guardarRev(editarLinea(rev, cid, t, porId[cid].linea))}
          onError={setError} />
      </Seccion>

      <Seccion titulo="3. Tu gancho">
        <input type="file" accept="video/*" onChange={elegirGancho} disabled={bloqueado || subiendo} />
        <Barra t={trabajos.gancho} />
        {avisoGancho && <p className="adm-aviso">{avisoGancho}</p>}
        {gancho && <p className="text-sm font-semibold text-[var(--verde)]">Subido: {gancho.nombre}</p>}
      </Seccion>

      <Seccion titulo="4. Destino">
        <div className="grid grid-cols-2 gap-2">
          {[["reel", "Reel"], ["story", "Story"]].map(([valor, texto]) => (
            <button key={valor} disabled={bloqueado} onClick={() => elegirDestino(valor)}
              className={`adm-opcion p-3 text-center ${destino === valor ? "on font-bold" : ""}`}>
              {texto}
            </button>
          ))}
        </div>
      </Seccion>

      <div className="adm-pie fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col gap-2 p-4">
        {faltan.length > 0 && !bloqueado && <p className="adm-sub text-center text-sm">Falta: {faltan.join(", ")}.</p>}
        <div className="grid grid-cols-2 gap-2">
          <button disabled={bloqueado || subiendo} className="adm-btn peligro grande" onClick={descartar}>
            Descartar
          </button>
          <button disabled={bloqueado || subiendo || recargar || faltan.length > 0} className="adm-btn primario grande" onClick={aprobar}>
            {enviando ? "Guardando…" : subiendo ? "Subiendo…" : "Aprobar"}
          </button>
        </div>
      </div>
    </div>
  );
}
