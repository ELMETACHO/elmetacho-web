import { cookies } from "next/headers";
import { MlabsHeader, MlabsFooter } from "../MlabsMarco";
import Portada from "../componentes/Portada";
import Ahorra from "../componentes/Ahorra";
import { COOKIE, carpeta, leerSesion, saldoDe } from "../lib/ahorra/creditos.js";
import { secreto } from "../lib/ahorra/servidor.js";
import { conRedis } from "../../admin/lib/instagram/conexion.js";

export const dynamic = "force-dynamic";
export const metadata = {
  title: { absolute: "AHORRA: tu PDF a texto limpio para Claude · MLABS" },
  description: "Convierte PDF, Word, Excel, PowerPoint o HTML a Markdown limpio y gasta menos tokens en Claude. 3 archivos gratis.",
  alternates: { canonical: "https://mlabs.elmetacho.com/ahorra" },
};

const preguntas = [
  { q: "¿Por qué gasto menos tokens?", a: "Cuando le pasas un PDF a Claude, cada página cuenta dos veces: el texto y una imagen de la página. Con texto limpio solo cuenta el texto, sin la imagen ni el formato." },
  { q: "¿Qué pasa con mi archivo?", a: "Se sube a un almacenamiento privado, se convierte y se borra en ese mismo momento. No guardamos el contenido: solo tu correo y cuántos archivos llevas." },
  { q: "¿Sirve con PDF escaneados?", a: "No. Un escaneado es una foto de cada página; sin OCR no hay texto que sacar. Te avisamos cuando pase." },
  { q: "¿Es MarkItDown de Microsoft?", a: "No. Hace lo mismo que enseñamos en el video con MarkItDown (licencia MIT), pero con otras librerías, para que no tengas que instalar nada. No tenemos relación con Microsoft." },
  { q: "¿Y si se me acaban los 3 gratis?", a: "Vamos a abrir paquetes de pago único, sin suscripción. Déjanos tu WhatsApp y te avisamos primero." },
];

export default async function Pagina() {
  const correo = leerSesion((await cookies()).get(COOKIE)?.value ?? "", secreto());
  const saldo = correo ? await conRedis((r) => saldoDe(r, correo)).catch(() => 0) : 0;

  return (
    <main>
      <MlabsHeader />
      <article className="m-post m-lectura">
        <p className="m-migas">Herramientas / AHORRA</p>
        <Portada palabra="AHORRA" chip="Herramienta gratis" color="rojo" />
        <h1>Pásale a Claude texto, no PDF</h1>
        <p className="m-resumen">Sube tu archivo y te devolvemos el texto limpio en Markdown, listo para pegar. Gastas menos tokens y Claude lo lee mejor.</p>
        <div style={{ marginTop: 20 }}>
          <Ahorra sesionInicial={correo} saldoInicial={saldo} carpeta={correo ? carpeta(correo) : null} />
        </div>
        <div className="m-cuerpo">
          <section>
            <h2>Cómo funciona</h2>
            <ul>
              <li>Escribe tu correo: tienes 3 archivos gratis.</li>
              <li>Sube un PDF, Word, Excel, PowerPoint o HTML de hasta 20 MB.</li>
              <li>Copia el texto o descárgalo como .md y pégalo en Claude.</li>
            </ul>
          </section>
          <section className="m-faq">
            <h2>Preguntas</h2>
            {preguntas.map((p) => (
              <details key={p.q}><summary>{p.q}</summary><p>{p.a}</p></details>
            ))}
          </section>
        </div>
      </article>
      <MlabsFooter />
    </main>
  );
}
