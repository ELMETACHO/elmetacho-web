import { cookies } from "next/headers";
import { COOKIE, sesionValida } from "../lib/sesion.js";
import { conRedis } from "../lib/instagram/conexion.js";
import { listaDm } from "../lib/instagram/dm.js";

export const dynamic = "force-dynamic";
const ahora = () => Date.now();   // como en admin/page.jsx: el linter no admite Date.now() directo en el render
const fecha = (iso) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

export default async function LinksDm() {
  if (!sesionValida((await cookies()).get(COOKIE)?.value, process.env.ADMIN_CLAVE, ahora())) return null;
  let lista = [], error = "";
  try { lista = await conRedis(listaDm); } catch { error = "No pude leer la cola."; }
  return (
    <section>
      <a href="/admin" className="text-sm underline">← Admin</a>
      <h1 className="mt-2 text-2xl font-black">Links por DM</h1>
      <p className="mt-1 text-sm opacity-70">Reels y links que la comunidad le manda a elmetacho_. El PC los baja en la franja de las 5 a. m. y van a la Cabina si pasan el filtro.</p>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {!error && !lista.length && <p className="mt-4">Todavía no llega ninguno.</p>}
      <ul className="mt-4 space-y-2">
        {lista.map((x) => (
          <li key={x.link} className="rounded-lg border p-3 text-sm">
            <a href={x.link} target="_blank" rel="noreferrer" className="break-all underline">{x.link}</a>
            <div className="mt-1 opacity-70">Llegó {fecha(x.recibido)} · {x.entregado ? `en el PC desde ${fecha(x.entregado)}` : "esperando al PC"}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
