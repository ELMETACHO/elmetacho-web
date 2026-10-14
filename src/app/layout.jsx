import { Anton, Archivo } from "next/font/google";
import "./globals.css";

// Anton = carteles de El Metacho; Archivo (con eje de ancho) = textos y titulares expandidos de MLABS
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

const siteUrl = "https://www.elmetacho.com";
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
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`h-full scroll-smooth antialiased ${anton.variable} ${archivo.variable}`}>
      <body className="min-h-full bg-white font-[family-name:var(--font-archivo)] text-black">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.elmetacho.com/#org",
                  name: "EL METACHO S.A.S.",
                  url: "https://www.elmetacho.com",
                  email: "contacto@elmetacho.com",
                  telephone: "+57 320 264 6716",
                  taxID: "901.938.947-4",
                  address: { "@type": "PostalAddress", addressLocality: "Bogotá D.C.", addressCountry: "CO" },
                  brand: [{ "@type": "Brand", name: "El Metacho" }, { "@type": "Brand", name: "MLABS" }],
                },
                { "@type": "Person", "@id": "https://www.elmetacho.com/#metacho", name: "El Metacho", url: "https://www.elmetacho.com", jobTitle: "Creador de contenido", worksFor: { "@id": "https://www.elmetacho.com/#org" } },
              ],
            }),
          }}
        />
      </body>
    </html>
  );
}
