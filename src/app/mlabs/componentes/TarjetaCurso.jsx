import Link from "next/link";
import Tapa from "./Tapa";
import { AUTOR } from "../contenido/academia.js";

// Tarjeta de curso o recurso, igual para los de pago y los gratis: portada grande, etiquetas, título, autor y precio.
export default function TarjetaCurso({ href, vista, titulo, resumen, chips = [], precio, nota, boton }) {
  return (
    <Link href={href} className="l-curso">
      <Tapa foto={vista.foto} titulo={vista.tapa} kicker={vista.categoria} tono={vista.tono} />
      <div className="l-curso-cuerpo">
        <div className="l-chips">
          {chips.map((c) => (
            <span key={c.texto} className={`l-chip ${c.clase ?? ""}`}>{c.texto}</span>
          ))}
        </div>
        <h3>{titulo}</h3>
        {resumen && <p>{resumen}</p>}
        <div className="l-autor">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AUTOR.foto} alt="" loading="lazy" />
          {AUTOR.nombre}
        </div>
        <div className="l-precio">
          <div><b>{precio}</b>{nota && <small>{nota}</small>}</div>
          <span className="l-btn l-btn-rojo">{boton}</span>
        </div>
      </div>
    </Link>
  );
}
