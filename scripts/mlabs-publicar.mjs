#!/usr/bin/env node
// Encola un Reel para @metacholabs: sube video y portada al Blob privado y lo programa en la cola del publicador.
// Encolar NO publica: el cron solo publica con MLABS_PUBLICADOR=activo en Vercel (docs/mlabs-publicador.md).
//
//   ADMIN_PC_TOKEN=… node scripts/mlabs-publicar.mjs <id> <video.mp4> <portada.jpg|-> <caption.txt> <ISO>
//   ADMIN_PC_TOKEN=… node scripts/mlabs-publicar.mjs --cola
// Ej.: … lab-2026-11-17-01 out/v.mp4 out/portada.jpg out/caption.txt 2026-11-17T12:30:00-05:00
import { readFileSync } from "node:fs";
import { put } from "@vercel/blob/client";

const API = process.env.MLABS_API_PUBLICAR || "https://www.elmetacho.com/admin/api/pc/publicar";
const token = process.env.ADMIN_PC_TOKEN;
if (!token) { console.error("Falta ADMIN_PC_TOKEN en el entorno."); process.exit(2); }
const auth = { authorization: `Bearer ${token}`, "content-type": "application/json" };
const llamar = async (metodo, cuerpo) => {
  const r = await fetch(API, { method: metodo, headers: auth, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error(`Error ${r.status}: ${j.error ?? "sin detalle"}`); process.exit(1); }
  return j;
};

const args = process.argv.slice(2);
if (args[0] === "--cola") {
  for (const i of (await llamar("GET")).cola) console.log(`${i.estado.padEnd(11)} ${i.programado}  ${i.id}${i.error ? `  (${i.error})` : ""}`);
  process.exit(0);
}
const [id, video, portada, captionArchivo, programado] = args;
if (!programado) { console.error("Uso: node scripts/mlabs-publicar.mjs <id> <video.mp4> <portada.jpg|-> <caption.txt> <ISO> | --cola"); process.exit(2); }

const t = await llamar("POST", { id });
await put(t.video.pathname, readFileSync(video), { access: "private", token: t.video.token, contentType: "video/mp4" });
if (portada !== "-") await put(t.portada.pathname, readFileSync(portada), { access: "private", token: t.portada.token, contentType: "image/jpeg" });
const r = await llamar("PUT", {
  id, video: t.video.pathname, portada: portada !== "-" ? t.portada.pathname : undefined,
  caption: readFileSync(captionArchivo, "utf8"), programado,
});
console.log(`En cola: ${r.item.id} para ${r.item.programado} (estado ${r.item.estado}).`);
