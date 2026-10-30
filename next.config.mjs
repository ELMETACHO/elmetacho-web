// mlabs.elmetacho.com (y mlabs.localhost en desarrollo) muestra las páginas de src/app/mlabs:
// "/" → /mlabs, "/recursos/…" → /mlabs/recursos/…; los archivos de Next e imágenes no se tocan.
const MLABS_HOST = [{ type: "host", value: "mlabs\\..*" }];

const nextConfig = {
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
