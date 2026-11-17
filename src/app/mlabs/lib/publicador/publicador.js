// publicador.js — publicador oficial de Reels de @metacholabs (fase 2, APAGADO hasta el OK de Oscar).
// Flujo (docs de Meta, Instagram API with Instagram Login, leídos el 2026-11-16):
//   cola en Redis → video y portada en Vercel Blob privado → cron → content_publishing_limit → POST /{ig}/media
//   (media_type=REELS, video_url, cover_url, caption, share_to_feed) → status_code hasta FINISHED → media_publish
//   → se borran los archivos. Si algo falla, aviso por Telegram.
// CANDADO: solo publica en 17841480070378472 (@metacholabs). Cualquier otra cuenta se rechaza antes de llamar a Meta.
export const CUENTA_PUBLICAR = "17841480070378472";
export const MAX_ESPERA_MS = 60 * 60e3;   // si un contenedor sigue IN_PROGRESS 1 h después, se da por fallido
const ID = /^[a-z0-9-]{3,60}$/;

// Interruptor: MLABS_PUBLICADOR = "activo" (publica) | "simulacro" (hace todo menos llamar a Meta) | otro = apagado.
export function modoPublicador(env) {
  if (!["activo", "simulacro"].includes(env.MLABS_PUBLICADOR)) return null;
  if (env.IG_CUENTA_PUBLICAR !== CUENTA_PUBLICAR) return null;   // la variable tiene que repetir el id exacto
  return env.MLABS_PUBLICADOR;
}

export function validarEntrada(x) {
  const e = [];
  if (!ID.test(x?.id ?? "")) e.push("id inválido (minúsculas, números y guiones).");
  if ((x?.cuenta ?? CUENTA_PUBLICAR) !== CUENTA_PUBLICAR) e.push(`Solo se publica en @metacholabs (${CUENTA_PUBLICAR}).`);
  if (!/^publicar\/[a-z0-9-]+\/video\.mp4$/.test(x?.video ?? "")) e.push("video debe ser publicar/<id>/video.mp4.");
  if (x?.portada && !/^publicar\/[a-z0-9-]+\/portada\.jpg$/.test(x.portada)) e.push("portada debe ser publicar/<id>/portada.jpg.");
  if (typeof x?.caption !== "string" || !x.caption.trim() || x.caption.length > 2200) e.push("caption vacío o de más de 2200 caracteres.");
  if ((x?.caption?.match(/#[\p{L}\p{N}_]+/gu) ?? []).length > 30) e.push("Más de 30 hashtags.");
  if (!x?.programado || Number.isNaN(Date.parse(x.programado))) e.push("programado debe ser una fecha ISO.");
  return e;
}

export const nuevoItem = (x, ahora) => ({
  id: x.id, cuenta: CUENTA_PUBLICAR, video: x.video, portada: x.portada ?? null, caption: x.caption.trim(),
  share_to_feed: x.share_to_feed !== false, programado: new Date(x.programado).toISOString(),
  estado: "cola", creado: new Date(ahora).toISOString(), intentos: 0,
});

/**
 * Un paso del cron: atiende como máximo `max` publicaciones vencidas. Dependencias inyectadas:
 *   almacen: { pendientes(ahoraMs) → items en cola o procesando con programado <= ahora, guardar(item) }
 *   ig: { limite(cuenta) → {usado, total}, crear(cuenta, {video_url, cover_url, caption, share_to_feed}) → id,
 *         estado(contenedor) → status_code, publicar(cuenta, contenedor) → mediaId }
 *   blob: { enlace(pathname) → URL temporal pública, borrar(pathnames) }
 *   avisar(texto)
 */
export async function pasoPublicador({ env, ahora, almacen, ig, blob, avisar, max = 3 }) {
  const modo = modoPublicador(env);
  if (!modo) return { estado: "apagado" };
  const hechos = [];
  for (const item of (await almacen.pendientes(ahora)).slice(0, max)) {
    if (item.cuenta !== CUENTA_PUBLICAR) {   // candado también aquí: un registro raro en Redis no publica nada
      await almacen.guardar({ ...item, estado: "error", error: "cuenta no permitida" });
      await avisar(`⛔ Publicador: ${item.id} apunta a otra cuenta (${item.cuenta}). No se publicó.`);
      hechos.push([item.id, "bloqueado"]);
      continue;
    }
    try {
      hechos.push([item.id, await avanzar(item, { modo, ahora, almacen, ig, blob, avisar })]);
    } catch (e) {
      const intentos = (item.intentos ?? 0) + 1;
      const fallo = intentos >= 3;
      await almacen.guardar({ ...item, intentos, estado: fallo ? "error" : item.estado, error: e.message });
      if (fallo) await avisar(`❌ Publicador: ${item.id} falló 3 veces (${e.message}). Revisa la cola; los archivos siguen en Blob.`);
      hechos.push([item.id, fallo ? "error" : "reintento"]);
    }
  }
  return { estado: modo, hechos };
}

async function avanzar(item, { modo, ahora, almacen, ig, blob, avisar }) {
  if (item.estado === "cola") {
    if (modo === "simulacro") {
      await almacen.guardar({ ...item, estado: "simulado", simulado: new Date(ahora).toISOString() });
      await avisar(`🧪 Publicador (simulacro): ${item.id} se habría publicado ahora en @metacholabs.\n${item.caption.slice(0, 120)}`);
      return "simulado";
    }
    const { usado, total } = await ig.limite(item.cuenta);
    if (usado >= total) {
      await avisar(`⏸️ Publicador: límite de Instagram (${usado}/${total} en 24 h). ${item.id} espera al próximo turno.`);
      return "limite";
    }
    const contenedor = await ig.crear(item.cuenta, {
      video_url: await blob.enlace(item.video),
      cover_url: item.portada ? await blob.enlace(item.portada) : undefined,
      caption: item.caption,
      share_to_feed: item.share_to_feed,
    });
    await almacen.guardar({ ...item, estado: "procesando", contenedor, enviado: new Date(ahora).toISOString() });
    return "procesando";
  }
  if (item.estado === "procesando") {
    if (!ig) return "esperando";   // en simulacro no se consulta a Meta
    const s = await ig.estado(item.contenedor);
    if (s === "FINISHED") {
      const media = await ig.publicar(item.cuenta, item.contenedor);
      await almacen.guardar({ ...item, estado: "publicado", media, publicado: new Date(ahora).toISOString() });
      await blob.borrar([item.video, item.portada].filter(Boolean));
      await avisar(`✅ Publicado en @metacholabs: ${item.id} (media ${media}).`);
      return "publicado";
    }
    if (s === "IN_PROGRESS" && ahora - Date.parse(item.enviado) < MAX_ESPERA_MS) return "esperando";
    await almacen.guardar({ ...item, estado: "error", error: `contenedor ${s}` });
    await avisar(`❌ Publicador: Instagram devolvió ${s} para ${item.id}. No se publicó; los archivos siguen en Blob.`);
    return "error";
  }
  return item.estado;
}
