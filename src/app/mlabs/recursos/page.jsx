import { MlabsHeader, MlabsFooter } from "../MlabsMarco";
import Catalogo from "../componentes/Catalogo";
import { tarjetasGuias, publicos } from "../contenido/index.js";

export const metadata = {
  title: { absolute: "Guías gratis · MLABS by El Metacho" },
  description: "Prompts y guías paso a paso de los videos de Metacho Labs para usar la IA en tu marca.",
  alternates: { canonical: "https://mlabs.elmetacho.com/recursos" },
};

export default function Recursos() {
  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <h1 className="titular-ancho text-5xl sm:text-7xl">Guías y prompts gratis</h1>
        <p className="mt-4 text-lg leading-8 text-gris">Busca la palabra que comentaste en el video arriba o filtra por lo que te interesa.</p>
        <Catalogo guias={tarjetasGuias} publicos={publicos} />
      </div>
      <MlabsFooter />
    </main>
  );
}
