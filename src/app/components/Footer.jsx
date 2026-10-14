import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-linea px-4 py-10 text-sm text-gris sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-cartel text-3xl uppercase text-black">El Metacho</p>
          <p className="mt-2 max-w-md leading-6">
            El Metacho y MLABS son operados por EL METACHO S.A.S., NIT 901.938.947-4, Bogotá D.C., Colombia.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href="https://mlabs.elmetacho.com" className="hover:text-rojo">MLABS</a>
          <Link href="/fidelizacion" className="hover:text-rojo">Fidelización</Link>
          <Link href="/privacidad" className="hover:text-rojo">Política de Privacidad</Link>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
