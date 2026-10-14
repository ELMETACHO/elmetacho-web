import Link from "next/link";

// Tarjeta del producto relacionado al final de una guía. Una sola acción: ir a la página del producto.
export default function TarjetaProducto({ producto: p }) {
  return (
    <Link href={`/productos/${p.slug}`} className="mt-14 block rounded-[1.75rem] border-2 border-black bg-white p-6 transition hover:bg-black hover:text-white sm:p-8">
      <span className="text-xs font-bold uppercase tracking-[0.3em] text-rojo">{p.estado === "preventa" ? "Preventa" : "Producto"}</span>
      <span className="mt-2 block text-2xl font-black leading-tight sm:text-3xl">{p.nombre}</span>
      <span className="mt-2 block leading-7 opacity-80">{p.promesa}</span>
      <span className="mt-4 inline-block font-bold underline">{p.estado === "preventa" ? "Aparta tu cupo →" : "Ver producto →"}</span>
    </Link>
  );
}
