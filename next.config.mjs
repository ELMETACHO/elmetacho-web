// mlabs.elmetacho.com (y mlabs.localhost en desarrollo) muestra las páginas de src/app/mlabs:
// "/" → /mlabs, "/recursos/…" → /mlabs/recursos/…; los archivos de Next e imágenes no se tocan.
// Rama «pruebas»: también responde en pruebas.elmetacho.com y en la URL de la rama en Vercel (…-git-pruebas-…).
const MLABS_HOST = [{ type: "host", value: "(mlabs\\..*|pruebas\\..*|.*-git-pruebas-.*)" }];

const nextConfig = {
  // El «Editor automático» pasó a ser el Kit Edita con Claude (2026-11-16): los links viejos de los DMs siguen sirviendo.
  async redirects() {
    return [
      { source: "/productos/editor-automatico", has: MLABS_HOST, destination: "/productos/edita-con-claude", permanent: true },
      { source: "/mlabs/productos/editor-automatico", destination: "/mlabs/productos/edita-con-claude", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", has: MLABS_HOST, destination: "/mlabs" },
        { source: "/:path((?!_next|mlabs|api|images|videos|marca|icon\\.svg|favicon\\.ico|apple-icon).*)", has: MLABS_HOST, destination: "/mlabs/:path" },
      ],
    };
  },
};

export default nextConfig;
