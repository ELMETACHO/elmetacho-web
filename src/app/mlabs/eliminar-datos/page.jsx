import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../MlabsMarco";

export const metadata = {
  title: { absolute: "Eliminar datos · MLABS" },
  description: "Cómo pedir que borremos tus datos de la app de Instagram «M LABS REPLY» de MLABS.",
};

export default function EliminarDatos() {
  return (
    <main className="min-h-screen bg-white text-black">
      <MlabsHeader />
      <section className="papel-cuad min-h-[80svh] px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <div className="mx-auto max-w-2xl">
          <h1 className="titular-ancho text-5xl sm:text-6xl">Cómo borrar tus datos</h1>
          <div className="mt-6 space-y-4 text-base leading-8 text-gris">
            <p>
              Para que borremos los datos que tengamos tuyos de la app de Instagram «M LABS REPLY»,
              escribe a{" "}
              <a href="mailto:contacto@elmetacho.com" className="font-bold underline">
                contacto@elmetacho.com
              </a>{" "}
              con el asunto <strong className="text-black">«Borrar mis datos de Instagram»</strong>. Hazlo
              desde tu correo o indícanos tu cuenta de Instagram para poder identificarte.
            </p>
            <p>Borramos tus datos en máximo 15 días hábiles y te lo confirmamos por el mismo medio.</p>
            <p>
              Además, todo se borra solo: tu id de Instagram a las 24 horas y la marca de comentario
              respondido a los 8 días. No guardamos el texto de comentarios ni de mensajes, ni nombres de
              usuario.
            </p>
            <p>
              <Link href="/privacidad" className="font-bold underline">
                Ver la política de privacidad
              </Link>
            </p>
          </div>

          <section className="mt-10 rounded-[1.5rem] border-2 border-black bg-white p-5 sm:p-6">
            <h2 className="titular-ancho text-2xl">English summary</h2>
            <p className="mt-3 text-base leading-8 text-gris">
              To delete your data from the Instagram app «M LABS REPLY», email contacto@elmetacho.com
              with the subject «Borrar mis datos de Instagram», from your email or naming your Instagram
              account. We delete it within 15 business days and confirm by the same channel. Data also
              expires automatically: Instagram ids after 24 hours and the answered-comment marker after 8
              days.
            </p>
          </section>
        </div>
      </section>
      <MlabsFooter />
    </main>
  );
}
