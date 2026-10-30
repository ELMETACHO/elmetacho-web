import { destinoDe, tipoDe } from "../../lib/pedido.js";
import { pedidoDeSesion } from "../[id]/pedidoDeSesion.js";
import NuevoPedido from "./NuevoPedido.jsx";

const ahora = () => Date.now();
export const dynamic = "force-dynamic";

// ?borrador=<id>: sigue un pedido sin enviar con lo que ya tiene subido (Oscar 2026-10-29).
export default async function Nuevo({ searchParams }) {
  const { borrador } = await searchParams;
  if (!borrador) return <NuevoPedido />;
  const { dentro, pedido: p, error } = await pedidoDeSesion(borrador, ahora());
  if (!dentro) return null;
  if (error) return <p className="adm-error">{error}</p>;
  if (p?.estado !== "subiendo")
    return (
      <div className="adm-tarjeta mt-10 flex flex-col items-center gap-4 p-6 text-center">
        <p>Ese borrador ya no existe o ya se envió.</p>
        <a href="/admin" className="adm-btn secundario">Volver a la lista</a>
      </div>
    );
  const meta = (a) => a && { nombre: a.nombre || "", duracion: a.duracion ?? null, ancho: a.ancho ?? null, alto: a.alto ?? null };
  const inicial = {
    id: p.id, tipo: tipoDe(p), story: destinoDe(p) === "story", link: p.link || "", titulo: p.titulo || "", estilo: p.estilo,
    tramos: p.tramos || [], original: meta(p.original), gancho: meta(p.gancho), publicado: meta(p.publicado),
    pantallazos: (p.pantallazos || []).map(({ pathname, tamano, nombre }) => ({ pathname, tamano, nombre: nombre || "" })),
  };
  return <NuevoPedido inicial={inicial} />;
}
