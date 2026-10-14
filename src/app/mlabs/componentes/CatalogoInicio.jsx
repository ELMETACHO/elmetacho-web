import Link from "next/link";
import Buscador from "./Buscador";
import TarjetaContenido from "./TarjetaContenido";
import { guias, productos, publicos, novedadesRecientes, indiceBusqueda } from "../contenido/index.js";

// Parte de arriba del inicio de MLABS: buscador, accesos por público, guías destacadas, productos y novedades.
export default function CatalogoInicio() {
  const destacadas = [...guias].sort((a, b) => b.actualizado.localeCompare(a.actualizado)).slice(0, 4);
  return (
    <section className="papel-cuad px-4 pb-14 pt-40 sm:px-8 sm:pb-20 sm:pt-44">
      <div className="mx-auto max-w-5xl">
        <h1 className="titular-ancho text-5xl sm:text-7xl">Aprende a usar la IA en tu negocio</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-gris">
          Guías gratis de los videos de Metacho Labs. ¿Viste un video? Escribe la palabra que comentaste.
        </p>
        <div className="mt-6 max-w-2xl">
          <Buscador indice={indiceBusqueda} grande />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {publicos.map((p) => (
            <Link key={p.slug} href={`/para/${p.slug}`} className="rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-bold hover:bg-black hover:text-white">
              {p.nombre}
            </Link>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-black">Guías destacadas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {destacadas.map((g) => (
            <TarjetaContenido key={g.slug} guia={g} />
          ))}
        </div>
        <Link href="/recursos" className="mt-4 inline-block font-bold underline">
          Ver todas las guías →
        </Link>

        <h2 className="mt-12 text-2xl font-black">Productos</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {productos.map((p) => (
            <Link key={p.slug} href={`/productos/${p.slug}`} className="rounded-[1.25rem] bg-black p-5 text-white">
              <span className="text-xs font-bold uppercase tracking-widest text-rojo">{p.estado === "preventa" ? "Preventa" : "Disponible"}</span>
              <span className="mt-2 block text-lg font-black leading-6">{p.nombre}</span>
              <span className="mt-2 block text-sm leading-6 text-white/75">{p.promesa}</span>
            </Link>
          ))}
        </div>

        {novedadesRecientes.length > 0 && (
          <>
            <h2 className="mt-12 text-2xl font-black">Novedades de IA</h2>
            <ul className="mt-4 space-y-2">
              {novedadesRecientes.slice(0, 3).map((n) => (
                <li key={n.slug}>
                  <Link href={`/novedades#${n.slug}`} className="font-bold underline">
                    {n.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
