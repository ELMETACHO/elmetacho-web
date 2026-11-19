import { test } from "node:test";
import assert from "node:assert/strict";
import { convertir, tipoDe, limpiar, tablaMarkdown, textoDiapositiva, estimarTokens, TOKENS_IMAGEN_PAGINA, ErrorUsuario } from "./convertir.js";

// PDF mínimo válido con una página; `texto` vacío = página sin capa de texto (como un escaneado).
function pdfMinimo(paginas) {
  const objs = [];
  const add = (s) => objs.push(s);
  add("<< /Type /Catalog /Pages 2 0 R >>");
  const kids = paginas.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  add(`<< /Type /Pages /Kids [${kids}] /Count ${paginas.length} >>`);
  const fuente = 3 + paginas.length * 2;
  paginas.forEach((t, i) => {
    const stream = t ? `BT /F1 12 Tf 72 720 Td (${t}) Tj ET` : "";
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${4 + i * 2} 0 R /Resources << /Font << /F1 ${fuente} 0 R >> >> >>`);
    add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let out = "%PDF-1.4\n";
  const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

test("tipo por extensión", () => {
  assert.equal(tipoDe("Informe.PDF"), "pdf");
  assert.equal(tipoDe("a.htm"), "html");
  assert.equal(tipoDe("a.exe"), null);
  assert.equal(tipoDe("constructor"), null);
});

test("PDF con texto: Markdown y tokens antes (texto + imagen por página) y después", async () => {
  const r = await convertir(pdfMinimo(["Hola mundo desde MLABS", "Segunda pagina con mas texto"]), "x.pdf");
  assert.match(r.markdown, /Hola mundo desde MLABS/);
  assert.match(r.markdown, /Segunda pagina/);
  assert.equal(r.paginas, 2);
  assert.equal(r.escaneado, false);
  assert.equal(r.tokens.antes, r.tokens.despues + 2 * TOKENS_IMAGEN_PAGINA);
});

test("PDF sin capa de texto (escaneado): se avisa", async () => {
  const r = await convertir(pdfMinimo(["", ""]), "escaneado.pdf");
  assert.equal(r.escaneado, true);
});

test("XLSX → tabla Markdown por hoja", async () => {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  const h = libro.addWorksheet("Ventas");
  h.addRow(["Mes", "Total"]); h.addRow(["Enero", 1200]); h.addRow(["Feb|rero", 900]);
  const r = await convertir(await libro.xlsx.writeBuffer(), "ventas.xlsx");
  assert.match(r.markdown, /## Ventas/);
  assert.match(r.markdown, /\| Mes \| Total \|/);
  assert.match(r.markdown, /\| Feb\\\|rero \| 900 \|/);
  assert.equal(r.tokens.antes, null);
});

test("PPTX → una sección por diapositiva, en orden", async () => {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const slide = (...ps) => `<p:sld><p:cSld><p:spTree>${ps.map((p) => `<a:p><a:r><a:t>${p}</a:t></a:r></a:p>`).join("")}</p:spTree></p:cSld></p:sld>`;
  zip.file("ppt/slides/slide10.xml", slide("Cierre"));
  zip.file("ppt/slides/slide2.xml", slide("Precios", "Plan &amp; más"));
  zip.file("ppt/slides/slide1.xml", slide("Portada"));
  const r = await convertir(await zip.generateAsync({ type: "nodebuffer" }), "deck.pptx");
  assert.deepEqual(r.markdown.match(/## Diapositiva \d+: \w+/g), ["## Diapositiva 1: Portada", "## Diapositiva 2: Precios", "## Diapositiva 3: Cierre"]);
  assert.match(r.markdown, /- Plan & más/);
});

test("HTML → Markdown sin scripts; tokens antes = el HTML completo", async () => {
  const html = "<html><head><style>p{color:red}</style><script>alert(1)</script></head><body><h1>Título</h1><p>Hola <b>mundo</b></p><table><tr><th>A</th></tr><tr><td>1</td></tr></table></body></html>";
  const r = await convertir(Buffer.from(html), "p.html");
  assert.match(r.markdown, /^# Título/);
  assert.match(r.markdown, /\*\*mundo\*\*/);
  assert.ok(!r.markdown.includes("alert"));
  assert.ok(r.tokens.antes > r.tokens.despues);
});

test("errores para el usuario: formato y tamaño", async () => {
  await assert.rejects(convertir(Buffer.from("x"), "a.exe"), ErrorUsuario);
  await assert.rejects(convertir({ byteLength: 21 * 1024 * 1024 }, "a.pdf"), /20 MB/);
});

test("utilidades", () => {
  assert.equal(limpiar("a  \n\n\n\nb\r\n"), "a\n\nb\n");
  assert.equal(tablaMarkdown([["a", "b"], ["1"]]), "| a | b |\n| --- | --- |\n| 1 |  |");
  assert.deepEqual(textoDiapositiva("<a:p><a:r><a:t>Ho</a:t></a:r><a:r><a:t>la</a:t></a:r></a:p><a:p></a:p>"), ["Hola"]);
  assert.equal(estimarTokens("1234567"), 2);
});
