"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import EditorTramos from "./EditorTramos.jsx";
import { extSegura, mover } from "../../lib/editor.js";
import { ESTILOS } from "../../lib/pedido.js";

const MAX_PANTALLAZOS = 40;
const boton = "rounded bg-[#E10600] p-4 text-lg font-bold text-white disabled:opacity-40";

// Lee duración y tamaño en píxeles de un video local.
function leerMeta(url) {
  return new Promise((ok, mal) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => ok({ duracion: v.duration, ancho: v.videoWidth, alto: v.videoHeight });
    v.onerror = () => mal(new Error("No pude leer ese video. Prueba con otro."));
    v.src = url;
  });
}

function Barra({ t }) {
  if (!t) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-3 rounded bg-black/15">
        <div
          className={`h-3 rounded ${t.error ? "bg-red-700" : "bg-[#E10600]"}`}
          style={{ width: `${t.error ? 100 : t.pct}%` }}
        />
      </div>
      {t.error && (
        <div className="flex items-center justify-between gap-2 text-[#E10600]">
          <span>{t.error}</span>
          <button onClick={t.reintentar} className="rounded border border-[#E10600] px-3 py-2">
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}

const Seccion = ({ titulo, children }) => (
  <section className="flex flex-col gap-3 rounded border border-black/15 bg-white p-3">
    <h2 className="text-lg font-bold">{titulo}</h2>
    {children}
  </section>
);

export default function NuevoPedido() {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [errorGlobal, setErrorGlobal] = useState("");
  const [original, setOriginal] = useState(null); // { url, nombre, duracion, ancho, alto, subido }
  const [tramos, setTramos] = useState([]);
  const [gancho, setGancho] = useState(null); // { nombre }
  const [avisoGancho, setAvisoGancho] = useState("");
  const [pants, setPants] = useState([]); // { pathname, tamano, nombre, url }
  const [estilo, setEstilo] = useState(ESTILOS[0]);
  const [titulo, setTitulo] = useState("");
  const [trabajos, setTrabajos] = useState({}); // clave -> { pct, error, reintentar }
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [ocupado, setOcupado] = useState(0); // handlers de archivos en curso (incluye el guardado, no solo la subida)
  const [ocupOrig, setOcupOrig] = useState(false);
  const [ocupGancho, setOcupGancho] = useState(false);

  const idRef = useRef(null);
  const videoRef = useRef(null);
  const cola = useRef(Promise.resolve());
  const pantsRef = useRef([]);
  const contador = useRef(0);
  const origenGuardado = useRef(false); // el original ya está en el servidor, con su duración
  const tramosRef = useRef([]);
  const urlOrig = useRef(null);

  useEffect(() => {
    let vivo = true;
    fetch("/admin/api/cantados", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        if (!d.id) throw new Error("sin id");
        idRef.current = d.id;
        setId(d.id);
      })
      .catch(() => vivo && setErrorGlobal("No se pudo crear el pedido. Recarga la página."));
    const pantsActuales = pantsRef;
    const urlActual = urlOrig;
    return () => {
      vivo = false;
      if (urlActual.current) URL.revokeObjectURL(urlActual.current);
      pantsActuales.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  // Cuenta handlers en curso para bloquear "Enviar pedido" hasta que todo quede guardado.
  async function conOcupado(fn) {
    setOcupado((n) => n + 1);
    try {
      return await fn();
    } finally {
      setOcupado((n) => n - 1);
    }
  }

  // PATCH en fila (el servidor lee y escribe el pedido completo: de a uno evita pisarse).
  function patch(cuerpo) {
    const paso = cola.current.then(async () => {
      const r = await fetch(`/admin/api/cantados/${idRef.current}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      return d;
    });
    cola.current = paso.catch(() => {});
    return paso;
  }
  const fijarTrabajo = (k, v) =>
    setTrabajos((t) => {
      const n = { ...t };
      if (v) n[k] = v;
      else delete n[k];
      return n;
    });

  // Sube un archivo a Blob con barra de progreso. Si falla, queda "Reintentar" y espera el toque.
  async function subir(clave, file, nombre) {
    const pathname = `cantados/${idRef.current}/${nombre}`;
    for (;;) {
      fijarTrabajo(clave, { pct: 0 });
      try {
        await upload(pathname, file, {
          access: "private",
          handleUploadUrl: "/admin/api/cantados/subir",
          clientPayload: idRef.current,
          multipart: file.size > 20e6,
          onUploadProgress: ({ percentage }) => fijarTrabajo(clave, { pct: Math.round(percentage) }),
        });
        fijarTrabajo(clave, null);
        return { pathname, tamano: file.size, nombre: file.name };
      } catch (e) {
        await new Promise((siguiente) =>
          fijarTrabajo(clave, { pct: 100, error: e?.message || "Falló la subida.", reintentar: siguiente }),
        );
      }
    }
  }

  async function elegirOriginal(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !idRef.current) return;
    setErrorGlobal("");
    setOcupOrig(true);
    await conOcupado(async () => {
      const url = URL.createObjectURL(file);
      try {
        let meta;
        try {
          meta = await leerMeta(url);
        } catch (err) {
          URL.revokeObjectURL(url);
          return setErrorGlobal(err.message);
        }
        if (urlOrig.current) URL.revokeObjectURL(urlOrig.current);
        urlOrig.current = url;
        origenGuardado.current = false;
        tramosRef.current = [];
        setTramos([]); // otra duración: hay que marcar de nuevo
        setOriginal({ url, nombre: file.name, ...meta, subido: false });
        try {
          const f = await subir("original", file, `original${extSegura(file.name, "video")}`);
          await patch({ original: { ...f, duracion: meta.duracion, ancho: meta.ancho, alto: meta.alto } });
          origenGuardado.current = true;
          setOriginal((o) => o && { ...o, subido: true });
          // Tramos marcados mientras subía: ahora sí se validan contra la duración.
          if (tramosRef.current.length) await patch({ tramos: tramosRef.current });
        } catch (err) {
          setErrorGlobal(err.message);
        }
      } finally {
        setOcupOrig(false);
      }
    });
  }

  function cambioTramos(nuevos) {
    tramosRef.current = nuevos;
    setTramos(nuevos);
    if (nuevos.length === 0 || !origenGuardado.current) return; // sin original guardado se envían tras guardarlo
    patch({ tramos: nuevos }).catch((err) => setErrorGlobal(err.message));
  }

  async function elegirGancho(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !idRef.current) return;
    setErrorGlobal("");
    setAvisoGancho("");
    setGancho(null);
    setOcupGancho(true);
    await conOcupado(async () => {
      try {
        const url = URL.createObjectURL(file);
        let meta;
        try {
          meta = await leerMeta(url);
        } catch (err) {
          return setErrorGlobal(err.message);
        } finally {
          URL.revokeObjectURL(url);
        }
        if (Math.min(meta.ancho, meta.alto) < 1080) setAvisoGancho("Tu gancho no está en 1080p");
        try {
          const f = await subir("gancho", file, `gancho${extSegura(file.name, "video")}`);
          await patch({ gancho: { ...f, duracion: meta.duracion, ancho: meta.ancho, alto: meta.alto } });
          setGancho({ nombre: file.name });
        } catch (err) {
          setErrorGlobal(err.message);
        }
      } finally {
        setOcupGancho(false);
      }
    });
  }

  function fijarPants(lista) {
    pantsRef.current = lista;
    setPants(lista);
  }
  const guardarPants = (lista) =>
    patch({ pantallazos: lista.map(({ pathname, tamano, nombre }) => ({ pathname, tamano, nombre })) }).catch((err) =>
      setErrorGlobal(err.message),
    );

  async function elegirPants(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length || !idRef.current) return;
    setErrorGlobal("");
    await conOcupado(async () => {
      for (const file of files) {
        if (pantsRef.current.length >= MAX_PANTALLAZOS || contador.current >= 99) {
          setErrorGlobal(`Son máximo ${MAX_PANTALLAZOS} pantallazos.`);
          break;
        }
        contador.current += 1; // numeración continua aunque se quiten o agreguen después
        const nn = String(contador.current).padStart(2, "0");
        try {
          const f = await subir(`pant${nn}`, file, `p${nn}${extSegura(file.name, "imagen")}`);
          fijarPants([...pantsRef.current, { ...f, url: URL.createObjectURL(file) }]);
          await guardarPants(pantsRef.current);
        } catch (err) {
          setErrorGlobal(err.message);
        }
      }
    });
  }
  function moverPant(i, paso) {
    const lista = mover(pantsRef.current, i, paso);
    fijarPants(lista);
    guardarPants(lista);
  }
  function quitarPant(i) {
    URL.revokeObjectURL(pantsRef.current[i].url);
    const lista = pantsRef.current.filter((_, j) => j !== i);
    fijarPants(lista);
    guardarPants(lista);
  }

  function elegirEstilo(s) {
    setEstilo(s);
    patch({ estilo: s }).catch((err) => setErrorGlobal(err.message));
  }

  async function enviar() {
    setEnviando(true);
    setErrorGlobal("");
    try {
      await cola.current;
      const r = await fetch(`/admin/api/cantados/${idRef.current}/enviar`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo enviar.");
      setListo(true);
      setTimeout(() => {
        router.push("/admin");
      }, 1500);
    } catch (err) {
      setErrorGlobal(err.message);
      setEnviando(false);
    }
  }

  const subiendo = Object.values(trabajos).length > 0 || ocupado > 0;
  const falta = !id || !original?.subido || tramos.length === 0 || !gancho || pants.length === 0;

  if (listo) return <p className="pt-10 text-center text-xl font-bold">Listo: sale a las 2 p. m.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nuevo video</h1>
        <a href="/admin" className="text-sm underline">
          Volver
        </a>
      </div>
      {errorGlobal && <p className="rounded bg-red-100 p-2 text-[#E10600]">{errorGlobal}</p>}

      <Seccion titulo="1. Video original">
        <input type="file" accept="video/*" onChange={elegirOriginal} disabled={!id || ocupOrig} />
        <Barra t={trabajos.original} />
        {original && (
          <>
            <video ref={videoRef} src={original.url} controls playsInline className="w-full rounded bg-black" />
            <EditorTramos duracion={original.duracion} tramos={tramos} onCambio={cambioTramos} videoRef={videoRef} />
          </>
        )}
      </Seccion>

      <Seccion titulo="2. Tu gancho">
        <input type="file" accept="video/*" onChange={elegirGancho} disabled={!id || ocupGancho} />
        <Barra t={trabajos.gancho} />
        {avisoGancho && <p className="rounded bg-yellow-200 p-2">{avisoGancho}</p>}
        {gancho && <p className="text-sm text-black/70">Subido: {gancho.nombre}</p>}
      </Seccion>

      <Seccion titulo="3. Pantallazos">
        <input type="file" accept="image/*" multiple onChange={elegirPants} disabled={!id} />
        {Object.entries(trabajos)
          .filter(([k]) => k.startsWith("pant"))
          .map(([k, t]) => (
            <Barra key={k} t={t} />
          ))}
        <ul className="flex flex-col gap-2">
          {pants.map((p, i) => (
            <li key={p.pathname} className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-16 w-16 rounded object-cover" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {i + 1}. {p.nombre}
              </span>
              <button aria-label="Subir" className="px-2 py-2 text-xl" onClick={() => moverPant(i, -1)}>
                ↑
              </button>
              <button aria-label="Bajar" className="px-2 py-2 text-xl" onClick={() => moverPant(i, 1)}>
                ↓
              </button>
              <button aria-label="Quitar" className="px-2 py-2 text-xl" onClick={() => quitarPant(i)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="4. Estilo y título">
        <div className="grid grid-cols-3 gap-2">
          {ESTILOS.map((s) => (
            <button
              key={s}
              onClick={() => elegirEstilo(s)}
              className={`rounded border-2 p-3 ${estilo === s ? "border-[#E10600] bg-[#E10600] font-bold text-white" : "border-black/30 bg-white"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título (opcional)"
          onBlur={() => patch({ titulo }).catch((err) => setErrorGlobal(err.message))}
          className="rounded border border-black/30 bg-white p-3"
        />
      </Seccion>

      <button className={boton} disabled={subiendo || falta || enviando} onClick={enviar}>
        {enviando ? "Enviando…" : subiendo ? "Subiendo…" : "Enviar pedido"}
      </button>
      {falta && !subiendo && id && (
        <p className="text-sm text-black/60">
          Falta:{" "}
          {[
            !original?.subido && "video original",
            tramos.length === 0 && "marcar un tramo",
            !gancho && "gancho",
            pants.length === 0 && "al menos un pantallazo",
          ]
            .filter(Boolean)
            .join(", ")}
          .
        </p>
      )}
    </div>
  );
}
