"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Barra from "../Barra.jsx";
import ListaPantallazos from "../ListaPantallazos.jsx";
import { encolarPatch } from "../cola.js";
import { subirArchivo, usePantallazos, useTrabajos } from "../subidas.js";
import EditorTramos from "./EditorTramos.jsx";
import { extSegura } from "../../lib/editor.js";
import { ESTILOS, TIPOS_DISPONIBLES, linkValido } from "../../lib/pedido.js";

const boton = "rounded bg-[#E10600] p-4 text-lg font-bold text-white disabled:opacity-40";
const OPCIONES = [
  { tipo: "pantallazos", titulo: "Con pantallazos", detalle: "Tú escoges los comentarios y subes las fotos." },
  { tipo: "link", titulo: "Por link", detalle: "Claude escoge los comentarios de TikTok y tú los revisas aquí." },
  { tipo: "remix", titulo: "Remix", detalle: "Reeditar un cantado ya publicado (pronto)." },
];

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

const Seccion = ({ titulo, children }) => (
  <section className="flex flex-col gap-3 rounded border border-black/15 bg-white p-3">
    <h2 className="text-lg font-bold">{titulo}</h2>
    {children}
  </section>
);

export default function NuevoPedido() {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [tipo, setTipo] = useState(null);
  const [link, setLink] = useState("");
  const [linkGuardado, setLinkGuardado] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState("");
  const [original, setOriginal] = useState(null); // { url, nombre, duracion, ancho, alto, subido }
  const [tramos, setTramos] = useState([]);
  const [gancho, setGancho] = useState(null); // { nombre }
  const [avisoGancho, setAvisoGancho] = useState("");
  const [estilo, setEstilo] = useState(ESTILOS[0]);
  const [titulo, setTitulo] = useState("");
  const { trabajos, fijarTrabajo, conOcupado, subiendo } = useTrabajos(); // trabajos: barras; subiendo: hay handlers en curso
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [ocupOrig, setOcupOrig] = useState(false);
  const [ocupGancho, setOcupGancho] = useState(false);

  const idRef = useRef(null);
  const videoRef = useRef(null);
  const cola = useRef(Promise.resolve());
  const origenGuardado = useRef(false); // el original ya está en el servidor, con su duración
  const tramosRef = useRef([]);
  const urlOrig = useRef(null);

  useEffect(() => {
    const urlActual = urlOrig;
    return () => {
      if (urlActual.current) URL.revokeObjectURL(urlActual.current);
    };
  }, []);

  // El tipo se elige primero: con él se crea el pedido (spec fase 2 §4).
  async function elegirTipo(t) {
    setTipo(t);
    setErrorGlobal("");
    try {
      const r = await fetch("/admin/api/cantados", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo: t }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.id) throw new Error(d.error || "sin id");
      idRef.current = d.id;
      setId(d.id);
    } catch {
      setErrorGlobal("No se pudo crear el pedido. Recarga la página.");
    }
  }

  // PATCH en fila (el servidor lee y escribe el pedido completo: de a uno evita pisarse).
  const patch = (cuerpo) => encolarPatch(cola, `/admin/api/cantados/${idRef.current}`, cuerpo);
  const subir = (clave, file, nombre) => subirArchivo(idRef.current, clave, file, nombre, fijarTrabajo);
  const { pants, elegir: elegirPants, moverPant, quitarPant } = usePantallazos({
    listoParaElegir: () => Boolean(idRef.current),
    subir,
    patch,
    conOcupado,
    alError: setErrorGlobal,
    alLimpiar: () => setErrorGlobal(""),
  });

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

  function elegirEstilo(s) {
    setEstilo(s);
    patch({ estilo: s }).catch((err) => setErrorGlobal(err.message));
  }

  function guardarLink() {
    const v = link.trim();
    if (!v || !idRef.current) return;
    if (!linkValido(v))
      return setErrorGlobal("Ese link no es de TikTok: debe empezar por https://www.tiktok.com/, https://vm.tiktok.com/ o https://vt.tiktok.com/.");
    setErrorGlobal("");
    patch({ link: v })
      .then(() => setLinkGuardado(true))
      .catch((err) => setErrorGlobal(err.message));
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

  const porLink = tipo === "link";
  const falta = !id || !original?.subido || tramos.length === 0 || !gancho || (porLink ? !linkGuardado : pants.length === 0);
  const secciones = porLink ? ["link", "original", "gancho", "estilo"] : ["original", "gancho", "pantallazos", "estilo"];
  const num = (s) => secciones.indexOf(s) + 1;

  if (listo)
    return (
      <p className="pt-10 text-center text-xl font-bold">
        {porLink ? "Listo: a las 2 p. m. Claude escoge los comentarios y te llega el enlace para revisarlos." : "Listo: sale a las 2 p. m."}
      </p>
    );

  if (!tipo)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nuevo video</h1>
          <a href="/admin" className="text-sm underline">
            Volver
          </a>
        </div>
        <p className="text-black/70">¿Qué vas a pedir?</p>
        {OPCIONES.map((o) => (
          <button
            key={o.tipo}
            onClick={() => elegirTipo(o.tipo)}
            disabled={!TIPOS_DISPONIBLES.includes(o.tipo)}
            className="flex flex-col gap-1 rounded border-2 border-[#E10600] bg-white p-4 text-left disabled:border-black/20 disabled:opacity-50"
          >
            <span className="text-lg font-bold">{o.titulo}</span>
            <span className="text-sm text-black/70">{o.detalle}</span>
          </button>
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nuevo video</h1>
        <a href="/admin" className="text-sm underline">
          Volver
        </a>
      </div>
      {errorGlobal && <p className="rounded bg-red-100 p-2 text-[#E10600]">{errorGlobal}</p>}

      {porLink && (
        <Seccion titulo={`${num("link")}. Link de TikTok`}>
          <input
            type="url"
            inputMode="url"
            value={link}
            placeholder="https://vt.tiktok.com/…"
            onChange={(e) => {
              setLink(e.target.value);
              setLinkGuardado(false);
            }}
            onBlur={guardarLink}
            disabled={!id}
            className="rounded border border-black/30 bg-white p-3"
          />
          <p className="text-sm text-black/60">Solo sirve para leer los comentarios: el video súbelo abajo.</p>
          {linkGuardado && <p className="text-sm text-black/70">Link guardado.</p>}
        </Seccion>
      )}

      <Seccion titulo={`${num("original")}. Video original`}>
        <input type="file" accept="video/*" onChange={elegirOriginal} disabled={!id || ocupOrig} />
        <Barra t={trabajos.original} />
        {original && (
          <>
            <video ref={videoRef} src={original.url} controls playsInline className="w-full rounded bg-black" />
            <EditorTramos duracion={original.duracion} tramos={tramos} onCambio={cambioTramos} videoRef={videoRef} />
          </>
        )}
      </Seccion>

      <Seccion titulo={`${num("gancho")}. Tu gancho`}>
        <input type="file" accept="video/*" onChange={elegirGancho} disabled={!id || ocupGancho} />
        <Barra t={trabajos.gancho} />
        {avisoGancho && <p className="rounded bg-yellow-200 p-2">{avisoGancho}</p>}
        {gancho && <p className="text-sm text-black/70">Subido: {gancho.nombre}</p>}
      </Seccion>

      {!porLink && (
        <Seccion titulo={`${num("pantallazos")}. Pantallazos`}>
          <input type="file" accept="image/*" multiple onChange={elegirPants} disabled={!id} />
          {Object.entries(trabajos)
            .filter(([k]) => k.startsWith("pant"))
            .map(([k, t]) => (
              <Barra key={k} t={t} />
            ))}
          <ListaPantallazos pants={pants} onMover={moverPant} onQuitar={quitarPant} />
        </Seccion>
      )}

      <Seccion titulo={`${num("estilo")}. Estilo y título`}>
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
            porLink && !linkGuardado && "link de TikTok",
            !porLink && pants.length === 0 && "al menos un pantallazo",
          ]
            .filter(Boolean)
            .join(", ")}
          .
        </p>
      )}
    </div>
  );
}
