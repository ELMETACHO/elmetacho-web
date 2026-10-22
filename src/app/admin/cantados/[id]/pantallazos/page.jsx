import { nombreVisible, tipoDe } from "../../../lib/pedido.js";
import { pedidoDeSesion } from "../pedidoDeSesion.js";
import SubirPantallazos from "./SubirPantallazos.jsx";

const ahora = () => Date.now();
export const dynamic = "force-dynamic";

export default async function PaginaPantallazos({ params }) {
  const { id } = await params;
  const { dentro, pedido: p, error } = await pedidoDeSesion(id, ahora());
  if (!dentro) return null;
  if (error) return <p className="adm-error">{error}</p>;
  if (p?.estado !== "necesita_pantallazos" || p.pantallazos_listos)
    return (
      <div className="adm-tarjeta mt-10 flex flex-col items-center gap-4 p-6 text-center">
        <p>Este pedido no está esperando pantallazos.</p>
        <a href="/admin" className="adm-btn secundario">Volver a la lista</a>
      </div>
    );
  return <SubirPantallazos id={p.id} nombre={nombreVisible(p)} motivo={p.motivo || ""} remix={tipoDe(p) === "remix"} />;
}
