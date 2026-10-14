import Link from "next/link";
import Buscador from "./componentes/Buscador";
import { indiceBusqueda } from "./contenido/index.js";

// Marco común de MLABS (mlabs.elmetacho.com). Los enlaces internos son relativos a la raíz del subdominio
// ("/", "/recursos"), que next.config.mjs reescribe a /mlabs/… cuando el host es mlabs.*
export { MLABS_WHATSAPP, MLABS_MAILTO } from "./enlaces.js";

export function MlabsHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-white/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
        <Link href="/" className="titular-ancho text-2xl">
          MLABS
        </Link>
        <div className="flex items-center gap-1 sm:gap-4">
          <Link href="/recursos" className="rounded-full px-3 py-2 text-sm font-semibold hover:text-rojo">
            Guías gratis
          </Link>
          <Link href="/novedades" className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:text-rojo sm:inline">
            Novedades
          </Link>
          <Link href="/#contacto" className="rounded-full bg-rojo px-4 py-2.5 text-sm font-bold text-white">
            Cotizar
          </Link>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-8">
        <Buscador indice={indiceBusqueda} />
      </div>
    </header>
  );
}

export function MlabsFooter() {
  return (
    <footer className="border-t border-black/10 px-4 py-10 text-sm text-gris sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="titular-ancho text-3xl text-black">MLABS</p>
          <p className="mt-2 max-w-md leading-6">La agencia de El Metacho. Operada por EL METACHO S.A.S., NIT 901.938.947-4, Bogotá D.C., Colombia.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href="https://www.elmetacho.com" className="hover:text-rojo">elmetacho.com</a>
          <a href="https://www.elmetacho.com/fidelizacion" className="hover:text-rojo">Fidelización</a>
          <a href="https://www.elmetacho.com/privacidad" className="hover:text-rojo">Política de Privacidad</a>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
