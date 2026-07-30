"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const PROPUESTA_MAILTO =
  "mailto:contacto@elmetacho.com?subject=Propuesta%20para%20El%20Metacho";

const faqs = [
  {
    q: "¿Cómo puede mi marca aparecer en tu contenido?",
    a: "Integramos tu producto o servicio dentro de mis formatos (Musicales, Comentarios Cantados, Sketch Situacional) para que se sienta natural y no como un anuncio forzado.",
  },
  {
    q: "¿Trabajas con marcas pequeñas?",
    a: "Sí. Trabajo con marcas de distintos tamaños y adapto el formato y alcance a los objetivos de cada una.",
  },
  {
    q: "¿Qué tipo de audiencia tiene tu contenido?",
    a: "Una audiencia real y activa en Instagram, TikTok, YouTube y Facebook, construida con más de 10 años de contenido consistente.",
  },
  {
    q: "¿Cómo es el proceso para una colaboración?",
    a: "Me cuentas tu marca y objetivo, propongo el formato que mejor conecta con tu audiencia y coordinamos producción y fecha de entrega.",
  },
  {
    q: "¿Solo haces contenido como influencer?",
    a: "También dirijo METACHO LABS, mi agencia de marketing, IA y creación de contenido, por si tu marca necesita algo más allá de una colaboración puntual.",
  },
];

export default function ChatFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="w-[calc(100vw-3rem)] max-w-sm rounded-[1.75rem] border border-stone-900/10 bg-white p-6 shadow-[0_20px_60px_rgba(28,25,23,0.2)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f4634a]">
              Preguntas frecuentes
            </p>
            <h3 className="mt-2 text-lg font-bold tracking-tight text-stone-900">
              ¿Cómo posiciono mi marca con El Metacho?
            </h3>

            <div className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-1">
              {faqs.map((item) => (
                <div key={item.q}>
                  <p className="text-sm font-semibold text-stone-900">{item.q}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{item.a}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-stone-900/10 pt-5">
              <p className="text-sm text-stone-600">¿Tienes otra pregunta? Escríbenos.</p>
              <a
                href={PROPUESTA_MAILTO}
                className="mt-3 inline-flex rounded-full bg-[#f4634a] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:scale-105"
              >
                ¿Quieres trabajar conmigo?
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? "Cerrar preguntas frecuentes" : "Abrir preguntas frecuentes"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4634a] text-white shadow-[0_10px_30px_rgba(244,99,74,0.4)]"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z" strokeLinejoin="round" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
