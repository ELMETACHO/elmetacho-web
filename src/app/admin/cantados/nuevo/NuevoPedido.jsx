"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Barra from "../Barra.jsx";
import ListaPantallazos from "../ListaPantallazos.jsx";
import { encolarPatch } from "../cola.js";
import { leerMeta, subirArchivo, usePantallazos, useTrabajos } from "../subidas.js";
import EditorTramos from "./EditorTramos.jsx";
import { extSegura } from "../../lib/editor.js";
import { ESTILOS, MSG_LINK, TIPOS_DISPONIBLES, linkValido, pedidoDeOpcion } from "../../lib/pedido.js";

const boton = "adm-btn primario grande";
const OPCIONES = [
  { tipo: "pantallazos", titulo: "Con pantallazos", detalle: "Tú escoges los comentarios y subes las fotos." },
  { tipo: "link", titulo: "Por link", detalle: "Claude escoge los comentarios de TikTok o Instagram y tú los revisas aquí." },
  { tipo: "remix", titulo: "Remix", detalle: "Reeditar un cantado ya publicado: mismos comentarios en otro orden, otra canción. Sin revisión." },
  { tipo: "story", titulo: "Story", detalle: "Igual que con pantallazos, pero sale como story de Facebook: un solo video, sin corto de YouTube." },
];
// Orden de las secciones de cada tipo (los números de los títulos salen de aquí).
const SECCIONES = {
  pantallazos: ["original", "gancho", "pantallazos", "estilo"],
  link: ["link", "original", "gancho", "estilo"],
  remix: ["link", "publicado", "original", "gancho", "estilo"],
};
const LISTO = {
  pantallazos: "Listo: sale a las 5 p. m.",
  link: "Listo: a las 5 p. m. Claude escoge los comentarios y te llega el enlace para revisarlos.",
  remix: "Listo: el remix sale a las 5 p. m., sin revisión.",
};
const LISTO_STORY = "Listo: la story sale a las 5 p. m. y te llega por Telegram.";

const Seccion = ({ titulo, children }) => (
  <section className="adm-tarjeta flex flex-col gap-3">
    <h2 className="adm-h2">{titulo}</h2>
    {children}
  </section>
);

export default function NuevoPedido({ inicial = null }) {
  const router = useRouter();
  // `inicial`: un borrador que se continúa (lo ya subido no tiene vista previa; el original se vuelve a elegir para
  // cambiar el bucle).
  const ini = inicial;
  const [id, setId] = useState(ini?.id ?? null);
  const [tipo, setTipo] = useState(ini?.tipo ?? null);
  const [story, setStory] = useState(ini?.story ?? false);
  const [link, setLink] = useState(ini?.link ?? "");
  const [linkGuardado, setLinkGuardado] = useState(Boolean(ini?.link));
  const [errorGlobal, setErrorGlobal] = useState("");
  const [original, setOriginal] = useState(ini?.original ? { ...ini.original, url: null, subido: true } : null); // { url, nombre, duracion, ancho, alto, subido }
  const [tramos, setTramos] = useState(ini?.tramos ?? []);
  const [gancho, setGancho] = useState(ini?.gancho ? { nombre: ini.gancho.nombre } : null); // { nombre }
  const [publicado, setPublicado] = useState(ini?.publicado ? { nombre: ini.publicado.nombre } : null); // { nombre } (solo remix)
  const [avisoGancho, setAvisoGancho] = useState("");
  const [estilo, setEstilo] = useState(ini?.estilo ?? ESTILOS[0]);
  const [titulo, setTitulo] = useState(ini?.titulo ?? "");
  const { trabajos, fijarTrabajo, conOcupado, subiendo } = useTrabajos(); // trabajos: barras; subiendo: hay handlers en curso
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [ocupOrig, setOcupOrig] = useState(false);
  const [ocupGancho, setOcupGancho] = useState(false);
  const [ocupPub, setOcupPub] = useState(false);

  const idRef = useRef(ini?.id ?? null);
  const videoRef = useRef(null);
  const cola = useRef(Promise.resolve());
  const origenGuardado = useRef(Boolean(ini?.original)); // el original ya está en el servidor, con su duración
  const tramosRef = useRef(ini?.tramos ?? []);
  const urlOrig = useRef(null);

  useEffect(() => {
    const urlActual = urlOrig;
    return () => {
      if (urlActual.current) URL.revokeObjectURL(urlActual.current);
    };
  }, []);

  // El tipo se elige primero: con él se crea el pedido (spec fase 2 §4).
  async function elegirTipo(opcion) {
    const { tipo: t, destino } = pedidoDeOpcion(opcion);   // «Story» = con pantallazos + destino story
    setTipo(t);
    setStory(destino === "story");
    setErrorGlobal("");
    try {
      const r = await fetch("/admin/api/cantados", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo: t, destino }),
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
  const { pants, elegir: elegirPants, moverPant, moverPantA, quitarPant } = usePantallazos({
    listoParaElegir: () => Boolean(idRef.current),
    subir,
    patch,
    conOcupado,
    alError: setErrorGlobal,
    alLimpiar: () => setErrorGlobal(""),
    inicial: ini?.pantallazos ?? [],
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

  // Video que no se previsualiza (gancho, publicado): lee su tamaño, lo sube a la ranura `clave` y lo guarda.
  // `alEmpezar()` limpia lo anterior al elegir; `alLeer(meta)` corre antes de subir; `alSubir(file)` cuando quedó guardado.
  async function subirVideo(e, clave, setOcup, alEmpezar, alLeer, alSubir) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !idRef.current) return;
    setErrorGlobal("");
    alEmpezar();
    setOcup(true);
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
        alLeer(meta);
        try {
          const f = await subir(clave, file, `${clave}${extSegura(file.name, "video")}`);
          await patch({ [clave]: { ...f, duracion: meta.duracion, ancho: meta.ancho, alto: meta.alto } });
          alSubir(file);
        } catch (err) {
          setErrorGlobal(err.message);
        }
      } finally {
        setOcup(false);
      }
    });
  }

  function elegirGancho(e) {
    return subirVideo(
      e,
      "gancho",
      setOcupGancho,
      () => {
        setAvisoGancho("");
        setGancho(null);
      },
      (meta) => {
        if (Math.min(meta.ancho, meta.alto) < 1080) setAvisoGancho("Tu gancho no está en 1080p");
      },
      (file) => setGancho({ nombre: file.name }),
    );
  }

  function elegirPublicado(e) {
    return subirVideo(e, "publicado", setOcupPub, () => setPublicado(null), () => {}, (file) => setPublicado({ nombre: file.name }));
  }

  function elegirEstilo(s) {
    setEstilo(s);
    patch({ estilo: s }).catch((err) => setErrorGlobal(err.message));
  }

  function guardarLink() {
    const v = link.trim();
    if (!v || !idRef.current) return;
    if (!linkValido(v))
      return setErrorGlobal(MSG_LINK);
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

  const esRemix = tipo === "remix";
  const conLink = tipo === "link" || esRemix;
  const faltan = [
    !original?.subido && (esRemix ? "clip original" : "video original"),
    tramos.length === 0 && "marcar un tramo",
    !gancho && (esRemix ? "gancho nuevo" : "gancho"),
    conLink && !linkGuardado && "link de TikTok o Instagram",
    esRemix && !publicado && "video publicado",
    tipo === "pantallazos" && pants.length === 0 && "al menos un pantallazo",
  ].filter(Boolean);
  const falta = !id || faltan.length > 0;
  const num = (s) => (SECCIONES[tipo] || []).indexOf(s) + 1;

  if (listo) return <p className="adm-tarjeta mt-10 p-6 text-center text-xl font-bold text-[var(--verde)]">{story ? LISTO_STORY : LISTO[tipo]}</p>;

  if (!tipo)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="adm-titulo">Nuevo video</h1>
          <a href="/admin" className="adm-btn secundario chico">
            Volver
          </a>
        </div>
        <p className="adm-sub">¿Qué vas a pedir?</p>
        {OPCIONES.map((o) => (
          <button
            key={o.tipo}
            onClick={() => elegirTipo(o.tipo)}
            disabled={!TIPOS_DISPONIBLES.includes(pedidoDeOpcion(o.tipo).tipo)}
            className="adm-opcion flex flex-col gap-1"
          >
            <span className="text-lg font-bold">{o.titulo}</span>
            <span className="adm-sub text-sm">{o.detalle}</span>
          </button>
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="adm-titulo">{esRemix ? "Remix" : story ? "Story" : "Nuevo video"}</h1>
        <a href="/admin" className="adm-btn secundario chico">
          Volver
        </a>
      </div>
      {errorGlobal && <p className="adm-error">{errorGlobal}</p>}

      {conLink && (
        <Seccion titulo={`${num("link")}. Link de TikTok o Instagram${esRemix ? " del video original" : ""}`}>
          <input
            type="url"
            inputMode="url"
            value={link}
            placeholder="https://vt.tiktok.com/… o https://www.instagram.com/reel/…"
            onChange={(e) => {
              setLink(e.target.value);
              setLinkGuardado(false);
            }}
            onBlur={guardarLink}
            disabled={!id}
            className="adm-campo"
          />
          <p className="adm-sub text-sm">
            {esRemix
              ? "Sirve para buscar los comentarios reales (usuario, likes, foto) de las tarjetas de tu video."
              : "Solo sirve para leer los comentarios: el video súbelo abajo."}
          </p>
          {linkGuardado && <p className="text-sm font-semibold text-[var(--verde)]">Link guardado.</p>}
        </Seccion>
      )}

      {esRemix && (
        <Seccion titulo={`${num("publicado")}. Tu video ya publicado`}>
          <input type="file" accept="video/*" onChange={elegirPublicado} disabled={!id || ocupPub} />
          <Barra t={trabajos.publicado} />
          <p className="adm-sub text-sm">El cantado tal como salió: de sus tarjetas salen los comentarios.</p>
          {publicado && <p className="text-sm font-semibold text-[var(--verde)]">Subido: {publicado.nombre}</p>}
        </Seccion>
      )}

      <Seccion titulo={`${num("original")}. ${esRemix ? "Clip original (el de TikTok o Instagram, sin editar)" : "Video original"}`}>
        <input type="file" accept="video/*" onChange={elegirOriginal} disabled={!id || ocupOrig} />
        <Barra t={trabajos.original} />
        {original?.url && (
          <>
            <video ref={videoRef} src={original.url} controls playsInline className="adm-video" />
            <EditorTramos duracion={original.duracion} tramos={tramos} onCambio={cambioTramos} videoRef={videoRef} />
          </>
        )}
        {original && !original.url && (
          <p className="text-sm">
            <span className="font-semibold text-[var(--verde)]">Subido: {original.nombre || "video original"}</span>
            {tramos.length > 0 ? ` · bucle marcado (${tramos.map(([a, z]) => `${a.toFixed(1)}–${z.toFixed(1)} s`).join(", ")})` : ""}.{" "}
            <span className="adm-sub">{tramos.length ? "Para cambiar el bucle" : "Para marcar el bucle"}, vuelve a elegir el video.</span>
          </p>
        )}
      </Seccion>

      <Seccion titulo={`${num("gancho")}. ${esRemix ? "Tu gancho nuevo" : "Tu gancho"}`}>
        <input type="file" accept="video/*" onChange={elegirGancho} disabled={!id || ocupGancho} />
        <Barra t={trabajos.gancho} />
        {avisoGancho && <p className="adm-aviso">{avisoGancho}</p>}
        {gancho && <p className="text-sm font-semibold text-[var(--verde)]">Subido: {gancho.nombre}</p>}
      </Seccion>

      {tipo === "pantallazos" && (
        <Seccion titulo={`${num("pantallazos")}. Pantallazos`}>
          <input type="file" accept="image/*" multiple onChange={elegirPants} disabled={!id} />
          {Object.entries(trabajos)
            .filter(([k]) => k.startsWith("pant"))
            .map(([k, t]) => (
              <Barra key={k} t={t} />
            ))}
          <ListaPantallazos pants={pants} onMover={moverPant} onMoverA={moverPantA} onQuitar={quitarPant} />
        </Seccion>
      )}

      <Seccion titulo={`${num("estilo")}. ${esRemix ? "Título" : "Estilo y título"}`}>
        {esRemix ? (
          <p className="adm-sub text-sm">Si tu video publicado lo hizo este sistema, el estilo y el color del karaoke salen al contrario (salsa ↔ merengue); si no, salen por turno.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {ESTILOS.map((s) => (
              <button
                key={s}
                onClick={() => elegirEstilo(s)}
                className={`adm-opcion p-3 text-center text-sm ${estilo === s ? "on font-bold" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título (opcional)"
          onBlur={() => patch({ titulo }).catch((err) => setErrorGlobal(err.message))}
          className="adm-campo"
        />
      </Seccion>

      <button className={boton} disabled={subiendo || falta || enviando} onClick={enviar}>
        {enviando ? "Enviando…" : subiendo ? "Subiendo…" : "Enviar pedido"}
      </button>
      {falta && !subiendo && id && <p className="adm-sub text-center text-sm">Falta: {faltan.join(", ")}.</p>}
    </div>
  );
}
