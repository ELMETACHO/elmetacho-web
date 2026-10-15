import Link from "next/link";
import Desbloqueo from "./Desbloqueo";
import { guiaPorSlug, edicionesRecientes, PALABRA_NOVEDADES } from "../contenido/index.js";

const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

function Fuentes({ n }) {
  const guia = n.guiaRelacionada && guiaPorSlug(n.guiaRelacionada);
  return (
    <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
      <a href={n.fuente.url} target="_blank" rel="noopener noreferrer" className="underline">
        Fuente oficial: {n.fuente.nombre} ↗
      </a>
      {guia && (
        <Link href={`/recursos/${guia.slug}`} className="text-rojo underline">
          Guía: {guia.titulo}
        </Link>
      )}
    </p>
  );
}

function Novedad({ n, destacada = false }) {
  return (
    <article
      id={n.slug}
      className={`scroll-mt-44 rounded-[1.5rem] border-2 border-black p-5 sm:p-7 ${destacada ? "bg-black text-white" : "bg-white"}`}
    >
      <p className="text-sm font-bold text-rojo">
        {destacada ? "Destacado de la semana · " : ""}
        <time dateTime={n.fecha}>{fecha(n.fecha)}</time>
      </p>
      <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{n.titulo}</h2>
      <p className={`mt-3 leading-7 ${destacada ? "text-white/85" : "text-stone-700"}`}>
        <strong>Qué es: </strong>
        {n.queEs}
      </p>
      <p className={`mt-2 leading-7 ${destacada ? "text-white/85" : "text-stone-700"}`}>
        <strong>Para qué te sirve: </strong>
        {n.paraQueTeSirve}
      </p>
      {n.cursos?.length > 0 && (
        <div className="mt-5 rounded-[1.25rem] bg-white p-4 text-stone-950 sm:p-5">
          <p className="font-black">¿Por cuál empiezo?</p>
          <ul className="mt-3 space-y-3">
            {n.cursos.map((c) => (
              <li key={c.nombre} className="leading-6">
                <strong>{c.nombre}</strong>
                <span className="block text-stone-600">{c.paraQuien}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {n.aclaracion && (
        <div className="mt-4 rounded-2xl border-2 border-rojo bg-rojo/10 p-4 text-stone-900" role="note">
          <p className="leading-7">
            <strong className="text-rojo">Ojo: </strong>
            {n.aclaracion.texto}{" "}
            <a href={n.aclaracion.fuente.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">
              {n.aclaracion.fuente.nombre} ↗
            </a>
          </p>
        </div>
      )}
      <div className={destacada ? "[&_a]:text-white" : ""}>
        <Fuentes n={n} />
      </div>
    </article>
  );
}

// Una edición semanal de /novedades: el destacado se ve libre; el resto se abre con el correo (igual que las guías).
export default function EdicionNovedades({ edicion }) {
  const actual = edicionesRecientes[0]?.slug === edicion.slug;
  const anteriores = edicionesRecientes.filter((e) => e.slug !== edicion.slug);
  const guias = (edicion.guiasRelacionadas ?? []).map(guiaPorSlug).filter(Boolean);
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-40 sm:px-8 sm:pt-44">
      {actual ? (
        <p className="text-sm font-bold text-rojo">¿Comentaste {PALABRA_NOVEDADES}? Esta es la edición de esta semana.</p>
      ) : (
        <Link href="/novedades" className="text-sm font-bold text-rojo underline">
          ← Ver la edición de esta semana
        </Link>
      )}
      <h1 className="titular-ancho mt-3 text-5xl sm:text-7xl">Novedades de IA de la semana</h1>
      <p className="mt-4 text-xl font-black">{edicion.titulo}</p>
      <p className="mt-2 text-lg leading-8 text-gris">{edicion.intro}</p>
      <p className="mt-2 text-sm text-stone-500">Solo lo que le sirve a tu negocio, explicado corto y con la fuente oficial.</p>

      <div className="mt-10">
        <Novedad n={edicion.destacado} destacada />
      </div>

      {edicion.novedades.length > 0 && (
        <Desbloqueo
          slug={`novedades-${edicion.slug}`}
          origen={`novedades-${edicion.slug}`}
          titulo="Mira todas las novedades de la semana"
          texto="Déjanos tu correo y ves el resto ahora mismo, gratis. Cada semana hay edición nueva."
          boton="Ver todas las novedades"
        >
          {edicion.novedades.map((n) => (
            <Novedad key={n.slug} n={n} />
          ))}
        </Desbloqueo>
      )}

      {guias.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-black">Guías relacionadas</h2>
          <ul className="mt-4 space-y-3">
            {guias.map((g) => (
              <li key={g.slug}>
                <Link href={`/recursos/${g.slug}`} className="block rounded-[1.25rem] border-2 border-black p-4 hover:bg-black hover:text-white">
                  <span className="block font-black">{g.titulo}</span>
                  <span className="mt-1 block text-sm opacity-75">{g.resumen}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/recursos" className="mt-4 inline-block font-bold underline">
            Ver todas las guías gratis →
          </Link>
        </section>
      )}

      <section className="mt-14 border-t-2 border-black pt-8">
        <h2 className="text-2xl font-black">Ediciones anteriores</h2>
        {anteriores.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {anteriores.map((e) => (
              <li key={e.slug}>
                <Link href={e.slug === edicionesRecientes[0]?.slug ? "/novedades" : `/novedades/${e.slug}`} className="font-bold underline">
                  {e.titulo}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 leading-7 text-gris">Esta es la primera edición. Cada semana se suma una nueva arriba y las anteriores quedan aquí.</p>
        )}
      </section>
    </div>
  );
}
