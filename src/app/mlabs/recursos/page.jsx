import { MlabsHeader, MlabsFooter } from "../MlabsMarco";
import Catalogo from "../componentes/Catalogo";
import Buscador from "../componentes/Buscador";
import { publicos } from "../contenido/index.js";
import { contenidoGuias } from "../contenido/recursos.js";

export const revalidate = 300;

export const metadata = {
  title: { absolute: "Guías gratis · MLABS by El Metacho" },
  description: "Prompts y guías paso a paso de los videos de Metacho Labs para usar la IA en tu marca.",
  alternates: { canonical: "https://mlabs.elmetacho.com/recursos" },
  openGraph: {
    type: "website", locale: "es_CO", siteName: "MLABS by El Metacho", url: "https://mlabs.elmetacho.com/recursos",
    title: "Guías gratis · MLABS by El Metacho",
    description: "Prompts y guías paso a paso de los videos de Metacho Labs para usar la IA en tu marca.",
    images: [{ url: "https://mlabs.elmetacho.com/videos/gps.jpg", width: 540, height: 960 }],
  },
};

export default async function Recursos() {
  const { tarjetasGuias, indiceBusqueda } = await contenidoGuias();
  return (
    <main>
      <MlabsHeader />
      <div className="m-ancho m-post">
        <h1 style={{ marginTop: 0 }}>Guías gratis</h1>
        <p className="m-resumen" style={{ marginBottom: 16 }}>Escribe la palabra que comentaste en el reel o filtra por lo que te interesa.</p>
        <Buscador indice={indiceBusqueda} id="buscar-recursos" />
        <Catalogo guias={tarjetasGuias} publicos={publicos} />
      </div>
      <MlabsFooter />
    </main>
  );
}
