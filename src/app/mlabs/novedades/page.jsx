import { MlabsHeader, MlabsFooter } from "../MlabsMarco";
import EdicionNovedades from "../componentes/EdicionNovedades";
import { edicionesRecientes } from "../contenido/index.js";

// /novedades muestra siempre la edición más reciente (la URL del DM de NOVEDADES no cambia nunca).
export const metadata = {
  title: { absolute: "Novedades de IA de la semana · MLABS by El Metacho" },
  description: "Lo nuevo en IA que de verdad le sirve a tu negocio, explicado corto y con la fuente oficial. Edición nueva cada semana.",
  alternates: { canonical: "https://mlabs.elmetacho.com/novedades" },
};

export default function Novedades() {
  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <EdicionNovedades edicion={edicionesRecientes[0]} />
      <MlabsFooter />
    </main>
  );
}
