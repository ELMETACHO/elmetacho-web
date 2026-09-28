import Link from "next/link";
import Footer from "../components/Footer";

export const metadata = {
  title: "Política de Privacidad",
  description:
    "Política de Privacidad de EL METACHO S.A.S.: tratamiento de datos personales conforme a la Ley 1581 de 2012 (Habeas Data, Colombia).",
  alternates: {
    canonical: "https://elmetacho.com/privacidad",
  },
};

function Section({ title, children }) {
  return (
    <section className="border-t border-stone-900/10 py-10">
      <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      <div className="mt-6 space-y-5 text-base leading-8 text-stone-600">{children}</div>
    </section>
  );
}

function List({ items }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-4">
          <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-[#f4634a]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Privacidad() {
  return (
    <main className="relative min-h-screen bg-[#faf3e9] text-stone-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(244,99,74,0.12),_transparent_35%)] blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="text-lg font-black tracking-tight text-stone-900">
          El <span className="text-[#f4634a]">Metacho</span>
        </Link>
        <Link
          href="/"
          className="text-sm font-medium uppercase tracking-[0.15em] text-stone-600 transition hover:text-[#f4634a]"
        >
          Volver al inicio
        </Link>
      </header>

      <div className="relative mx-auto max-w-3xl px-6 sm:px-8 lg:px-12">
        <article className="py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#f4634a]">Legal</p>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            Política de Privacidad — EL METACHO S.A.S.
          </h1>
          <p className="mt-6 text-sm text-stone-500">Última actualización: 28 de septiembre de 2026</p>

          <div className="mt-12">
            <Section title="1. Responsable del tratamiento">
              <p>
                <strong className="text-stone-900">EL METACHO S.A.S.</strong>, sociedad comercial con
                domicilio en Bogotá D.C., Colombia, es responsable del tratamiento de los datos
                personales que se recolectan a través de este sitio web (elmetacho.com) y de los
                servicios, canales de mensajería (WhatsApp, Instagram, Messenger) y plataformas
                asociadas que EL METACHO S.A.S. opera o pone a disposición de terceros.
              </p>
              <p>
                Contacto:{" "}
                <a href="mailto:contacto@elmetacho.com" className="text-[#f4634a] hover:underline">
                  contacto@elmetacho.com
                </a>
              </p>
            </Section>

            <Section title="2. Datos que recolectamos">
              <p>Dependiendo del servicio que uses, podemos recolectar:</p>
              <List
                items={[
                  "Nombre y número de teléfono/WhatsApp",
                  "Interacciones y mensajes enviados a través de nuestros canales de atención (WhatsApp, Instagram, Messenger)",
                  "Historial de puntos, canjes y actividad dentro de programas de fidelización que operamos para negocios afiliados",
                  "Datos que proporciones voluntariamente en formularios (nombre, correo, fecha de cumpleaños, preferencias)",
                ]}
              />
            </Section>

            <Section title="3. Finalidad del tratamiento">
              <p>Usamos estos datos para:</p>
              <List
                items={[
                  "Prestar el servicio de fidelización, atención automatizada o agendamiento que el negocio afiliado ofrece",
                  "Responder tus mensajes y consultas a través de nuestros canales",
                  "Enviar comunicaciones relacionadas con el programa de fidelización al que estás inscrito (puntos, premios, cupones)",
                  "Mejorar nuestros productos y servicios",
                ]}
              />
              <p>
                No vendemos ni compartimos tus datos personales con terceros para fines de mercadeo
                ajenos al servicio contratado, salvo obligación legal.
              </p>
            </Section>

            <Section title="4. Tratamiento con inteligencia artificial">
              <p>
                Algunos de nuestros canales usan modelos de lenguaje (IA) para generar respuestas
                automáticas dentro de un flujo de atención acotado (consulta de puntos, preguntas
                frecuentes, agendamiento). Estas conversaciones pueden ser procesadas por proveedores
                externos de IA bajo acuerdos de confidencialidad, únicamente para generar la
                respuesta solicitada.
              </p>
            </Section>

            <Section title="5. Tus derechos (Ley 1581 de 2012 — Habeas Data, Colombia)">
              <p>Como titular de tus datos personales, tienes derecho a:</p>
              <List
                items={[
                  "Conocer, actualizar y rectificar tus datos personales",
                  "Solicitar prueba de la autorización otorgada",
                  "Ser informado sobre el uso dado a tus datos",
                  "Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley",
                  "Revocar la autorización y/o solicitar la supresión de tus datos, cuando no exista un deber legal o contractual que impida eliminarlos",
                  "Acceder de forma gratuita a tus datos",
                ]}
              />
              <p>
                Para ejercer estos derechos, escríbenos a{" "}
                <a
                  href="mailto:contacto@elmetacho.com"
                  className="font-bold text-[#f4634a] hover:underline"
                >
                  contacto@elmetacho.com
                </a>
                . Atenderemos tu solicitud dentro de los términos establecidos por la ley (máximo 15
                días hábiles; si no es posible, te informaremos el nuevo plazo, que no podrá superar 8
                días hábiles adicionales).
              </p>
            </Section>

            <Section title="6. Seguridad">
              <p>
                Implementamos medidas técnicas y organizativas razonables para proteger tus datos
                personales contra pérdida, acceso no autorizado, uso indebido o alteración.
              </p>
            </Section>

            <Section title="7. Cambios a esta política">
              <p>
                Podemos actualizar esta política periódicamente. La fecha de &quot;última
                actualización&quot; en la parte superior indica la versión vigente.
              </p>
            </Section>

            <div className="mt-6 rounded-[1.75rem] border border-stone-900/10 bg-white p-8 text-base leading-8 text-stone-600 shadow-[0_20px_60px_rgba(28,25,23,0.08)]">
              Si tienes preguntas sobre esta política, contáctanos en{" "}
              <a href="mailto:contacto@elmetacho.com" className="text-[#f4634a] hover:underline">
                contacto@elmetacho.com
              </a>
              .
            </div>
          </div>
        </article>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
        <Footer />
      </div>
    </main>
  );
}
