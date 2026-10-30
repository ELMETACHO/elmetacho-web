// src/app/mlabs/automatizar/page.jsx — landing del servicio para marcas (spec 2026-10-26 §2 paso 1 y §8).
import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../MlabsMarco";

export const metadata = {
  title: { absolute: "Automatiza tus comentarios de Instagram · MLABS" },
  description: "Cuando alguien comenta una palabra clave en tu Instagram, MLABS le responde en público y le manda tu link por DM. 7 días gratis.",
  alternates: { canonical: "https://mlabs.elmetacho.com/automatizar" },
  openGraph: { title: "Automatiza tus comentarios de Instagram · MLABS", url: "https://mlabs.elmetacho.com/automatizar", siteName: "MLABS", type: "website" },
};

const ERRORES = {
  cancelado: "No se conectó tu cuenta: cancelaste el permiso en Instagram.",
  state: "No se conectó tu cuenta: la sesión venció. Intenta otra vez.",
  codigo: "No se conectó tu cuenta. Intenta otra vez en un momento.",
  personal: "Tu cuenta de Instagram es personal. Pásala a profesional (empresa o creador) y que sea pública, y vuelve a intentar.",
};

const PASOS = [
  ["1", "Alguien comenta", "Una persona escribe en tu publicación una palabra clave que tú elegiste, por ejemplo «precio»."],
  ["2", "Respondemos en público", "MLABS contesta ese comentario con el texto que tú dejaste escrito."],
  ["3", "Le llega tu link por DM", "La misma persona recibe un mensaje directo con tu link. Si quieres, primero le pedimos que te siga."],
];

function formatoCop(valor) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export default async function Automatizar({ searchParams }) {
  const motivo = (await searchParams)?.error;
  // Solo motivos propios del mapa; cualquier otro valor (incluido __proto__) da el mensaje genérico.
  const error = typeof motivo !== "string" || motivo === "" ? null : Object.hasOwn(ERRORES, motivo) ? ERRORES[motivo] : ERRORES.codigo;
  const precio = Number.parseInt(process.env.MLABS_PRECIO, 10);
  return (
    <main className="min-h-screen bg-white text-black">
      <MlabsHeader />
      <section className="papel-cuad min-h-[80svh] px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <div className="mx-auto max-w-2xl">
          <h1 className="titular-ancho text-5xl sm:text-6xl">Tus comentarios, respondidos solos</h1>
          <div className="mt-6 space-y-4 text-base leading-8 text-gris">
            <p>
              Alguien comenta una palabra clave en tu Instagram, por ejemplo «precio». MLABS le responde en
              público y le manda tu link por mensaje directo. Tú solo eliges las palabras, las respuestas y
              los links.
            </p>

            <ol className="space-y-3">
              {PASOS.map(([n, titulo, texto]) => (
                <li key={n} className="rounded-[1.5rem] border-2 border-black bg-white p-4">
                  <p className="font-bold text-black">{n}. {titulo}</p>
                  <p className="mt-1 text-sm leading-7">{texto}</p>
                </li>
              ))}
            </ol>

            <p>
              <strong className="text-black">7 días gratis</strong>
              {precio > 0 ? `, después ${formatoCop(precio)} al mes` : ""} con Mercado Pago. Cancelas cuando
              quieras. Los 7 días gratis son solo la primera vez que conectas una cuenta.
            </p>
            <p>
              <strong className="text-black">Qué necesitas:</strong> una cuenta de Instagram profesional
              (empresa o creador) y pública.
            </p>

            {error && (
              <p role="alert" className="rounded bg-red-100 p-3 text-sm text-red-800">
                {error}
              </p>
            )}
            <a
              href="/api/mlabs/instagram/entrar"
              className="inline-block rounded-lg bg-black px-5 py-3 font-bold text-white"
            >
              Iniciar sesión con Instagram
            </a>
            <p className="text-sm">
              Al continuar aceptas los{" "}
              <Link href="/terminos" className="underline">términos</Link> y la{" "}
              <Link href="/privacidad" className="underline">política de privacidad</Link>.
            </p>
          </div>
        </div>
      </section>
      <MlabsFooter />
    </main>
  );
}
