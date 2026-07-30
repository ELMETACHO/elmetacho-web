import "./globals.css";

export const metadata = {
  title: "El Metacho | Home",
  description:
    "El Metacho - Creador de contenido y METACHO LABS, agencia de producción y community management en Colombia.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full scroll-smooth antialiased">
      <body className="min-h-full bg-[#faf3e9] text-stone-900">{children}</body>
    </html>
  );
}
