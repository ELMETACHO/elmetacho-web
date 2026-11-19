import Link from "next/link";
import { MLABS_WHATSAPP } from "./enlaces.js";

// Marco común de MLABS (mlabs.elmetacho.com). Los enlaces internos son relativos a la raíz del subdominio
// ("/", "/recursos"), que next.config.mjs reescribe a /mlabs/… cuando el host es mlabs.*
export { MLABS_WHATSAPP, MLABS_MAILTO } from "./enlaces.js";

export function MlabsHeader() {
  return (
    <header className="m-barra">
      <div className="m-ancho">
        <Link href="/" className="m-marca" aria-label="MLABS, inicio">MLABS</Link>
        <nav aria-label="Principal">
          <Link href="/#guias" className="m-solo-ancho">Guías gratis</Link>
          <Link href="/#productos" className="m-solo-ancho">Productos</Link>
          <Link href="/recursos" className="m-icono" aria-label="Buscar una guía por su palabra">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
          <details className="m-menu">
            <summary className="m-icono" aria-label="Menú">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </summary>
            <ul>
              <li><Link href="/recursos">Guías gratis</Link></li>
              <li><Link href="/#productos">Productos</Link></li>
              <li><Link href="/ahorra">AHORRA: tu PDF a texto para Claude</Link></li>
              <li><Link href="/novedades">Novedades de IA</Link></li>
              <li><Link href="/automatizar">Responde comentarios por DM</Link></li>
              <li><Link href="/#contacto">Que lo montemos por ti</Link></li>
              <li><a href={MLABS_WHATSAPP}>Escríbenos por WhatsApp</a></li>
            </ul>
          </details>
        </nav>
      </div>
    </header>
  );
}

export function MlabsFooter() {
  return (
    <footer className="m-pie">
      <div className="m-ancho">
        <p className="m-marca">MLABS</p>
        <p style={{ marginTop: 8, maxWidth: "52ch" }}>
          Metacho LABS, de El Metacho. Operado por EL METACHO S.A.S., NIT 901.938.947-4, Bogotá D.C., Colombia.
        </p>
        <nav aria-label="Pie de página">
          <Link href="/recursos">Guías gratis</Link>
          <Link href="/novedades">Novedades</Link>
          <Link href="/automatizar">Automatizar DMs</Link>
          <Link href="/terminos">Términos</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/eliminar-datos">Eliminar mis datos</Link>
          <a href="https://www.elmetacho.com">elmetacho.com</a>
          <span>© {new Date().getFullYear()}</span>
        </nav>
      </div>
    </footer>
  );
}
