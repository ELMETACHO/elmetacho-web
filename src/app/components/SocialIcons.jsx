"use client";

import { motion } from "framer-motion";

const socials = [
  {
    label: "Instagram",
    href: "https://instagram.com/elmetacho_",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@elmetacho_",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.5 3c.4 2.3 1.8 3.8 4.1 4v3.1c-1.5.1-2.9-.3-4.1-1.1v6.4c0 3.2-2.6 5.6-5.7 5.6-3.1 0-5.7-2.4-5.7-5.6 0-3.1 2.6-5.6 5.7-5.6.3 0 .6 0 .9.1v3.2a2.7 2.7 0 0 0-.9-.2 2.6 2.6 0 1 0 2.5 2.6V3h3.2Z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@elmetacho_",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
        <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://facebook.com/elmetacho_",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.5 8.5h2V5.3c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.9v2.4H6.3V16h2.7v8h3.3v-8h2.7l.4-3.5h-3.1V10.4c0-1 .3-1.9 1.2-1.9Z" />
      </svg>
    ),
  },
];

export default function SocialIcons({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {socials.map((s) => (
        <motion.a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noreferrer"
          aria-label={s.label}
          initial="rest"
          whileHover="hover"
          animate="rest"
          className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-stone-900/10 bg-white text-stone-700"
        >
          <motion.span
            variants={{ rest: { scale: 0.85, opacity: 0 }, hover: { scale: 1.15, opacity: 1 } }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 border-[#f4634a]"
          />
          <motion.span
            variants={{ rest: { x: "-120%" }, hover: { x: "120%" } }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
          />
          <motion.span
            variants={{ rest: { scale: 1, color: "#57534e" }, hover: { scale: 1.1, color: "#f4634a" } }}
            transition={{ duration: 0.25 }}
            className="relative z-10 h-5 w-5"
          >
            {s.icon}
          </motion.span>
        </motion.a>
      ))}
    </div>
  );
}
