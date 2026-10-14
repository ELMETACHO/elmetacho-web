"use client";

import { useState } from "react";
import { MLABS_WHATSAPP } from "../enlaces.js";

const SCRIPT = "https://checkout.bold.co/library/boldPaymentButton.js";

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

// Pago con monto abierto: la persona escribe lo que le cotizamos y paga con Bold (tarjeta nacional o internacional, PSE, billeteras).
export default function PagarCliente() {
  const [moneda, setMoneda] = useState("COP");
  const [estado, setEstado] = useState("listo");
  const [error, setError] = useState("");

  const pagar = async (ev) => {
    ev.preventDefault();
    const datos = Object.fromEntries(new FormData(ev.currentTarget));
    setEstado("preparando");
    setError("");
    try {
      const r = await fetch("/api/bold/firma", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...datos, moneda }) });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error || "No pudimos preparar el pago.");
      await cargarBold();
      try {
        sessionStorage.setItem("mlabs-pedido", p.orderId);
      } catch {}
      const checkout = new window.BoldCheckout({
        orderId: p.orderId,
        currency: p.currency,
        amount: p.amount,
        apiKey: p.apiKey,
        integritySignature: p.integritySignature,
        description: p.description,
        redirectionUrl: `${window.location.origin}/pagar/resultado?pedido=${p.orderId}`,
        originUrl: window.location.href,
        renderMode: "embedded",
      });
      checkout.open();
      setEstado("listo");
    } catch (e) {
      setError(e.message);
      setEstado("listo");
    }
  };

  const campo = "w-full rounded-2xl border border-black/15 bg-white px-4 py-4 text-lg outline-none focus:border-rojo focus:ring-2 focus:ring-rojo/20";
  return (
    <form onSubmit={pagar} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-full bg-black/5 p-1" role="radiogroup" aria-label="Moneda">
        {["COP", "USD"].map((m) => (
          <button key={m} type="button" role="radio" aria-checked={moneda === m} onClick={() => setMoneda(m)} className={`rounded-full py-3 text-base font-bold transition ${moneda === m ? "bg-black text-white" : "text-black"}`}>
            {m === "COP" ? "Pesos (COP)" : "Dólares (USD)"}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Monto que te cotizamos</span>
        <input name="monto" required inputMode="numeric" placeholder={moneda === "COP" ? "Ej: 350000" : "Ej: 100"} className={campo} />
        <span className="mt-1 block text-sm text-gris">Solo números, sin puntos ni decimales.</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">¿Qué estás pagando?</span>
        <input name="descripcion" required minLength={2} maxLength={100} placeholder="Ej: Paquete de 10 videos — Panadería La 80" className={campo} />
      </label>
      {error && (
        <p className="rounded-2xl bg-rojo/10 p-3 text-sm text-rojo" role="alert">
          {error} Si sigue fallando, escríbenos por <a href={MLABS_WHATSAPP} className="font-bold underline">WhatsApp</a>.
        </p>
      )}
      <button type="submit" disabled={estado !== "listo"} className="w-full rounded-full bg-rojo px-6 py-4 text-lg font-bold text-white disabled:opacity-60">
        {estado === "preparando" ? "Abriendo el pago…" : "Pagar con Bold"}
      </button>
      <p className="text-center text-sm text-gris">Tarjeta nacional o internacional, PSE y billeteras. El pago lo procesa Bold.</p>
    </form>
  );
}
