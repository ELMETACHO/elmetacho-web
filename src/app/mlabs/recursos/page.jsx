import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../MlabsMarco";
import Buscador from "../componentes/Buscador";
import TarjetaCurso from "../componentes/TarjetaCurso";
import { contenidoGuias } from "../contenido/recursos.js";
import { vistaRecurso } from "../contenido/academia.js";

export const revalidate = 300;

export const metadata = {
  title: { absolute: "Recursos gratis · MetachoLABS" },
  description: "Guías cortas y gratis para usar Claude, ChatGPT, Gemini y más en tu contenido y tu negocio.",
  alternates: { canonical: "https://mlabs.elmetacho.com/recursos" },
};

export default async function Recursos() {
  const { guias, indiceBusqueda } = await contenidoGuias();
  return (
    <main>
      <MlabsHeader />
      <section className="l-seccion">
        <div className="l-ancho">
          <p className="l-migas"><Link href="/">Inicio</Link> / Recursos gratis</p>
          <div className="l-cabeza" style={{ marginTop: 10 }}>
            <div>
              <h2>Recursos gratis</h2>
              <p>{guias.length} guías cortas. ¿Viste un reel? Escribe la palabra que comentaste.</p>
            </div>
          </div>
          <div style={{ maxWidth: 560, marginBottom: 24 }}>
            <Buscador indice={indiceBusqueda} id="buscar-recursos" />
          </div>
          <div className="l-rejilla">
            {guias.map((g, i) => (
              <TarjetaCurso
                key={g.slug}
                href={`/recursos/${g.slug}`}
                vista={vistaRecurso(g, i)}
                titulo={g.titulo}
                resumen={g.resumen}
                chips={[{ texto: "Gratis", clase: "l-chip-verde" }, { texto: `${g.tiempo} min` }]}
                precio="Gratis"
                nota="Con tu correo"
                boton="Ver"
              />
            ))}
          </div>
        </div>
      </section>
      <MlabsFooter />
    </main>
  );
}
