import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "./MlabsMarco";
import Buscador from "./componentes/Buscador";
import TarjetaContenido from "./componentes/TarjetaContenido";
import { guias, indiceBusqueda } from "./contenido/index.js";

// 404 de MLABS (guía, producto o público que no existe): buscador + guías destacadas.
export default function NoEncontrado() {
  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <h1 className="titular-ancho text-4xl sm:text-6xl">No encontramos esa página</h1>
        <p className="mt-4 text-lg leading-8 text-gris">Escribe la palabra que comentaste en el video:</p>
        <div className="mt-6">
          <Buscador indice={indiceBusqueda} grande />
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {guias.slice(0, 4).map((g) => (
            <TarjetaContenido key={g.slug} guia={g} />
          ))}
        </div>
        <Link href="/recursos" className="mt-6 inline-block font-bold underline">
          Ver todas las guías →
        </Link>
      </div>
      <MlabsFooter />
    </main>
  );
}
