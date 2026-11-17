import Link from "next/link";
import { MlabsHeader, MlabsFooter, MLABS_WHATSAPP } from "../MlabsMarco";

// Política de retracto de la tienda de MLABS. Antes de cobrar en real (MLABS_TIENDA=real) Oscar revisa este texto
// con el de la Ley 1480 de 2011 (arts. 47 y 51): no se pudo leer la fuente oficial al escribirlo (2026-11-16).
export const metadata = {
  title: { absolute: "Retracto y devoluciones · MLABS" },
  description: "Cómo pedir la devolución de una compra en la tienda de MLABS.",
  alternates: { canonical: "https://mlabs.elmetacho.com/retracto" },
};

export default function Retracto() {
  return (
    <main>
      <MlabsHeader />
      <article className="m-post m-lectura">
        <p className="m-migas"><Link href="/">MLABS</Link> / Retracto y devoluciones</p>
        <h1 style={{ marginTop: 0 }}>Retracto y devoluciones</h1>
        <p className="m-resumen">Si compraste en la tienda de MLABS y te arrepentiste, te devolvemos el dinero. Así funciona.</p>
        <div className="m-cuerpo">
          <section>
            <h2>Tu derecho de retracto</h2>
            <p>
              Las compras en mlabs.elmetacho.com son ventas a distancia. Según el Estatuto del Consumidor (Ley 1480 de 2011), puedes
              retractarte dentro de los <strong>cinco (5) días hábiles</strong> siguientes a la compra.
            </p>
          </section>
          <section>
            <h2>Cómo pedirlo</h2>
            <ul>
              <li>Escríbenos por <a href={MLABS_WHATSAPP}>WhatsApp</a> o a <a href="mailto:contacto@elmetacho.com">contacto@elmetacho.com</a>.</li>
              <li>Incluye tu número de pedido (empieza por MLABS-T) y el correo con el que compraste.</li>
              <li>No tienes que explicar por qué.</li>
            </ul>
          </section>
          <section>
            <h2>Cuándo te devolvemos el dinero</h2>
            <p>
              Te confirmamos por escrito y hacemos la devolución por el mismo medio de pago, a través de Bold, dentro de los cinco (5) días
              hábiles siguientes a tu solicitud. Lo que tarde en verse en tu cuenta depende de tu banco o tarjeta.
            </p>
            <p>Al pedir el retracto, el link de descarga de tu pedido deja de funcionar.</p>
          </section>
          <section>
            <h2>Reversión del pago</h2>
            <p>
              Si pagaste con tarjeta o por un medio electrónico y fuiste víctima de fraude, la compra no fue solicitada o no recibiste el
              producto, también puedes pedirle la reversión del pago a tu banco, como lo prevé la Ley 1480 de 2011.
            </p>
          </section>
          <section>
            <h2>Quién vende</h2>
            <p>EL METACHO S.A.S., NIT 901.938.947-4, Bogotá D.C., Colombia. Los pagos los procesa Bold.</p>
          </section>
        </div>
      </article>
      <MlabsFooter />
    </main>
  );
}
