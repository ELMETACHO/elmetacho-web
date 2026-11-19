"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import FormularioLead from "../FormularioLead";
import Comprar from "./Comprar";

const ACEPTA = ".pdf,.docx,.xlsx,.pptx,.html,.htm";
const n = (v) => new Intl.NumberFormat("es-CO").format(v);
const nombreSeguro = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80) || "archivo";

function Registro({ alListo }) {
  const [estado, setEstado] = useState("listo");
  const [error, setError] = useState("");
  const enviar = async (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.currentTarget));
    setEstado("enviando"); setError("");
    try {
      const r = await fetch("/api/ahorra/registro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...d, acepta: Boolean(d.acepta) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No pudimos registrarte.");
      alListo(j);
    } catch (e) { setError(e.message); setEstado("listo"); }
  };
  return (
    <form onSubmit={enviar} className="m-candado" style={{ marginTop: 0 }}>
      <p>Tus 3 archivos gratis</p>
      <p>Escribe tu correo y conviertes tus primeros 3 archivos sin pagar nada.</p>
      <label><span>Nombre</span><input name="nombre" required autoComplete="name" /></label>
      <label><span>Correo</span><input name="correo" type="email" required autoComplete="email" inputMode="email" placeholder="tu@correo.com" /></label>
      <input name="empresa_web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="m-acepto"><input type="checkbox" name="acepta" required />
        <span>Acepto que EL METACHO S.A.S. me contacte y trate mis datos según la <a href="https://www.elmetacho.com/privacidad">política de privacidad</a>.</span></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={estado !== "listo"} className="m-boton m-boton-primario m-boton-ancho">{estado === "enviando" ? "Un momento…" : "Empezar gratis"}</button>
    </form>
  );
}

function Comparacion({ r }) {
  const { antes, despues } = r.tokens;
  if (!antes) return <p className="m-meta">≈ {n(despues)} tokens de texto limpio (estimado).</p>;
  const ahorro = Math.max(0, Math.round(100 - (100 * despues) / antes));
  const barra = (v, color) => <div style={{ height: 14, borderRadius: 99, background: color, width: `${Math.max(3, (100 * v) / antes)}%` }} />;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div><div className="m-meta">Si le pasas el {r.tipo === "pdf" ? "PDF" : "HTML"} a Claude</div><b style={{ fontSize: 22 }}>≈ {n(antes)} tokens</b>{barra(antes, "var(--m-borde)")}</div>
      <div><div className="m-meta">Si le pasas este texto</div><b style={{ fontSize: 22, color: "var(--m-rojo)" }}>≈ {n(despues)} tokens</b>{barra(despues, "var(--m-rojo)")}</div>
      <p style={{ margin: 0, fontWeight: 750, fontSize: 19 }}>Ahorras ≈ {ahorro} %</p>
      <p className="m-meta" style={{ margin: 0 }}>
        Estimado: texto ÷ 3,5{r.tipo === "pdf" ? " + hasta 1.568 tokens por la imagen de cada página (documentación de Anthropic)" : ""}. Tu número real depende del modelo.
      </p>
    </div>
  );
}

export default function Ahorra({ sesionInicial, saldoInicial, carpeta: carpetaInicial, paquete }) {
  const [sesion, setSesion] = useState(sesionInicial);
  const [carpeta, setCarpeta] = useState(carpetaInicial);
  const [saldo, setSaldo] = useState(saldoInicial);
  const [estado, setEstado] = useState("listo");   // listo | subiendo | convirtiendo
  const [error, setError] = useState("");
  const [r, setR] = useState(null);
  const [copiado, setCopiado] = useState(false);

  if (!sesion) return <Registro alListo={(j) => { setSesion(j.correo); setSaldo(j.saldo); setCarpeta(null); window.location.reload(); }} />;

  const elegir = async (ev) => {
    const archivo = ev.target.files?.[0];
    ev.target.value = "";
    if (!archivo) return;
    if (archivo.size > 20 * 1024 * 1024) return setError("El archivo pasa de 20 MB.");
    setError(""); setR(null); setEstado("subiendo");
    try {
      const b = await upload(`${carpeta}${nombreSeguro(archivo.name)}`, archivo, { access: "private", handleUploadUrl: "/api/ahorra/subida" });
      setEstado("convirtiendo");
      const res = await fetch("/api/ahorra/convertir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pathname: b.pathname }) });
      const j = await res.json();
      if (!res.ok) { if (j.sinSaldo) setSaldo(0); throw new Error(j.error || "No pudimos convertirlo."); }
      setR(j); setSaldo(j.saldo);
    } catch (e) {
      setError(/acabaron/.test(e.message) ? "Se acabaron tus archivos gratis." : e.message);
    }
    setEstado("listo");
  };

  const copiar = async () => { try { await navigator.clipboard.writeText(r.markdown); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } catch {} };
  const descargar = () => {
    const url = URL.createObjectURL(new Blob([r.markdown], { type: "text/markdown;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "archivo-limpio.md" });
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="m-etiquetas" style={{ margin: 0 }}>
        <span className={saldo > 0 ? "m-verde" : undefined}>{saldo > 0 ? (saldo === 1 ? "Te queda 1 archivo" : `Te quedan ${saldo} archivos`) : "Sin archivos disponibles"}</span>
        <span className="m-verde">Se borra al convertir</span>
      </div>

      {saldo > 0 && (
        <label className="m-caja" style={{ marginTop: 0, display: "grid", gap: 8, textAlign: "center", cursor: estado === "listo" ? "pointer" : "wait", borderStyle: "dashed", borderWidth: 2 }}>
          <span className="m-grande" style={{ fontSize: 24 }}>
            {estado === "subiendo" ? "Subiendo…" : estado === "convirtiendo" ? "Convirtiendo…" : "Elige tu archivo"}
          </span>
          <span className="m-meta">PDF, Word, Excel, PowerPoint o HTML · hasta 20 MB</span>
          <input type="file" accept={ACEPTA} onChange={elegir} disabled={estado !== "listo"} className="sr-only" />
        </label>
      )}
      {error && <p role="alert" style={{ background: "var(--m-rojo-suave)", color: "var(--m-rojo-osc)", borderRadius: 12, padding: "10px 12px", margin: 0 }}>{error}</p>}

      {r && (
        <section className="m-caja" style={{ marginTop: 0, display: "grid", gap: 14 }}>
          {r.escaneado ? (
            <p className="m-ojo" style={{ margin: 0 }}><strong>Ojo: </strong>este PDF parece escaneado (son fotos de las páginas). Sin OCR no se puede sacar el texto; prueba con el original digital. No se descontó tu archivo.</p>
          ) : (
            <>
          <Comparacion r={r} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={copiar} className="m-boton m-boton-primario" style={{ flex: 1 }}>{copiado ? "¡Copiado!" : "Copiar texto"}</button>
            <button type="button" onClick={descargar} className="m-boton m-boton-suave" style={{ flex: 1 }}>Descargar</button>
          </div>
          <textarea readOnly value={r.markdown.slice(0, 200000)} aria-label="Texto en Markdown" style={{ width: "100%", minHeight: 260, borderRadius: 14, border: "1.5px solid var(--m-borde)", padding: 12, font: "14px/1.5 ui-monospace, Consolas, monospace" }} />
            </>
          )}
        </section>
      )}

      {saldo <= 0 && (
        <section id="paquete" className="m-caja" style={{ marginTop: 0 }}>
          {paquete.comprable ? (
            <>
              <p style={{ margin: "0 0 4px", fontWeight: 750, fontSize: 19 }}>{paquete.archivos} archivos más · pago único, no vencen</p>
              <Comprar slug={paquete.slug} nombre={`${paquete.archivos} archivos`} precios={paquete.precios} monedaInicial={paquete.moneda} prueba={paquete.prueba} correoInicial={sesion} />
            </>
          ) : (
            <>
              <div className="m-grande" style={{ fontSize: 24 }}>{paquete.archivos} archivos por {paquete.textoPrecio}</div>
              <small>Pago único, no vencen. Abrimos los pagos muy pronto: déjanos tu WhatsApp y te avisamos primero.</small>
              <FormularioLead origen="ahorra-paquete" boton="Avísame" pedirMensaje={false} mensajeOk="Listo. Te avisamos primero cuando abran los pagos." />
            </>
          )}
        </section>
      )}
    </div>
  );
}
