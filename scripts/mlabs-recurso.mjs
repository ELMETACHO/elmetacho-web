#!/usr/bin/env node
// Crea o actualiza un recurso de MLABS y su regla «comenta PALABRA → DM con el link», en un solo paso.
//
//   ADMIN_PC_TOKEN=… node scripts/mlabs-recurso.mjs recurso.json            # recurso + regla
//   ADMIN_PC_TOKEN=… node scripts/mlabs-recurso.mjs recurso.json --sin-regla # solo el recurso (migración)
//   ADMIN_PC_TOKEN=… node scripts/mlabs-recurso.mjs --lista                 # qué hay y de dónde sale
//
// recurso.json = { "recurso": { …guía, misma forma que src/app/mlabs/contenido/guias.js… },
//                  "regla": { "mensaje_dm": "…", "respuesta_publica": "…", "pedir_seguir": true } }   (regla opcional)
// También acepta la guía sola (sin envolver). MLABS_API cambia el destino (por defecto, producción).
// El token nunca se imprime. Ver docs/mlabs-recursos.md.
import { readFile } from "node:fs/promises";

const API = process.env.MLABS_API || "https://www.elmetacho.com/admin/api/pc/recursos";
const token = process.env.ADMIN_PC_TOKEN;
if (!token) {
  console.error("Falta ADMIN_PC_TOKEN en el entorno.");
  process.exit(2);
}
const auth = { authorization: `Bearer ${token}` };
const args = process.argv.slice(2);

if (args.includes("--lista")) {
  const r = await fetch(API, { headers: auth });
  const j = await r.json();
  if (!r.ok) { console.error(`Error ${r.status}: ${j.error}`); process.exit(1); }
  for (const x of j.recursos) console.log(`${x.origen.padEnd(6)}  ${x.palabra.padEnd(14)}  /recursos/${x.slug}  ${x.titulo}`);
  process.exit(0);
}

const archivo = args.find((a) => !a.startsWith("--"));
if (!archivo) {
  console.error("Uso: node scripts/mlabs-recurso.mjs <recurso.json> [--sin-regla] | --lista");
  process.exit(2);
}
const datos = JSON.parse(await readFile(archivo, "utf8"));
const cuerpo = datos.recurso ? { ...datos } : { recurso: datos };
if (args.includes("--sin-regla")) cuerpo.regla = false;

const r = await fetch(API, { method: "PUT", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
const j = await r.json().catch(() => ({}));
if (!r.ok) {
  console.error(`Error ${r.status}: ${j.error ?? "sin detalle"}`);
  process.exit(1);
}
console.log(`Listo: ${j.link}${j.regla ? ` · regla «${j.regla}» activa en @metacholabs` : " · sin regla"}`);
