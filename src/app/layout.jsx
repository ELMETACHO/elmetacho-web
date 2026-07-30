import "./globals.css";

const siteUrl = "https://elmetacho.com";
const description =
  "El Metacho: creador de contenido colombiano con +6M de seguidores, experto en comentarios cantados y sketch de comedia. Dueño de METACHO LABS, agencia de marketing digital y producción de contenido con IA.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "El Metacho | Creador de Contenido, Influencer y Agencia de Marketing Digital",
    template: "%s | El Metacho",
  },
  description,
  keywords: [
    "El Metacho",
    "comentarios cantados",
    "sketch de comedia",
    "creador de contenido Colombia",
    "influencer marketing",
    "agencia de marketing digital",
    "producción de contenido con IA",
    "METACHO LABS",
  ],
  authors: [{ name: "El Metacho" }],
  creator: "El Metacho",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: siteUrl,
    siteName: "El Metacho",
    title: "El Metacho | Creador de Contenido, Influencer y Agencia de Marketing Digital",
    description,
    images: [
      {
        url: "/images/foto1.png",
        width: 1200,
        height: 1500,
        alt: "El Metacho - creador de contenido",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "El Metacho | Creador de Contenido, Influencer y Agencia de Marketing Digital",
    description,
    images: ["/images/foto1.png"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full scroll-smooth antialiased">
      <body className="min-h-full bg-[#faf3e9] text-stone-900">{children}</body>
    </html>
  );
}
