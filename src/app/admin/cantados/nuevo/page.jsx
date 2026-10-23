import NuevoPedido from "./NuevoPedido.jsx";

export const dynamic = "force-dynamic";

export default async function Nuevo({ searchParams }) {
  const { destino } = await searchParams;
  return <NuevoPedido destino={destino === "story" ? "story" : "reel"} />;
}
