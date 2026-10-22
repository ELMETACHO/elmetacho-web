import { cookies } from "next/headers";
import { COOKIE, sesionValida } from "./lib/sesion.js";
import Entrar from "./Entrar.jsx";

const ahora = () => Date.now();
export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const valor = (await cookies()).get(COOKIE)?.value;
  const dentro = sesionValida(valor, process.env.ADMIN_CLAVE, ahora());
  return (
    <div className="min-h-screen bg-[#faf6ee] text-black">
      <main className="mx-auto max-w-[480px] p-4">{dentro ? children : <Entrar />}</main>
    </div>
  );
}
