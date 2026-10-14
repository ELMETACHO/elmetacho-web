"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MLABS_WHATSAPP } from "../../MlabsMarco";

const TEXTO = {
  APPROVED: { titulo: "Pago aprobado", detalle: "Gracias. Ya nos llegó el aviso y te escribimos por WhatsApp para arrancar." },
  PROCESSING: { titulo: "Pago en proceso", detalle: "Bold está confirmando tu pago. Esta página se actualiza sola." },
  PENDING: { titulo: "Pago pendiente", detalle: "Tu banco está confirmando el pago por PSE. Esta página se actualiza sola." },
  REJECTED: { titulo: "Pago rechazado", detalle: "Tu banco no aprobó el pago. Intenta con otra tarjeta o con PSE." },
  FAILED: { titulo: "El pago falló", detalle: "Hubo un error al procesar el pago. No se hizo ningún cobro. Intenta de nuevo." },
  VOIDED: { titulo: "Pago anulado", detalle: "Este pago fue anulado." },
  NO_TRANSACTION_FOUND: { titulo: "No vemos un pago todavía", detalle: "Si acabas de pagar, espera unos segundos. Si cerraste la ventana de pago, puedes intentarlo otra vez." },
};

export default function Resultado() {
  const [pedido, setPedido] = useState("");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let p = new URLSearchParams(window.location.search).get("pedido") || "";
    if (!p) {
      try {
        p = sessionStorage.getItem("mlabs-pedido") || "";
      } catch {}
    }
    setPedido(p); // eslint-disable-line react-hooks/set-state-in-effect
    if (!p) return;
    let vivo = true;
    let intentos = 0;
    const consultar = async () => {
      const r = await fetch(`/api/bold/estado?pedido=${encodeURIComponent(p)}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!vivo) return;
      setInfo(j);
      intentos += 1;
      if (["PROCESSING", "PENDING", "NO_TRANSACTION_FOUND", "DESCONOCIDO", undefined].includes(j.estado) && intentos < 20) setTimeout(consultar, 3000);
    };
    consultar();
    return () => {
      vivo = false;
    };
  }, []);

  const t = TEXTO[info?.estado] || { titulo: pedido ? "Consultando tu pago…" : "No encontramos tu pedido", detalle: pedido ? "" : "Vuelve a la página de pago o escríbenos por WhatsApp." };
  const ok = info?.estado === "APPROVED";
  return (
    <div className={`rounded-[1.5rem] p-6 sm:p-8 ${ok ? "bg-black text-white" : "border-2 border-black bg-white"}`} role="status" aria-live="polite">
      <p className="titular-ancho text-4xl">{t.titulo}</p>
      {t.detalle && <p className={`mt-3 text-lg leading-8 ${ok ? "text-white/80" : "text-gris"}`}>{t.detalle}</p>}
      {pedido && <p className={`mt-4 text-sm ${ok ? "text-white/60" : "text-gris"}`}>Pedido {pedido}</p>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a href={MLABS_WHATSAPP} className="rounded-full bg-rojo px-6 py-3 text-center font-bold text-white">
          Escribir por WhatsApp
        </a>
        {!ok && (
          <Link href="/pagar" className="rounded-full border-2 border-current px-6 py-3 text-center font-bold">
            Intentar de nuevo
          </Link>
        )}
      </div>
    </div>
  );
}
