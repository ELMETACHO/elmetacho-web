import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../MlabsMarco";

export const metadata = {
  title: { absolute: "Eliminar datos · MLABS" },
  description: "Cómo pedir que borremos tus datos de la app de Instagram de MLABS.",
  alternates: { canonical: "https://mlabs.elmetacho.com/eliminar-datos" },
  openGraph: { title: "Eliminar datos · MLABS", url: "https://mlabs.elmetacho.com/eliminar-datos", siteName: "MLABS", type: "website" },
};

export default async function EliminarDatos({ searchParams }) {
  const q = await searchParams;
  const listo = q?.listo === "1";
  // El código lo devuelve el callback de Meta; solo se muestra si tiene forma de código (nada de la cuenta).
  const codigo = typeof q?.codigo === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(q.codigo) ? q.codigo : null;
  return (
    <main className="min-h-screen bg-white text-black">
      <MlabsHeader />
      <section className="papel-cuad min-h-[80svh] px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <div className="mx-auto max-w-2xl">
          <h1 className="titular-ancho text-5xl sm:text-6xl">Cómo borrar tus datos</h1>
          <div className="mt-6 space-y-4 text-base leading-8 text-gris">
            {listo && (
              <p role="status" className="rounded bg-green-100 p-3 text-green-900">
                Listo: tu cuenta se desconectó y tus datos se borraron.
              </p>
            )}
            {codigo && (
              <p role="status" className="rounded bg-green-100 p-3 text-green-900">
                Recibimos tu solicitud de eliminación. Código de confirmación: <strong className="font-mono">{codigo}</strong>. Si tu cuenta estaba conectada, sus datos se eliminaron.
              </p>
            )}
            <p>
              <strong className="text-black">Si conectaste tu Instagram a MLABS:</strong> entra a tu panel
              (Iniciar sesión con Instagram en{" "}
              <Link href="/automatizar" className="font-bold underline">/automatizar</Link>) y toca
              «Desconectar Instagram y borrar mis datos». Se borra al instante. También puedes quitar el
              permiso a la app desde Instagram (Configuración, Apps y sitios web).
            </p>
            <p>
              O escríbenos a{" "}
              <a href="mailto:contacto@elmetacho.com" className="font-bold underline">
                contacto@elmetacho.com
              </a>{" "}
              con el asunto <strong className="text-black">«Borrar mis datos de Instagram»</strong> e indícanos tu cuenta de Instagram.
            </p>
            <p>Borramos tus datos en máximo 15 días hábiles y te lo confirmamos por el mismo medio.</p>
            <p>
              Además, todo se borra solo: tu id de Instagram a las 24 horas y la marca de comentario
              respondido a los 8 días. De las personas que comentan o escriben no guardamos el texto de sus
              comentarios ni de sus mensajes, ni su nombre de usuario (solo el id, que se borra solo). De
              las marcas que conectan su cuenta sí guardamos el usuario de Instagram, como explica la
              política de privacidad.
            </p>
            <p>
              <Link href="https://mlabs.elmetacho.com/privacidad" className="font-bold underline">
                Ver la política de privacidad
              </Link>
            </p>
          </div>

          <section className="mt-10 rounded-[1.5rem] border-2 border-black bg-white p-5 sm:p-6">
            <h2 className="titular-ancho text-2xl">English summary</h2>
            <p className="mt-3 text-base leading-8 text-gris">
              If you connected your Instagram account to MLABS, sign in at /automatizar and tap «Desconectar Instagram y borrar mis datos»: everything is deleted instantly (you can also remove the app permission in Instagram). Otherwise, to delete your data from the MLABS Instagram app, email contacto@elmetacho.com
              with the subject «Borrar mis datos de Instagram», from your email or naming your Instagram
              account. We delete it within 15 business days and confirm by the same channel. Data also
              expires automatically: Instagram ids after 24 hours and the answered-comment marker after 8
              days. For people who comment or message, we do not store comment or message text or usernames
              (only the id, which expires automatically). For brands that connect their account, we do
              store the Instagram username, as described in the privacy policy.
            </p>
          </section>
        </div>
      </section>
      <MlabsFooter />
    </main>
  );
}
