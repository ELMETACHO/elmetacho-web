import Link from "next/link";
import Portada, { COLOR_TIPO, ETIQUETA_TIPO } from "./Portada";

// Tarjeta de una guía en los listados: la palabra del reel como portada. Una sola acción: abrirla.
export default function TarjetaContenido({ guia: g }) {
  return (
    <Link href={`/recursos/${g.slug}`} className="m-tarjeta">
      <Portada palabra={g.palabra} chip={ETIQUETA_TIPO[g.tipo]} color={g.portada ?? COLOR_TIPO[g.tipo]} />
      <div className="m-tarjeta-cuerpo">
        <h3>{g.titulo}</h3>
        <p>{g.resumen}</p>
        <span className="m-meta">{g.tiempo} min · Gratis · Comenta {g.palabra}</span>
      </div>
    </Link>
  );
}
