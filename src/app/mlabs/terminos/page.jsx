// src/app/mlabs/terminos/page.jsx — términos del servicio de automatización para marcas (spec 2026-10-26 §8). Borrador: revisar con un abogado.
import Link from "next/link";
import { MlabsHeader, MlabsFooter } from "../MlabsMarco";

export const metadata = {
  title: { absolute: "Términos · MLABS" },
  description: "Términos del servicio de respuestas automáticas a comentarios de Instagram de MLABS.",
  alternates: { canonical: "https://mlabs.elmetacho.com/terminos" },
  openGraph: { title: "Términos · MLABS", url: "https://mlabs.elmetacho.com/terminos", siteName: "MLABS", type: "website" },
};

export default function Terminos() {
  return (
    <main className="min-h-screen bg-white text-black">
      <MlabsHeader />
      <section className="papel-cuad min-h-[80svh] px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
        <div className="mx-auto max-w-2xl">
          <h1 className="titular-ancho text-5xl sm:text-6xl">Términos del servicio</h1>
          <div className="mt-6 space-y-4 text-base leading-8 text-gris">
            <p>
              MLABS es un servicio de El Metacho S.A.S (Colombia) que responde automáticamente comentarios
              de Instagram según las palabras clave que configura cada marca, con una respuesta pública y
              un mensaje directo.
            </p>
            <p>
              Cobro: suscripción mensual con Mercado Pago. Los primeros 7 días son gratis; el primer cobro
              llega al día 7. Puedes cancelar desde tu panel; el servicio sigue hasta el final del periodo
              ya pagado (o de los días gratis) y no hay reembolsos parciales.
            </p>
            <p>
              Uso permitido: está prohibido usar MLABS para spam, para mensajes engañosos, ilegales o que
              violen las políticas de Instagram y Meta. Eres responsable de los textos y links que
              configuras.
            </p>
            <p>
              Datos: tratamos los datos de Instagram solo para prestarte el servicio, en tu nombre. No los
              vendemos ni los usamos para otra cosa. Detalles en la{" "}
              <Link href="/privacidad" className="font-bold underline">política de privacidad</Link>.
            </p>
            <p>
              Podemos suspender cuentas que incumplan estos términos o las políticas de Meta. Meta puede
              cambiar o limitar su plataforma; en ese caso el servicio puede verse afectado.
            </p>
            <p>Desconectar Instagram desde tu panel borra tus datos y cancela tu suscripción.</p>
            <p>
              Contacto:{" "}
              <a href="mailto:contacto@elmetacho.com" className="font-bold underline">contacto@elmetacho.com</a>.
            </p>
            <p className="text-sm">Última actualización: 30 de octubre de 2026</p>
          </div>
        </div>
      </section>
      <MlabsFooter />
    </main>
  );
}
