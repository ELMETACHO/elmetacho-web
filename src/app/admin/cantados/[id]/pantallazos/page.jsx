import { nombreVisible } from "../../../lib/pedido.js";
import { pedidoDeSesion } from "../pedidoDeSesion.js";
import SubirPantallazos from "./SubirPantallazos.jsx";

const ahora = () => Date.now();
export const dynamic = "force-dynamic";

export default async function PaginaPantallazos({ params }) {
  const { id } = await params;
  const { dentro, pedido: p, error } = await pedidoDeSesion(id, ahora());
  if (!dentro) return null;
  if (error) return <p className="text-[#E10600]">{error}</p>;
  if (p?.estado !== "necesita_pantallazos" || p.pantallazos_listos)
    return (
      <div className="flex flex-col gap-4 pt-10 text-center">
        <p>Este pedido no está esperando pantallazos.</p>
        <a href="/admin" className="underline">Volver a la lista</a>
      </div>
    );
  return <SubirPantallazos id={p.id} nombre={nombreVisible(p)} motivo={p.motivo || ""} />;
}
