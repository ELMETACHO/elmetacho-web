"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

const links = [
  { label: "Quién soy", href: "/#sobre-mi" },
  { label: "Formatos", href: "/#formatos" },
  { label: "Trabajemos", href: "/#trabajemos" },
  { label: "Fidelización", href: "/fidelizacion" },
];
const MLABS_URL = "https://mlabs.elmetacho.com";

// sobreRojo: el home empieza con el cartel rojo, así que el menú arranca en blanco; las demás páginas arrancan en negro
export default function Navbar({ sobreRojo = false }) {
  const [abierto, setAbierto] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled || abierto ? "bg-white text-black" : sobreRojo ? "bg-transparent text-white" : "bg-transparent text-black"}`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8 sm:py-4">
        <Link href="/#inicio" onClick={() => setAbierto(false)} className="font-cartel text-2xl uppercase tracking-tight">
          El Metacho
        </Link>
        <ul className="hidden items-center gap-8 text-[15px] font-semibold md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="underline-offset-8 hover:underline">
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <a href={MLABS_URL} className="rounded-full bg-rojo px-5 py-2.5 text-white">
              MLABS
            </a>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls="menu-movil"
          className="rounded-full border border-current px-4 py-2 text-sm font-semibold md:hidden"
        >
          {abierto ? "Cerrar" : "Menú"}
        </button>
      </nav>

      <AnimatePresence>
        {abierto && (
          <motion.div
            id="menu-movil"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-x-0 bottom-0 top-[60px] flex flex-col justify-between bg-white px-4 pb-8 pt-4 text-black md:hidden"
          >
            <ul className="space-y-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={() => setAbierto(false)} className="block py-2 font-cartel text-5xl uppercase leading-none">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <a href={MLABS_URL} className="block rounded-full bg-rojo px-6 py-4 text-center text-lg font-bold text-white">
              Ir a MLABS, la agencia
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
