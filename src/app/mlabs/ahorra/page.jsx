import { cookies, headers } from "next/headers";
import { MlabsHeader, MlabsFooter } from "../MlabsMarco";
import Portada from "../componentes/Portada";
import Ahorra from "../componentes/Ahorra";
import { COOKIE, carpeta, leerSesion, saldoDe } from "../lib/ahorra/creditos.js";
import { secreto } from "../lib/ahorra/servidor.js";
import { conRedis } from "../../admin/lib/instagram/conexion.js";
import { AHORRA } from "../contenido/ahorra.js";
import { productoPorSlug } from "../contenido/index.js";
import { formatoMoneda, modoTienda, monedaPara, sePuedeComprar, COOKIE_MONEDA } from "../lib/tienda/tienda.js";

export const dynamic = "force-dynamic";
export const metadata = {
  title: { absolute: `${AHORRA.nombre}: tu PDF a texto limpio para Claude · MLABS` },
  description: `${AHORRA.frase}. PDF, Word, Excel, PowerPoint o HTML a Markdown limpio. 3 archivos gratis.`,
  alternates: { canonical: "https://mlabs.elmetacho.com/ahorra" },
};

const preguntas = [
  { q: "¿Por qué gasto menos tokens?", a: "Cuando le pasas un PDF a Claude, cada página cuenta dos veces: el texto y una imagen de la página. Con texto limpio solo cuenta el texto, sin la imagen ni el formato." },
  { q: "¿Qué pasa con mi archivo?", a: "Se sube a un almacenamiento privado, se convierte y se borra en ese mismo momento. No guardamos el contenido: solo tu correo y cuántos archivos llevas." },
  { q: "¿Sirve con PDF escaneados?", a: "No. Un escaneado es una foto de cada página; sin OCR no hay texto que sacar. Te avisamos cuando pase." },
  { q: "¿Es MarkItDown de Microsoft?", a: "No. Hace lo mismo que enseñamos en el video con MarkItDown (licencia MIT), pero con otras librerías, para que no tengas que instalar nada. No tenemos relación con Microsoft." },
  { q: "¿Y si se me acaban los 3 gratis?", a: "Hay un paquete de 50 archivos por $14.900 COP (US$4), pago único y sin vencimiento. Cada archivo cuenta 1, de hasta 20 MB y 300 páginas. Los PDF escaneados no se cobran." },
  { q: "¿Usan IA para convertir?", a: "No. La conversión saca el texto que ya tiene el archivo, sin modelos de IA ni OCR. Por eso es rápida y barata." },
];

export default async function Pagina() {
  const correo = leerSesion((await cookies()).get(COOKIE)?.value ?? "", secreto());
  const saldo = correo ? await conRedis((r) => saldoDe(r, correo)).catch(() => 0) : 0;
  const p = productoPorSlug(AHORRA.paquete);
  const modo = modoTienda(process.env);
  const comprable = sePuedeComprar(p, modo);
  const paquete = {
    slug: p.slug, archivos: p.creditos, precios: p.precios, comprable, prueba: modo === "pruebas",
    textoPrecio: `${formatoMoneda(p.precios.COP, "COP")} (${formatoMoneda(p.precios.USD, "USD")})`,
    moneda: comprable ? monedaPara({ cookie: (await cookies()).get(COOKIE_MONEDA)?.value, pais: (await headers()).get("x-vercel-ip-country") }) : "COP",
  };

  return (
    <main>
      <MlabsHeader />
      <article className="m-post m-lectura">
        <p className="m-migas">Herramientas / {AHORRA.nombre}</p>
        <Portada palabra={AHORRA.nombre.toUpperCase()} chip="3 archivos gratis" color="rojo" />
        <h1>Pásale a Claude texto, no PDF</h1>
        <p className="m-resumen">{AHORRA.frase}. Sube tu archivo y te devolvemos el texto limpio en Markdown, listo para pegar.</p>
        <div style={{ marginTop: 20 }}>
          <Ahorra sesionInicial={correo} saldoInicial={saldo} carpeta={correo ? carpeta(correo) : null} paquete={paquete} />
        </div>
        <div className="m-cuerpo">
          <section>
            <h2>Cómo funciona</h2>
            <ul>
              <li>Escribe tu correo: tienes 3 archivos gratis.</li>
              <li>Sube un PDF, Word, Excel, PowerPoint o HTML de hasta 20 MB.</li>
              <li>Copia el texto o descárgalo como .md y pégalo en Claude.</li>
              <li>¿Quieres más? 50 archivos por $14.900 COP (US$4), pago único.</li>
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
