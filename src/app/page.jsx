import Image from "next/image";
import Navbar from "./components/Navbar";
import SocialIcons from "./components/SocialIcons";
import ChatFab from "./components/ChatFab";
import Footer from "./components/Footer";
import Portada from "./components/Portada";

const PROPUESTA_MAILTO = "mailto:contacto@elmetacho.com?subject=Propuesta%20para%20El%20Metacho";
const WHATSAPP = "https://wa.me/573202646716?text=Hola%20Metacho%2C%20quiero%20hacer%20una%20campa%C3%B1a%20contigo";
const MLABS_URL = "https://mlabs.elmetacho.com";

const cifras = [
  { valor: "+10", texto: "años creando contenido" },
  { valor: "+6M", texto: "seguidores combinados" },
  { valor: "4", texto: "formatos propios" },
];

const fortalezas = [
  { titulo: "Dirección creativa", texto: "Cada pieza nace de un concepto claro, no de la improvisación." },
  { titulo: "Equipo de alta calidad", texto: "Producción, edición y postproducción con estándar profesional." },
  { titulo: "Creatividad constante", texto: "Formatos propios que se renuevan para no perder relevancia." },
];

const formatos = [
  { titulo: "Comentarios cantados", texto: "Reacciones y opiniones convertidas en canciones improvisadas: humor, ritmo y actualidad en un mismo formato." },
  { titulo: "Musicales", texto: "Piezas basadas en música y tendencias sonoras, pensadas para conectar rápido y viajar por el algoritmo." },
  { titulo: "Sketch situacional", texto: "Historias y personajes cortos que retratan situaciones cotidianas con un toque cómico y muy compartible." },
];

export default function Home() {
  return (
    <main className="relative min-h-screen bg-white text-black">
      <Portada />
      <Navbar sobreRojo />
      <ChatFab />

      {/* CARTEL */}
      <section id="inicio" className="relative flex min-h-svh flex-col overflow-hidden bg-rojo text-white">
        <div className="absolute inset-y-0 right-0 w-full md:w-[55%]">
          <Image src="/images/foto1.png" alt="El Metacho" fill priority sizes="(max-width: 768px) 100vw, 55vw" className="object-cover object-top grayscale mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-rojo via-rojo/30 to-transparent md:bg-gradient-to-r" />
        </div>
        <div className="relative mx-auto mt-auto w-full max-w-7xl px-4 pb-8 pt-28 sm:px-8 sm:pb-12">
          <h1 className="font-cartel text-[25vw] uppercase leading-[0.86] tracking-tight md:text-[15vw] lg:text-[13rem]">
            El
            <br />
            Metacho
          </h1>
          <p className="mt-6 max-w-xl text-lg font-medium leading-7 sm:text-xl sm:leading-8">
            Más de 10 años creando contenido para redes. Dirección creativa, producción propia y formatos originales para conectar marcas con una audiencia real.
          </p>
          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-4 border-t border-white/40 pt-5">
            {cifras.map((c) => (
              <div key={c.texto}>
                <dt className="sr-only">{c.texto}</dt>
                <dd className="font-cartel text-4xl leading-none sm:text-5xl">{c.valor}</dd>
                <dd className="mt-1 text-xs leading-4 text-white/85 sm:text-sm">{c.texto}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#trabajemos" className="rounded-full bg-white px-7 py-4 text-center text-base font-bold text-rojo">
              Trabajemos juntos
            </a>
            <a href={WHATSAPP} className="rounded-full border-2 border-white px-7 py-4 text-center text-base font-bold">
              Escríbeme por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* QUIÉN SOY */}
      <section id="sobre-mi" className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-8 sm:py-28 md:grid-cols-[0.8fr_1.2fr] md:items-center">
        <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2rem]">
          <Image src="/images/foto2.png" alt="El Metacho creando contenido" fill sizes="(max-width: 768px) 90vw, 380px" className="object-cover" />
        </div>
        <div>
          <h2 className="font-cartel text-6xl uppercase leading-[0.9] sm:text-7xl">Quién soy</h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gris">
            Soy El Metacho. Llevo más de 10 años creando contenido para redes sociales, con experiencia en producción audiovisual, marketing digital y generación de contenido apoyada en inteligencia artificial. Trabajo con autenticidad, energía y narrativa limpia para conectar marcas con su audiencia en Latinoamérica.
          </p>
          <ul className="mt-8 divide-y divide-linea border-y border-linea">
            {fortalezas.map((f) => (
              <li key={f.titulo} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <span className="font-bold">{f.titulo}</span>
                <span className="text-gris">{f.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FORMATOS */}
      <section id="formatos" className="bg-black px-4 py-20 text-white sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-cartel text-6xl uppercase leading-[0.9] sm:text-7xl">Cómo cuento historias</h2>
          <ul className="mt-10 border-t border-white/25">
            {formatos.map((f) => (
              <li key={f.titulo} className="grid gap-3 border-b border-white/25 py-8 md:grid-cols-[1.1fr_1fr] md:items-end md:gap-10">
                <h3 className="font-cartel text-5xl uppercase leading-[0.9] text-rojo-claro sm:text-7xl">{f.titulo}</h3>
                <p className="max-w-lg text-lg leading-7 text-white/80">{f.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* TRABAJEMOS */}
      <section id="trabajemos" className="bg-rojo px-4 py-20 text-white sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-cartel text-6xl uppercase leading-[0.9] sm:text-8xl">¿Tu marca en mi contenido?</h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/90">
            Si tienes una marca y quieres llegar a mi audiencia con contenido real, cuéntame tu idea y armamos una propuesta a la medida.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href={WHATSAPP} className="rounded-full bg-white px-7 py-4 text-center text-base font-bold text-rojo">
              Escríbeme por WhatsApp
            </a>
            <a href={PROPUESTA_MAILTO} className="rounded-full border-2 border-white px-7 py-4 text-center text-base font-bold">
              Enviar propuesta por correo
            </a>
          </div>
          <div className="mt-10 text-white">
            <SocialIcons />
          </div>
        </div>
      </section>

      {/* MLABS */}
      <section id="metacho-labs" className="papel-cuad px-4 py-20 sm:px-8 sm:py-28">
        <div id="contacto-labs" className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <h2 className="titular-ancho text-6xl sm:text-8xl">MLABS</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-gris">
              Además de crear contenido, dirijo MLABS, mi agencia. Montamos para otras marcas los mismos sistemas de IA con los que producimos nuestras cuentas: videos animados todos los días, edición, mensajes automáticos y fidelización.
            </p>
            <a href={MLABS_URL} className="mt-8 inline-block rounded-full bg-rojo px-7 py-4 text-base font-bold text-white">
              Conocer MLABS
            </a>
          </div>
          <video src="/videos/gato.mp4" poster="/videos/gato.jpg" autoPlay muted loop playsInline aria-hidden="true" className="mx-auto w-56 rounded-[1.8rem] border-[5px] border-black shadow-[0_24px_60px_rgba(0,0,0,0.25)] sm:w-64" />
        </div>
      </section>

      <Footer />
    </main>
  );
}
