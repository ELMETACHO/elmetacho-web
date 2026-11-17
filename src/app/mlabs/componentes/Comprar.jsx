"use client";

import { useState } from "react";
import { MLABS_WHATSAPP } from "../enlaces.js";

const SCRIPT = "https://checkout.bold.co/library/boldPaymentButton.js";
const COOKIE = "mlabs_moneda";
// Fuera del componente: guarda la moneda elegida para la próxima visita.
function guardarMoneda(m) {
  document.cookie = `${COOKIE}=${m}; path=/; max-age=31536000; samesite=lax`;
}
const formato = (v, m) => (m === "COP" ? `$${new Intl.NumberFormat("es-CO").format(v)} COP` : `US$${v}`);

function cargarBold() {
  return new Promise((ok, mal) => {
    if (window.BoldCheckout) return ok();
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.onload = () => ok();
    s.onerror = () => mal(new Error("No se pudo cargar la pasarela de Bold."));
    document.head.appendChild(s);
  });
}

// Compra de un producto con precio fijo. La moneda viene del país (Vercel) y se puede cambiar a mano (cookie).
export default function Comprar({ slug, nombre, precios, monedaInicial, prueba }) {
  const [moneda, setMoneda] = useState(monedaInicial);
  const [estado, setEstado] = useState("listo");
  const [error, setError] = useState("");

  const elegir = (m) => {
    setMoneda(m);
    guardarMoneda(m);
  };

  const comprar = async (ev) => {
    ev.preventDefault();
    const datos = Object.fromEntries(new FormData(ev.currentTarget));
    setEstado("preparando");
    setError("");
    try {
      const r = await fetch("/api/tienda/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, acepta: Boolean(datos.acepta), slug, moneda }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error || "No pudimos preparar el pago.");
      await cargarBold();
      // En la vista previa de Vercel las páginas viven bajo /mlabs.
      const base = window.location.pathname.startsWith("/mlabs") ? "/mlabs" : "";
      new window.BoldCheckout({
        orderId: p.orderId, currency: p.currency, amount: p.amount, apiKey: p.apiKey,
        integritySignature: p.integritySignature, description: p.description,
        redirectionUrl: `${window.location.origin}${base}/compra?pedido=${p.orderId}`,
        originUrl: window.location.href, renderMode: "embedded",
      }).open();
    } catch (e) {
      setError(e.message);
    }
    setEstado("listo");
  };

  return (
    <form onSubmit={comprar}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div className="m-grande">{formato(precios[moneda], moneda)}</div>
        <div className="m-filtros" role="radiogroup" aria-label="Moneda" style={{ padding: 0 }}>
          {["COP", "USD"].map((m) => (
            <button key={m} type="button" role="radio" aria-checked={moneda === m} aria-pressed={moneda === m} onClick={() => elegir(m)}>{m}</button>
          ))}
        </div>
      </div>
      <small>
        {moneda === "COP" ? "Pago en pesos colombianos." : "Pago en dólares, con tarjeta."} Entrega inmediata: el link de descarga aparece al pagar.
        {prueba && " Modo de pruebas: no se cobra nada."}
      </small>
      <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
        <label><span className="m-meta">Nombre</span>
          <input name="nombre" required autoComplete="name" className="m-campo" /></label>
        <label><span className="m-meta">Correo (para el comprobante)</span>
          <input name="correo" type="email" required autoComplete="email" inputMode="email" className="m-campo" /></label>
        <input name="empresa_web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <label style={{ display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.4, color: "var(--m-gris)" }}>
          <input type="checkbox" name="acepta" required style={{ width: 20, height: 20, flex: "none", accentColor: "var(--m-rojo)" }} />
          <span>Acepto los <a href="/terminos">términos</a>, la <a href="/retracto">política de retracto</a> y el tratamiento de mis datos según la <a href="https://www.elmetacho.com/privacidad">política de privacidad</a>.</span>
        </label>
        {error && <p role="alert" style={{ background: "var(--m-rojo-suave)", color: "var(--m-rojo-osc)", borderRadius: 12, padding: "10px 12px", margin: 0, fontSize: 15 }}>
          {error} Si sigue fallando, escríbenos por <a href={MLABS_WHATSAPP}>WhatsApp</a>.</p>}
        <button type="submit" disabled={estado !== "listo"} className="m-boton m-boton-primario m-boton-ancho">
          {estado === "preparando" ? "Abriendo el pago…" : `Comprar ${nombre}`}
        </button>
      </div>
    </form>
  );
}
