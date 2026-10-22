// Subida directa del navegador a Blob privado y estado de la lista de pantallazos
// (compartido por «Nuevo video» y «Subir pantallazos»). El PATCH en fila vive en cola.js.
import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { extSegura, mover } from "../lib/editor.js";
import { MAX_PANTALLAZOS } from "../lib/pedido.js";

// Sube un archivo a Blob con barra de progreso. Si falla, queda "Reintentar" y espera el toque.
export async function subirArchivo(id, clave, file, nombre, fijarTrabajo) {
  const pathname = `cantados/${id}/${nombre}`;
  for (;;) {
    fijarTrabajo(clave, { pct: 0 });
    try {
      await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/admin/api/cantados/subir",
        clientPayload: id,
        multipart: file.size > 20e6,
        onUploadProgress: ({ percentage }) => fijarTrabajo(clave, { pct: Math.round(percentage) }),
      });
      fijarTrabajo(clave, null);
      return { pathname, tamano: file.size, nombre: file.name };
    } catch (e) {
      await new Promise((siguiente) => fijarTrabajo(clave, { pct: 100, error: e?.message || "Falló la subida.", reintentar: siguiente }));
    }
  }
}

// Barras de progreso por clave y contador de handlers en curso (incluye el guardado, no solo la subida).
export function useTrabajos() {
  const [trabajos, setTrabajos] = useState({}); // clave -> { pct, error, reintentar }
  const [ocupado, setOcupado] = useState(0);
  const fijarTrabajo = (k, v) =>
    setTrabajos((t) => {
      const n = { ...t };
      if (v) n[k] = v;
      else delete n[k];
      return n;
    });
  async function conOcupado(fn) {
    setOcupado((n) => n + 1);
    try {
      return await fn();
    } finally {
      setOcupado((n) => n - 1);
    }
  }
  return { trabajos, fijarTrabajo, conOcupado, subiendo: Object.keys(trabajos).length > 0 || ocupado > 0 };
}

// Lista ordenable de pantallazos: elegir (sube y guarda de a uno), mover y quitar.
// `subir(clave, file, nombre)` sube; `patch(cuerpo)` guarda en fila; `alError(msg)` / `alLimpiar()` manejan el aviso.
export function usePantallazos({ listoParaElegir, subir, patch, conOcupado, alError, alLimpiar }) {
  const [pants, setPants] = useState([]); // { pathname, tamano, nombre, url }
  const pantsRef = useRef([]);
  const contador = useRef(0);

  useEffect(() => {
    const actuales = pantsRef;
    return () => actuales.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, []);

  function fijarPants(lista) {
    pantsRef.current = lista;
    setPants(lista);
  }
  const guardar = (lista) =>
    patch({ pantallazos: lista.map(({ pathname, tamano, nombre }) => ({ pathname, tamano, nombre })) }).catch((err) => alError(err.message));

  async function elegir(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length || !listoParaElegir()) return;
    alLimpiar();
    await conOcupado(async () => {
      for (const file of files) {
        if (pantsRef.current.length >= MAX_PANTALLAZOS || contador.current >= 99) {
          alError(`Son máximo ${MAX_PANTALLAZOS} pantallazos.`);
          break;
        }
        contador.current += 1; // numeración continua aunque se quiten o agreguen después
        const nn = String(contador.current).padStart(2, "0");
        try {
          const f = await subir(`pant${nn}`, file, `p${nn}${extSegura(file.name, "imagen")}`);
          fijarPants([...pantsRef.current, { ...f, url: URL.createObjectURL(file) }]);
          await guardar(pantsRef.current);
        } catch (err) {
          alError(err.message);
        }
      }
    });
  }
  function moverPant(i, paso) {
    const lista = mover(pantsRef.current, i, paso);
    fijarPants(lista);
    guardar(lista);
  }
  function quitarPant(i) {
    URL.revokeObjectURL(pantsRef.current[i].url);
    const lista = pantsRef.current.filter((_, j) => j !== i);
    fijarPants(lista);
    guardar(lista);
  }
  return { pants, elegir, moverPant, quitarPant };
}
