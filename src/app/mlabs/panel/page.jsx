// src/app/mlabs/panel/page.jsx — panel de la marca; sin sesión vuelve a /automatizar (spec 2026-10-26 §2 paso 4).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_MARCA, marcaDeSesion } from "../lib/automatizar/sesion.js";
import Panel from "./Panel.jsx";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Tu panel · MLABS" }, robots: { index: false } };

export default async function Pagina() {
  const cuenta = marcaDeSesion((await cookies()).get(COOKIE_MARCA)?.value ?? null, process.env.MLABS_SESION_SECRETO, Date.now());
  if (!cuenta) redirect("/automatizar");
  return <main className="mx-auto max-w-2xl p-4"><Panel /></main>;
}
