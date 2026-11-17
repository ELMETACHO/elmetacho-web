import Link from "next/link";
import { MlabsHeader, MlabsFooter, MLABS_WHATSAPP } from "../MlabsMarco";
import { esPedidoId, tokenEntrega, ENTREGA_DIAS, formatoMoneda } from "../lib/tienda/tienda.js";
import { confirmarConBold } from "../lib/tienda/servidor.js";

export const dynamic = "force-dynamic";

// Link de descarga firmado que vence en ENTREGA_DIAS (fuera del render: usa la hora actual).
const linkDescarga = (id) => `/descargar/${tokenEntrega(id, Date.now() + ENTREGA_DIAS * 86400e3, process.env.MLABS_ENTREGA_SECRETO)}`;
export const metadata = { title: { absolute: "Tu compra · MLABS" }, robots: { index: false } };

// Resultado de la compra: Bold redirige aquí con ?pedido=. Se confirma con Bold desde el servidor (no se confía en el
// navegador) y, si está pagado, se muestra el link de descarga firmado (vale 7 días).
export default async function Compra({ searchParams }) {
  const { pedido } = await searchParams;
  let r = { estado: "desconocido" };
  if (esPedidoId(pedido) && process.env.MLABS_ENTREGA_SECRETO) {
    try { r = await confirmarConBold(pedido); } catch { r = { estado: "error" }; }
  }
  const p = r.pedido;
  const link = r.estado === "pagado" ? linkDescarga(p.id) : null;

  return (
    <main>
      <MlabsHeader />
      <div className="m-post m-lectura">
        {r.estado === "pagado" ? (
          <>
            <h1 style={{ marginTop: 0 }}>¡Listo, {p.nombre || "ya es tuyo"}!</h1>
            <p className="m-resumen">Pagaste {formatoMoneda(p.monto, p.moneda)} por {p.nombre_producto}.{p.modo === "pruebas" ? " (Compra de prueba: no se cobró nada.)" : ""}</p>
            <div className="m-caja">
              <div className="m-grande">Descárgalo aquí</div>
              <small>El link vale {ENTREGA_DIAS} días. Guárdalo o descárgalo ya.</small>
              <a href={link} className="m-boton m-boton-primario m-boton-ancho">Descargar {p.nombre_producto}</a>
              <ul className="m-chequeos">
                <li>Pedido: {p.id}</li>
                <li>Si algo no funciona, escríbenos por <a href={MLABS_WHATSAPP}>WhatsApp</a> con tu número de pedido.</li>
              </ul>
            </div>
          </>
        ) : r.estado === "pendiente" ? (
          <>
            <h1 style={{ marginTop: 0 }}>Estamos confirmando tu pago</h1>
            <p className="m-resumen">Bold puede tardar unos minutos. Recarga esta página en un momento; el link de descarga aparece aquí.</p>
            <Link href={`/compra?pedido=${pedido}`} className="m-boton m-boton-primario" style={{ marginTop: 16 }}>Volver a revisar</Link>
          </>
        ) : r.estado === "rechazado" ? (
          <>
            <h1 style={{ marginTop: 0 }}>El pago no se aprobó</h1>
            <p className="m-resumen">No se cobró nada. Puedes intentarlo otra vez con otro medio de pago.</p>
            {p && <Link href={`/productos/${p.slug}`} className="m-boton m-boton-primario" style={{ marginTop: 16 }}>Volver al producto</Link>}
          </>
        ) : (
          <>
            <h1 style={{ marginTop: 0 }}>No encontramos ese pedido</h1>
            <p className="m-resumen">Si ya pagaste, escríbenos por WhatsApp con el comprobante de Bold y lo resolvemos.</p>
            <a href={MLABS_WHATSAPP} className="m-boton m-boton-primario" style={{ marginTop: 16 }}>Escribir por WhatsApp</a>
          </>
        )}
      </div>
      <MlabsFooter />
    </main>
  );
}
