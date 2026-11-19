// convertir.js — archivo → Markdown limpio para pasárselo a Claude (herramienta AHORRA de mlabs.elmetacho.com).
// Librerías de Node (no es MarkItDown de Microsoft: ese no cabe en una función de Vercel, ver docs/mlabs-ahorra.md).
//   PDF: unpdf (pdf.js) · DOCX: mammoth → turndown · XLSX: exceljs · PPTX: jszip (texto de cada diapositiva) · HTML: turndown
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

export const TIPOS = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  html: "text/html",
};
export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_PAGINAS = 300;
// Docs de Anthropic (PDF support, «Estimate your costs», leído el 2026-11-18): la imagen de cada página usa como
// máximo 1.568 tokens visuales, además del texto. Los tokens de texto se estiman como caracteres ÷ 3,5.
export const TOKENS_IMAGEN_PAGINA = 1568;
export const estimarTokens = (texto) => Math.ceil(String(texto ?? "").length / 3.5);

export function tipoDe(nombre) {
  const ext = String(nombre ?? "").toLowerCase().split(".").pop();
  if (ext === "htm") return "html";
  return Object.hasOwn(TIPOS, ext) ? ext : null;
}

const turndown = () => {
  const t = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
  t.use(gfm);
  t.remove(["script", "style", "noscript", "iframe"]);
  return t;
};

// Limpieza común: espacios al final, máximo una línea en blanco seguida, sin caracteres de control.
export function limpiar(md) {
  return String(md)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}

const celda = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
export function tablaMarkdown(filas) {
  const ancho = Math.max(...filas.map((f) => f.length), 1);
  const norm = filas.map((f) => Array.from({ length: ancho }, (_, i) => celda(f[i])));
  const [cab, ...resto] = norm;
  return [`| ${cab.join(" | ")} |`, `| ${cab.map(() => "---").join(" | ")} |`, ...resto.map((f) => `| ${f.join(" | ")} |`)].join("\n");
}

async function pdf(buf) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(buf));
  if (doc.numPages > MAX_PAGINAS) throw new ErrorUsuario(`El PDF tiene ${doc.numPages} páginas; el máximo es ${MAX_PAGINAS}.`);
  const { totalPages, text } = await extractText(doc, { mergePages: false });
  const paginas = text.map((t) => t.replace(/[ \t]+/g, " ").trim());
  const md = paginas.filter(Boolean).join("\n\n");
  const letras = md.replace(/\s/g, "").length;
  return { md, paginas: totalPages, escaneado: letras < 10 * totalPages };
}

async function docx(buf) {
  const mammoth = (await import("mammoth")).default;
  const { value } = await mammoth.convertToHtml({ buffer: Buffer.from(buf) });
  return { md: turndown().turndown(value) };
}

async function xlsx(buf) {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buf);
  const partes = [];
  libro.eachSheet((hoja) => {
    const filas = [];
    hoja.eachRow({ includeEmpty: false }, (fila) => {
      const v = fila.values.slice(1).map((c) => (c && typeof c === "object" ? c.result ?? c.text ?? c.richText?.map((r) => r.text).join("") ?? "" : c));
      if (v.some((x) => String(x ?? "").trim())) filas.push(v);
    });
    if (filas.length) partes.push(`## ${hoja.name}\n\n${tablaMarkdown(filas)}`);
  });
  return { md: partes.join("\n\n") };
}

const desescapar = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
export function textoDiapositiva(xml) {
  return [...xml.matchAll(/<a:p[\s>][\s\S]*?<\/a:p>/g)]
    .map((p) => [...p[0].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((t) => desescapar(t[1])).join(""))
    .map((s) => s.trim())
    .filter(Boolean);
}

async function pptx(buf) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const nombres = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const partes = [];
  for (const [i, n] of nombres.entries()) {
    const [titulo, ...resto] = textoDiapositiva(await zip.file(n).async("string"));
    partes.push(`## Diapositiva ${i + 1}${titulo ? `: ${titulo}` : ""}${resto.length ? `\n\n${resto.map((r) => `- ${r}`).join("\n")}` : ""}`);
  }
  return { md: partes.join("\n\n"), paginas: nombres.length };
}

async function html(buf) {
  const fuente = Buffer.from(buf).toString("utf8");
  return { md: turndown().turndown(fuente), fuente };
}

export class ErrorUsuario extends Error {}

/** buf: ArrayBuffer | Buffer. Devuelve { markdown, tipo, paginas, tokens: { antes, despues }, escaneado }. */
export async function convertir(buf, nombre) {
  const tipo = tipoDe(nombre);
  if (!tipo) throw new ErrorUsuario("Formato no soportado. Sube PDF, DOCX, XLSX, PPTX o HTML.");
  if (buf.byteLength > MAX_BYTES) throw new ErrorUsuario("El archivo pasa de 20 MB.");
  const r = await { pdf, docx, xlsx, pptx, html }[tipo](buf);
  const markdown = limpiar(r.md);
  const despues = estimarTokens(markdown);
  // «Antes» solo donde Claude recibe el archivo tal cual: PDF (texto + imagen por página) y HTML (el código completo).
  const antes = tipo === "pdf" ? despues + r.paginas * TOKENS_IMAGEN_PAGINA : tipo === "html" ? estimarTokens(r.fuente) : null;
  return { markdown, tipo, paginas: r.paginas ?? null, tokens: { antes, despues }, escaneado: Boolean(r.escaneado) };
}
