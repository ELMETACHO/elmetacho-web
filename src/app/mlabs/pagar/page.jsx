import { MlabsHeader, MlabsFooter } from "../MlabsMarco";
import PagarCliente from "./PagarCliente";

export const metadata = {
  title: { absolute: "Pagar · MLABS" },
  description: "Paga tu servicio de MLABS con tarjeta nacional o internacional, PSE o billeteras.",
  robots: { index: false },
};

export default function Pagar() {
  return (
    <main className="min-h-screen bg-white text-black">
      <MlabsHeader />
      <section className="papel-cuad min-h-[80svh] px-4 pb-16 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-md">
          <h1 className="titular-ancho text-5xl sm:text-6xl">Pagar</h1>
          <p className="mt-4 text-lg leading-8 text-gris">Escribe el monto que te cotizamos por WhatsApp y qué estás pagando.</p>
          <div className="mt-8 rounded-[1.5rem] border-2 border-black bg-white p-5 sm:p-6">
            <PagarCliente />
          </div>
        </div>
      </section>
      <MlabsFooter />
    </main>
  );
}
