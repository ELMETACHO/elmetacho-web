"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const MLABS_URL = "https://mlabs.elmetacho.com";
const CLAVE = "portada-elegida";

// Entrada del home partida en dos: El Metacho (esta misma página) o MLABS (la agencia, en su subdominio).
// No aparece si el visitante ya eligió en esta visita o si llega a una sección concreta (/#trabajemos, etc.).
export default function Portada() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let elegida = false;
    try {
      elegida = sessionStorage.getItem(CLAVE) === "1";
    } catch {}
    if (elegida || window.location.hash) setVisible(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  const entrar = () => {
    try {
      sessionStorage.setItem(CLAVE, "1");
    } catch {}
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="portada"
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="fixed inset-0 z-[100] grid grid-rows-2 bg-black md:grid-cols-2 md:grid-rows-1"
          role="dialog"
          aria-label="Elige a dónde quieres ir"
        >
          <motion.button
            type="button"
            onClick={entrar}
            initial={{ x: "-6%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="group relative overflow-hidden bg-rojo text-left text-white"
          >
            <Image src="/images/foto1.png" alt="" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-top opacity-60 mix-blend-multiply grayscale transition duration-700 group-hover:scale-105" />
            <span className="relative flex h-full flex-col justify-end p-5 sm:p-10">
              <span className="font-cartel text-[20vw] uppercase leading-[0.86] md:text-[9.5vw]">
                El
                <br />
                Metacho
              </span>
              <span className="mt-3 max-w-sm text-base font-medium leading-6 sm:text-lg">Creador de contenido. Comentarios cantados, sketches y musicales.</span>
              <span className="mt-4 inline-flex w-fit rounded-full bg-white px-5 py-2.5 text-sm font-bold text-rojo">Entrar</span>
            </span>
          </motion.button>

          <motion.a
            href={MLABS_URL}
            initial={{ x: "6%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="papel-cuad group relative flex overflow-hidden text-black"
          >
            <video
              src="/videos/gps.mp4"
              poster="/videos/gps.jpg"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
              className="absolute right-4 top-4 h-[46%] w-auto rounded-[1.4rem] border-4 border-black shadow-[0_18px_40px_rgba(0,0,0,0.25)] sm:right-10 sm:top-10 md:h-[48%]"
            />
            <span className="relative mt-auto flex flex-col p-5 sm:p-10">
              <span className="titular-ancho text-[17vw] md:text-[8.5vw]">MLABS</span>
              <span className="mt-3 max-w-sm text-base font-medium leading-6 sm:text-lg">La agencia: videos con IA, mensajes automáticos y fidelización para tu marca.</span>
              <span className="mt-4 inline-flex w-fit rounded-full bg-rojo px-5 py-2.5 text-sm font-bold text-white">Ir a MLABS</span>
            </span>
          </motion.a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
