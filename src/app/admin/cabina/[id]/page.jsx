import { diasRestantes, nombreCabina } from "../../lib/cabina.js";
import { esCabina } from "../../lib/pedido.js";
import { noEditable } from "../../lib/revision.js";
import { pedidoDeSesion } from "../../cantados/[id]/pedidoDeSesion.js";
import Cabina from "./Cabina.jsx";

const ahora = () => Date.now();
export const dynamic = "force-dynamic";

export default async function PaginaCabina({ params }) {
  const { id } = await params;
  const t = ahora();
  const { dentro, pedido: p, error } = await pedidoDeSesion(id, t);   // verifica la sesión antes de leer Redis
  if (!dentro) return null;
  if (error) return <p className="adm-error">{error}</p>;
  // noEditable usa `vencida` de revision.js (vence − holgura = 70 h): vencido, la página lo dice y no deja editar.
  const aviso = !esCabina(p) || !p.propuesta || !p.vista_previa
    ? "Este candidato ya no está en la Cabina."
    : p.estado === "aprobado" ? "Ya está aprobado: sale en la franja de las 5 p. m." : noEditable(p, t);
  if (aviso)
    return (
      <div className="adm-tarjeta mt-10 flex flex-col items-center gap-4 p-6 text-center">
        <p>{aviso}</p>
        <a href="/admin" className="adm-btn secundario">Volver a la lista</a>
      </div>
    );
  return (
    <Cabina id={p.id} nombre={nombreCabina(p)} link={p.link} comentarios={p.propuesta.comentarios} version={p.propuesta.version}
      revisionInicial={{ orden: p.revision.orden, fuera: p.revision.fuera, lineas: p.revision.lineas ?? {}, propios: p.revision.propios ?? [] }}
      vista={{ duracion: p.vista_previa.duracion, ancho: p.vista_previa.ancho, alto: p.vista_previa.alto }}
      tramosIniciales={p.tramos ?? []} destinoInicial={p.destino === "story" ? "story" : "reel"}
      ganchoInicial={p.gancho ? { nombre: p.gancho.nombre || "tu gancho" } : null} dias={diasRestantes(p, t)} />
  );
}
