import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../MlabsMarco";

export const metadata = {
  title: { absolute: "Privacidad · MLABS" },
  description:
    "Política de privacidad de MLABS y de la app de Instagram «M LABS REPLY»: qué datos usamos, para qué y cómo pedir su borrado.",
};

function Seccion({ titulo, children }) {
  return (
    <section className="mt-10">
      <h2 className="titular-ancho text-2xl sm:text-3xl">{titulo}</h2>
      <div className="mt-4 space-y-4 text-base leading-8 text-gris">{children}</div>
    </section>
  );
}

export default function Privacidad() {
  return (
    <main className="min-h-screen bg-white text-black">
      <MlabsHeader />
      <section className="papel-cuad min-h-[80svh] px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <div className="mx-auto max-w-2xl">
          <h1 className="titular-ancho text-5xl sm:text-6xl">Privacidad</h1>
          <p className="mt-4 text-sm text-gris">Última actualización: 25 de octubre de 2026</p>

          <Seccion titulo="1. Quién responde">
            <p>
              MLABS es un servicio de El Metacho S.A.S. El responsable del tratamiento es{" "}
              <strong className="text-black">EL METACHO S.A.S.</strong>, sociedad comercial con domicilio
              en Bogotá D.C., Colombia. Contacto:{" "}
              <a href="mailto:contacto@elmetacho.com" className="font-bold underline">
                contacto@elmetacho.com
              </a>
              .
            </p>
          </Seccion>

          <Seccion titulo="2. Qué datos usamos de Instagram (app «M LABS REPLY»)">
            <p>
              <strong className="text-black">En la cuenta de El Metacho (elmetacho_):</strong> cuando nos
              envías por mensaje directo un reel, o un link de TikTok o de Instagram, guardamos solo ese
              link y la hora en que lo recibimos. No guardamos el texto del mensaje ni quién lo envió.
            </p>
            <p>
              <strong className="text-black">En la cuenta de MLABS (metacholabs):</strong> si tu comentario
              contiene una palabra clave que hemos configurado, respondemos públicamente una sola vez y te
              enviamos un mensaje privado con un link a un recurso en mlabs.elmetacho.com. Para eso
              guardamos el id del comentario (8 días, para no responderte dos veces) y, solo si la opción
              «seguir primero» está activa, tu id de Instagram durante 24 horas mientras esperamos que nos
              escribas. Después de que nos escribes, consultamos a Instagram si sigues la cuenta.
            </p>
            <p>No guardamos el texto de los comentarios ni de los mensajes, ni nombres de usuario.</p>
          </Seccion>

          <Seccion titulo="3. Para qué">
            <p>
              Para responder a quien pide un recurso y para proponer videos del formato «comentarios
              cantados». No vendemos ni compartimos tus datos, y no los usamos para publicidad. Los datos
              se almacenan con proveedores de alojamiento (hosting y base de datos) que los procesan solo
              para prestar el servicio.
            </p>
          </Seccion>

          <Seccion titulo="4. Base legal y derechos">
            <p>
              Tratamos los datos conforme a la Ley 1581 de 2012 (Habeas Data, Colombia). Puedes pedir
              acceso, rectificación o borrado de tus datos. Cómo hacerlo:{" "}
              <Link href="https://mlabs.elmetacho.com/eliminar-datos" className="font-bold underline">
                eliminar tus datos
              </Link>
              . Más información en la{" "}
              <a href="https://www.elmetacho.com/privacidad" className="font-bold underline">
                política general de El Metacho
              </a>
              .
            </p>
          </Seccion>

          <Seccion titulo="5. English summary">
            <p>
              MLABS is a service of EL METACHO S.A.S. (Bogotá, Colombia). Through the Instagram app
              «M LABS REPLY» we store only: the links of reels or TikTok/Instagram links sent by direct
              message to El Metacho, with the time received; and, for comments on the MLABS account that
              contain a configured keyword, the comment id (8 days) and, only if the follow-first option is
              on, the commenter&apos;s Instagram-scoped id (24 hours). We do not store comment or message
              text, or usernames. We use data only to send the requested resource and to suggest videos; we
              do not sell, share or use it for advertising. Rights under Colombian Law 1581 of 2012. To
              request deletion, see the data deletion page at /eliminar-datos or email
              contacto@elmetacho.com.
            </p>
          </Seccion>
        </div>
      </section>
      <MlabsFooter />
    </main>
  );
}
