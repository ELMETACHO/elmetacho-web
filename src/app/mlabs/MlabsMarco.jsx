import Link from "next/link";
import { MLABS_WHATSAPP } from "./enlaces.js";

// Marco común de MetachoLABS (rediseño «academia», rama pruebas): oferta arriba, menú blanco fijo y pie oscuro.
// Los enlaces internos son relativos a la raíz del subdominio ("/", "/recursos"), que next.config.mjs reescribe a /mlabs/…
export { MLABS_WHATSAPP, MLABS_MAILTO } from "./enlaces.js";

export function MlabsHeader() {
  return (
    <>
      <div className="l-oferta">
        <div className="l-ancho">
          <p><span className="l-insignia">NUEVO</span><b>Ahorra:</b> tus PDF a texto para Claude, ChatGPT, Gemini y más. 3 archivos gratis.</p>
          <Link href="/ahorra" className="l-oferta-btn">Probar</Link>
        </div>
      </div>
      <header className="l-nav">
        <div className="l-ancho">
          <Link href="/" className="l-logo" aria-label="MetachoLABS, inicio">metacho<b>labs</b></Link>
          <nav aria-label="Principal" className="l-solo-ancho">
            <Link href="/#cursos">Cursos</Link>
            <Link href="/#gratis">Recursos gratis</Link>
            <Link href="/ahorra">Ahorra</Link>
          </nav>
          <div className="l-nav-der">
            <Link href="/#gratis" className="l-btn l-btn-suave l-solo-movil" style={{ minHeight: 40, padding: "0 14px", fontSize: 14 }}>Gratis</Link>
            <a href={MLABS_WHATSAPP} className="l-btn l-btn-rojo" style={{ minHeight: 40, padding: "0 16px", fontSize: 14.5 }}>Escríbenos</a>
          </div>
        </div>
      </header>
    </>
  );
}

export function MlabsFooter() {
  return (
    <footer className="l-pie">
      <div className="l-ancho">
        <div className="l-cols">
          <div>
            <Link href="/" className="l-logo">metacho<b style={{ color: "#ff4a55" }}>labs</b></Link>
            <p style={{ margin: 0, maxWidth: "40ch" }}>Cursos, herramientas y recursos gratis para usar Claude, ChatGPT, Gemini y más en tu contenido y tu negocio.</p>
          </div>
          <div>
            <h4>Aprende</h4>
            <Link href="/#cursos">Cursos</Link>
            <Link href="/#gratis">Recursos gratis</Link>
            <Link href="/ahorra">Ahorra</Link>
            <Link href="/novedades">Novedades</Link>
          </div>
          <div>
            <h4>Compañía</h4>
            <Link href="/automatizar">Automatizar DMs</Link>
            <Link href="/terminos">Términos</Link>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/retracto">Retracto</Link>
            <Link href="/eliminar-datos">Eliminar mis datos</Link>
          </div>
        </div>
        <p className="l-legal">© {new Date().getFullYear()} MetachoLABS · EL METACHO S.A.S., NIT 901.938.947-4, Bogotá D.C., Colombia</p>
      </div>
    </footer>
  );
}
