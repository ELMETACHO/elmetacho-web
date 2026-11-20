import { AUTOR } from "../contenido/academia.js";

// «Tu instructor»: el mismo bloque en cursos y recursos gratis.
export default function Instructor() {
  return (
    <section className="l-bloque">
      <h2>Tu instructor</h2>
      <div className="l-autor" style={{ fontSize: 16, marginBottom: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AUTOR.foto} alt="" style={{ width: 48, height: 48 }} />
        <div><b style={{ display: "block", color: "#0b0b0b" }}>Oscar · El Metacho</b><span style={{ color: "var(--m-rojo)", fontSize: 14 }}>Creador de MetachoLABS</span></div>
      </div>
      <p style={{ margin: 0, color: "var(--m-gris)", fontSize: 15.5 }}>
        Hago contenido hace 10 años y tengo +4 M de seguidores entre Facebook e Instagram. Lo que enseño aquí es lo que uso todos los días en mis cuentas y mis negocios.
      </p>
    </section>
  );
}
