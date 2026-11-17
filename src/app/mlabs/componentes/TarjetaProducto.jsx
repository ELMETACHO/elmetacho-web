import Link from "next/link";
import Portada from "./Portada";

// Producto en el catálogo. Sin precio aprobado todavía: «Muy pronto» y «Apártalo» (deja un lead preventa-<slug>).
export default function TarjetaProducto({ producto: p }) {
  const href = `/productos/${p.slug}`;
  return (
    <article className="m-tarjeta">
      <Link href={href} tabIndex={-1} aria-hidden="true">
        <Portada palabra={p.palabraPortada ?? p.nombre} chip={p.etiqueta} color={p.portada ?? "tinta"} />
      </Link>
      <div className="m-tarjeta-cuerpo">
        <h3><Link href={href} style={{ color: "inherit", textDecoration: "none" }}>{p.nombre}</Link></h3>
        <p>{p.promesa}</p>
        <div className="m-compra">
          <div><b>Muy pronto</b><small>Te avisamos primero, con el precio</small></div>
          <Link href={`${href}#apartar`} className="m-boton m-boton-primario">Apártalo</Link>
        </div>
      </div>
    </article>
  );
}

// Versión corta al final de una guía: lleva al producto relacionado.
export function SiguientePaso({ producto: p }) {
  return (
    <Link href={`/productos/${p.slug}`} className="m-siguiente">
      <Portada palabra={p.palabraPortada ?? p.nombre} color={p.portada ?? "tinta"} />
      <div>
        <small>Si quieres montarlo tú</small>
        <b>{p.nombre}</b>
        <span>Muy pronto · Apártalo</span>
      </div>
    </Link>
  );
}
