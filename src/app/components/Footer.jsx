import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-stone-900/10 py-10 text-center text-xs text-stone-400">
      <p className="uppercase tracking-[0.3em]">© {new Date().getFullYear()} El Metacho</p>
      <p className="mt-4 leading-6">
        Metacho Labs es operado por EL METACHO S.A.S., NIT 901.938.947-4, Bogotá D.C., Colombia.
      </p>
      <p className="mt-3">
        <Link href="/privacidad" className="underline-offset-4 transition hover:text-[#f4634a] hover:underline">
          Política de Privacidad
        </Link>
      </p>
    </footer>
  );
}
