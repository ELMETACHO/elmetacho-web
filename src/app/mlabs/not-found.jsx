import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "./MlabsMarco";
import Buscador from "./componentes/Buscador";
import TarjetaContenido from "./componentes/TarjetaContenido";
import { contenidoGuias } from "./contenido/recursos.js";

// 404 de MLABS (guía, producto o público que no existe): buscador + guías destacadas.
export default async function NoEncontrado() {
  const { guias, indiceBusqueda } = await contenidoGuias();
  return (
    <main>
      <MlabsHeader />
      <div className="m-ancho m-post">
        <h1 style={{ marginTop: 0 }}>No encontramos esa página</h1>
        <p className="m-resumen" style={{ marginBottom: 16 }}>Escribe la palabra que comentaste en el video:</p>
        <Buscador indice={indiceBusqueda} id="buscar-404" />
        <div className="m-rejilla">
          {guias.slice(0, 4).map((g) => (
            <TarjetaContenido key={g.slug} guia={g} />
          ))}
        </div>
        <Link href="/recursos" className="m-boton m-boton-suave" style={{ marginTop: 20 }}>
          Ver todas las guías
        </Link>
      </div>
      <MlabsFooter />
    </main>
  );
}
