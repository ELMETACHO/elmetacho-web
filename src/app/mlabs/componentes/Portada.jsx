// Portada tipográfica: la palabra que se comenta en el reel, gigante, ajustada al ancho con unidades de contenedor.
export const COLOR_TIPO = { guia: "rojo", prompt: "tinta", "mini-curso": "azul" };
export const ETIQUETA_TIPO = { guia: "Guía", prompt: "Prompt", "mini-curso": "Mini curso" };

export default function Portada({ palabra, chip, color = "rojo", className = "", children }) {
  return (
    <div className={`m-portada m-portada-${color} ${className}`}>
      {chip ? <span className="m-chip">{chip}</span> : <span />}
      {children}
      <span className="m-palabra" style={{ "--largo": Math.max(4, [...palabra].length) }} aria-hidden="true">
        {palabra}
      </span>
    </div>
  );
}
