// Portada de curso: tu foto en blanco y negro a la derecha y un título enorme a la izquierda (estilo portada de curso).
// En `titulo`, lo que va entre *asteriscos* sale en el color de acento.
export default function Tapa({ foto, titulo, kicker, tono = "negro", className = "", prioridad = false }) {
  const partes = String(titulo).split(/\*(.+?)\*/g);
  return (
    <div className={`l-tapa ${tono === "rojo" ? "l-tapa-rojo" : ""} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto} alt="" loading={prioridad ? "eager" : "lazy"} decoding="async" />
      <div className="l-tapa-texto">
        {kicker && <span className="l-tapa-kicker">{kicker}</span>}
        <p className={`l-tapa-titulo ${String(titulo).replace(/\*/g, "").length > 22 ? "l-tapa-largo" : ""}`}>{partes.map((p, i) => (i % 2 ? <em key={i}>{p}</em> : p))}</p>
      </div>
      <span className="l-tapa-marca">metacho<b>labs</b></span>
    </div>
  );
}
