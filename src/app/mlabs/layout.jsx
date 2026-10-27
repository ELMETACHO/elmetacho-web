// Metadatos por defecto de mlabs.elmetacho.com: sin esto, las páginas que no traen su propio openGraph heredan el de
// El Metacho (título, foto y og:url de www.elmetacho.com) y la tarjeta del link sale como El Metacho, p. ej. en los DM
// de Instagram. Next reemplaza openGraph completo, así que aquí va la marca MLABS y cada página puede pisarlo.
const description =
  "MLABS, la agencia de El Metacho: videos con IA, edición, mensajes automáticos y fidelización para tu marca.";

export const metadata = {
  alternates: { canonical: null },   // la de la portada de El Metacho no aplica; cada página pone la suya
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "MLABS by El Metacho",   // sin title: Next usa el título de cada página
    description,
    images: [{ url: "https://mlabs.elmetacho.com/videos/gps.jpg", width: 540, height: 960, alt: "MLABS by El Metacho" }],
  },
  twitter: { card: "summary_large_image", description, images: ["https://mlabs.elmetacho.com/videos/gps.jpg"] },
};

export default function MlabsLayout({ children }) {
  return children;
}
