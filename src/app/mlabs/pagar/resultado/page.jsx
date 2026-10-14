import { MlabsHeader, MlabsFooter } from "../../MlabsMarco";
import Resultado from "./Resultado";

export const metadata = { title: { absolute: "Resultado del pago · MLABS" }, robots: { index: false } };

export default function ResultadoPago() {
  return (
    <main className="min-h-screen bg-white text-black">
      <MlabsHeader />
      <section className="papel-cuad min-h-[80svh] px-4 pb-16 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-md">
          <Resultado />
        </div>
      </section>
      <MlabsFooter />
    </main>
  );
}
