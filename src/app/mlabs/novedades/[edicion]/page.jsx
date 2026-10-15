import { notFound } from "next/navigation";
import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import EdicionNovedades from "../../componentes/EdicionNovedades";
import { ediciones, edicionPorSlug, edicionesRecientes } from "../../contenido/index.js";

// Archivo de ediciones: /novedades/AAAA-MM-DD. La edición más reciente apunta su canonical a /novedades.
export const dynamicParams = false;

export function generateStaticParams() {
  return ediciones.map((e) => ({ edicion: e.slug }));
}

export async function generateMetadata({ params }) {
  const { edicion } = await params;
  const e = edicionPorSlug(edicion);
  if (!e) return {};
  const actual = edicionesRecientes[0]?.slug === e.slug;
  return {
    title: { absolute: `Novedades de IA · ${e.titulo} · MLABS by El Metacho` },
    description: e.intro,
    alternates: { canonical: actual ? "https://mlabs.elmetacho.com/novedades" : `https://mlabs.elmetacho.com/novedades/${e.slug}` },
  };
}

export default async function EdicionArchivo({ params }) {
  const { edicion } = await params;
  const e = edicionPorSlug(edicion);
  if (!e) notFound();
  return (
    <main className="min-h-screen bg-white text-stone-950">
      <MlabsHeader />
      <EdicionNovedades edicion={e} />
      <MlabsFooter />
    </main>
  );
}
