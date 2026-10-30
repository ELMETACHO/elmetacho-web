import { cookies } from "next/headers";
import { COOKIE, sesionValida } from "../lib/sesion.js";
import { conRedis } from "../lib/instagram/conexion.js";
import { listaDm } from "../lib/instagram/dm.js";
import { conteoDelDia, fechaBogota, listaResultados, separarPorNivel } from "../lib/instagram/resultados.js";
import Rescatar from "./Rescatar.jsx";

export const dynamic = "force-dynamic";
const ahora = () => Date.now();   // como en admin/page.jsx: el linter no admite Date.now() directo en el render
const fecha = (iso) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });
const ESTADO = { paso: "Pasó", no_paso: "No pasó", ensayo_no_paso: "No pasó (ensayo: siguió igual)" };

export default async function Links() {
  if (!sesionValida((await cookies()).get(COOKIE)?.value, process.env.ADMIN_CLAVE, ahora())) return null;
  const hoy = fechaBogota(ahora());
  let dm = [], resultados = [], conteo = {}, error = "";
  try {
    [dm, resultados, conteo] = await conRedis((r) => Promise.all([listaDm(r), listaResultados(r, ahora()), conteoDelDia(r, hoy)]));
  } catch {
    error = "No pude leer Redis.";
  }
  const { detalle: visibles, nivel1 } = separarPorNivel(resultados);
  const conteoOrdenado = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  return (
    <section>
      <a href="/admin" className="text-sm underline">← Admin</a>
      <h1 className="mt-2 text-2xl font-black">Links</h1>
      <p className="mt-1 text-sm opacity-70">Lo que el filtro de calidad decidió en los últimos 3 días (DM y Telegram) y la cola de DM para el PC. Con «Rescatar», un link que no pasó vuelve a la cola y entra sin juez; la línea roja se revisa igual.</p>
      {error && <p className="mt-4 text-red-600">{error}</p>}

      <h2 className="mt-6 text-lg font-bold">Hoy ({hoy})</h2>
      {!error && !conteoOrdenado.length && <p className="mt-2 text-sm">Todavía no hay resultados hoy.</p>}
      <ul className="mt-2 flex flex-wrap gap-2 text-sm">
        {conteoOrdenado.map(([k, n]) => (
          <li key={k} className="rounded border px-2 py-1">Nivel {k.replace(":", " · ")}: <b>{n}</b></li>
        ))}
      </ul>

      <h2 className="mt-6 text-lg font-bold">Niveles 2 y 3, y los del ensayo</h2>
      {!error && !visibles.length && <p className="mt-2 text-sm">Nada en los últimos 3 días.</p>}
      <ul className="mt-2 space-y-2">
        {visibles.map((x, i) => (
          <li key={`${x.link}-${x.fecha}-${i}`} className="rounded-lg border p-3 text-sm">
            <a href={x.link} target="_blank" rel="noreferrer" className="break-all underline">{x.link}</a>
            <div className="mt-1 opacity-70">
              {ESTADO[x.estado] ?? x.estado} · nivel {x.nivel} · {x.origen === "dm" ? "DM" : "Telegram"} · {fecha(x.fecha)}
            </div>
            <div className="mt-1">{x.motivo || (x.nota !== undefined ? `Nota del juez: ${x.nota}` : "")}</div>
            {x.estado === "no_paso" && <div className="mt-2"><Rescatar link={x.link} /></div>}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 text-lg font-bold">Nivel 1: no pasaron</h2>
      <p className="mt-1 text-sm opacity-70">Los que se cayeron por los números del video (vistas, likes, comentarios), agrupados por motivo. Abre un grupo para ver los links y rescatar el que quieras.</p>
      {!error && !nivel1.length && <p className="mt-2 text-sm">Nada en los últimos 3 días.</p>}
      <div className="mt-2 space-y-2">
        {nivel1.map(([motivo, xs]) => (
          <details key={motivo} className="rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-semibold">{motivo} ({xs.length})</summary>
            <ul className="mt-2 space-y-2">
              {xs.map((x, i) => (
                <li key={`${x.link}-${x.fecha}-${i}`} className="border-t pt-2">
                  <a href={x.link} target="_blank" rel="noreferrer" className="break-all underline">{x.link}</a>
                  <div className="mt-1 opacity-70">{x.motivo} · {x.origen === "dm" ? "DM" : "Telegram"} · {fecha(x.fecha)}</div>
                  {x.estado === "no_paso" && <div className="mt-2"><Rescatar link={x.link} /></div>}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <h2 className="mt-6 text-lg font-bold">Links por DM</h2>
      <p className="mt-1 text-sm opacity-70">Reels y links que la comunidad le manda a elmetacho_. El PC los baja en la franja de las 5 p. m. y van a la Cabina si pasan el filtro.</p>
      {!error && !dm.length && <p className="mt-2 text-sm">Todavía no llega ninguno.</p>}
      <ul className="mt-2 space-y-2">
        {dm.map((x) => (
          <li key={x.link} className="rounded-lg border p-3 text-sm">
            <a href={x.link} target="_blank" rel="noreferrer" className="break-all underline">{x.link}</a>
            <div className="mt-1 opacity-70">
              Llegó {fecha(x.recibido)} · {x.entregado ? `en el PC desde ${fecha(x.entregado)}` : "esperando al PC"}
              {x.forzar && !x.entregado ? " · pase directo o rescatado" : ""}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
