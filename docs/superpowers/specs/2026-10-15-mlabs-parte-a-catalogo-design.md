# MLABS · Parte A: catálogo, guías gratis y preventas

Fecha: 2026-10-15 · Estado: borrador para revisión del dueño

## 1. Propósito

MLABS (mlabs.elmetacho.com) debe funcionar como un "Platzi propio" para emprendedores, creadores de contenido, agencias, developers e independientes. Los videos de Metacho Labs (2–3 al día) llevan gente a la web con una palabra clave. La web les entrega algo útil gratis, gana su confianza, captura su correo y les muestra los productos de pago.

**Éxito de la Parte A:** una persona que vio un video llega desde el teléfono, encuentra su guía en menos de 10 segundos (por enlace directo o buscador), la lee, deja su correo para ver el final o el prompt, y ve el producto relacionado con un botón para apartarlo en preventa. Todo sin latencia perceptible.

**Fuera de la Parte A:** cobro y entrega automática de productos (Parte B), los productos en sí (Partes C y D), login, cursos con lecciones y avance.

## 2. Flujo mínimo de punta a punta (se construye primero, sin pulido)

1. Video → "comenta RESEÑA" → DM (ManyChat) con enlace `mlabs.elmetacho.com/recursos/resena`.
2. La guía carga en el teléfono, muestra el resumen y la primera sección completos.
3. El resto queda tras un formulario de correo ("Desbloquear guía completa"). Al enviarlo se guarda el lead (`/api/lead`, origen `guia-resena`) y la guía se abre sin recargar. Si ya desbloqueó antes en ese navegador, se abre directo.
4. Al final de la guía: tarjeta del producto relacionado → página del producto en preventa → formulario "Aparta tu cupo" (lead con origen `preventa-<producto>`).
5. Aviso a Telegram de cada lead (ya existe).

Este flujo debe funcionar con datos reales antes de tocar diseño fino.

## 3. Estructura del sitio

| Ruta (en mlabs.elmetacho.com) | Qué es |
|---|---|
| `/` | Inicio: buscador arriba, accesos por público, guías destacadas, productos, últimas novedades, servicios de la agencia (lo actual, más abajo) |
| `/recursos` | Catálogo completo con filtros por público y por tipo |
| `/recursos/<slug>` | Guía (gratis con correo) |
| `/para/<publico>` | Página pilar por público (SEO): emprendedores, marcas, creadores, ia-y-developers |
| `/productos/<slug>` | Página de producto (preventa en la Parte A) |
| `/novedades` | Novedades de IA de la semana (destino de los videos de interés, CTA NOVEDADES) |
| `/pagar`, `/pagar/resultado` | Ya existen |

## 4. Modelo de contenido (archivos en el repo, sin base de datos)

Cada pieza es un objeto en `src/app/mlabs/contenido/` (un archivo por tipo). Campos comunes:

- `slug`, `palabra` (la que se comenta, p. ej. RESEÑA), `titulo`, `resumen` (1–2 frases, responde la pregunta), `tipo` (guia | prompt | mini-curso | novedad), `publicos` (lista), `tiempo` (minutos de lectura o de aplicación), `actualizado` (fecha), `productoRelacionado` (slug opcional), `secciones` (bloques: p, lista, prompt, tabla, ojo), `seccionesLibres` (cuántas se ven sin correo; por defecto 1).

Producto: `slug`, `nombre`, `promesa` (resultado concreto), `paraQuien`, `queIncluye`, `requisitos` (p. ej. "Claude Pro o superior, Windows o Mac"), `estado` (preventa | disponible), `precioLanzamiento`, `precio`, `moneda`, `fechaEstimada`, `faq`.

Novedad: `slug`, `titulo`, `fecha`, `fuente` (nombre + URL oficial obligatoria), `queEs`, `paraQueTeSirve`, `guiaRelacionada`.

**Regla de verdad:** ninguna novedad ni dato sin fuente verificable; los precios y fechas de productos los define el dueño.

## 5. Componentes

- **Buscador instantáneo** (arriba en todas las páginas de MLABS): índice generado al compilar (título, palabra, resumen, públicos), búsqueda en el navegador, sin servidor. Tolera tildes y mayúsculas ("resena" = "RESEÑA"). Escribir la palabra exacta del video lleva directo a la guía.
- **Tarjeta de contenido**: tipo, título, tiempo, públicos; enlace a la pieza. Una sola acción por tarjeta.
- **Desbloqueo por correo**: formulario corto (nombre, correo, WhatsApp opcional, casilla de datos). Reutiliza `/api/lead`. Recordado en el navegador (localStorage) para no pedirlo en cada guía.
- **Tarjeta de producto relacionado**: aparece al final de cada guía que tenga `productoRelacionado`.
- **CTA fijo "Lo instalamos por ti"**: al final de cada guía (ya existe, se mantiene).
- **Página de producto en preventa**: resultado primero, prueba (video del sistema real), para quién es y para quién no, requisitos honestos, qué incluye, precio de lanzamiento, FAQ, formulario "Aparta tu cupo". Sin cobro en la Parte A.

## 6. Contenido inicial (Parte A)

- Guías existentes: CLAUDE, RESEÑA, RECICLA, COMPETENCIA.
- Nuevas: EDITOR (cómo Claude edita mis videos), NOVEDADES (página semanal), y 6 guías cortas del banco de ideas (FICHA, CALENDARIO, CLIENTE, DICTA, FORMULA, PRECIO), cada una de 3–5 minutos.
- Productos en preventa: **Editor automático con Claude** y **Creador de carruseles con Claude**. Precios y fecha estimada: los define el dueño antes de publicar.

## 7. SEO

- Cada guía es una página indexable con título en forma de pregunta o resultado, resumen que responde en las primeras líneas, `Article` + `HowTo` cuando aplique, y fecha de actualización visible.
- Páginas pilar por público enlazan a sus guías y las guías enlazan de vuelta (grupos de temas).
- Sitemap del subdominio con todas las piezas; `llms.txt` actualizado automáticamente desde el contenido.
- Los contenidos detrás del correo se renderizan en el HTML (visibles para buscadores) y se ocultan visualmente hasta desbloquear. Riesgo conocido: un usuario técnico puede leerlos en el código; se acepta porque el objetivo es el correo voluntario, no proteger el contenido.
- Search Console y Bing Webmaster: los verifica el dueño (registro DNS en Squarespace).

## 8. Rendimiento (presupuesto)

- Todo estático salvo `/api/*`. Sin librerías nuevas pesadas; el buscador es código propio (< 5 KB).
- LCP < 2,5 s y CLS < 0,1 en teléfono de gama media (medido con Lighthouse en modo móvil antes de cada merge).
- Videos solo en inicio y producto, con póster y `preload="none"` fuera de la primera pantalla.
- Analítica: Vercel Web Analytics (sin cookies) para saber qué guía y qué palabra traen más visitas y correos.

## 9. Errores y bordes

- `/api/lead` caído: el formulario muestra el error y ofrece WhatsApp; el contenido NO se desbloquea sin guardar (para no perder el correo), salvo que falle 2 veces: entonces se desbloquea igual y se reintenta en segundo plano.
- Slug inexistente: página 404 con el buscador y las guías destacadas.
- Novedad sin fuente: no compila (validación en el build).

## 10. Pruebas

- Pruebas del buscador (normalización de tildes, búsqueda por palabra clave exacta, sin resultados).
- Prueba de validación del contenido (campos obligatorios, fuente en novedades, producto relacionado existente).
- Prueba de punta a punta en navegador (teléfono): enlace de guía → desbloqueo → lead guardado → tarjeta de producto → preventa → lead guardado.
- `npm run lint` y `npm run build` sin errores antes de cada PR.

## 11. Decisiones pendientes del dueño

1. Precio de lanzamiento y fecha estimada de cada producto en preventa.
2. Cuántas secciones se ven sin dar el correo (propuesta: resumen + primera sección).
3. Cuenta de ManyChat (plan Essential) para los DMs mientras Meta revisa la app.
