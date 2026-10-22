import { nombreVisible } from "../../../lib/pedido.js";
import { horasRestantes, noEditable } from "../../../lib/revision.js";
import { pedidoDeSesion } from "../pedidoDeSesion.js";
import Revisar from "./Revisar.jsx";

const ahora = () => Date.now();
export const dynamic = "force-dynamic";

export default async function PaginaRevisar({ params }) {
  const { id } = await params;
  const t = ahora();
  const { dentro, pedido: p, error } = await pedidoDeSesion(id, t);   // verifica la sesión antes de leer Redis
  if (!dentro) return null;
  if (error) return <p className="text-[#E10600]">{error}</p>;
  if (!p?.propuesta)
    return (
      <div className="flex flex-col gap-4 pt-10 text-center">
        <p>Este pedido no tiene comentarios para revisar.</p>
        <a href="/admin" className="inline-flex min-h-[44px] items-center justify-center underline">Volver a la lista</a>
      </div>
    );
  const aviso = p.estado === "aprobado" ? "Ya está aprobado: se edita en la franja de las 2 p. m." : noEditable(p, t);
  const rev = p.revision ?? { orden: [], fuera: [], lineas: {} };
  return (
    <Revisar id={p.id} nombre={nombreVisible(p)} comentarios={p.propuesta.comentarios} version={p.propuesta.version}
      revisionInicial={{ orden: rev.orden, fuera: rev.fuera, lineas: rev.lineas ?? {} }}
      horas={horasRestantes(p, t)} abierta={!aviso} aviso={aviso || ""} />
  );
}
