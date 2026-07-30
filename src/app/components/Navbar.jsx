"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const links = [
  { label: "Inicio", href: "#inicio" },
  { label: "Sobre mí", href: "#sobre-mi" },
  { label: "Formatos", href: "#formatos" },
  { label: "Trabajemos", href: "#trabajemos" },
  { label: "METACHO LABS", href: "#metacho-labs" },
  { label: "Contacto", href: "#contacto-labs" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-stone-900/10 bg-white/85 shadow-sm backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8 lg:px-12">
        <a href="#inicio" className="text-lg font-black tracking-tight text-stone-900">
          El <span className="text-[#f4634a]">Metacho</span>
        </a>
        <ul className="hidden items-center gap-10 text-sm font-medium uppercase tracking-[0.15em] text-stone-600 sm:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition hover:text-[#f4634a]">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <motion.a
          href="#trabajemos"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          className="rounded-full border border-[#f4634a]/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#f4634a] transition hover:bg-[#f4634a] hover:text-white sm:hidden"
        >
          Menú
        </motion.a>
      </nav>
    </header>
  );
}
