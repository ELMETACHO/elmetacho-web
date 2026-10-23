# Brief · elmetacho-web / MLABS

## Qué es
- **elmetacho.com:** web personal de El Metacho (creador de contenido) con portada partida hacia MLABS.
- **mlabs.elmetacho.com:** agencia + "Platzi propio" para emprendedores, creadores, agencias, developers e independientes. Guías gratis (a cambio de correo), novedades de IA y productos instalables de pago.

## Hoja de ruta (cada parte con spec → plan → pruebas)
- **A. (publicada el 2026-10-14, PR #3)** Catálogo con buscador, guías gratis con desbloqueo por correo, novedades, preventas. Spec: `docs/superpowers/specs/2026-10-15-mlabs-parte-a-catalogo-design.md`.
- **B.** Venta y entrega automática: webhook de Bold → correo con descarga y licencia (Resend), términos de venta, derecho de retracto, factura electrónica.
- **C.** Producto: Creador de carruseles con Claude (plugin de Claude Code + beta de 3–5 personas).
- **D.** Producto: Editor automático de video con Claude (plugin + "doctor" de instalación + beta).
- **Admin privado (publicado el 2026-10-22, PR #8 y #9)** `elmetacho.com/admin`: pedidos de comentarios cantados desde el celular; el PC los recoge a las 2 p. m. Spec: `docs/superpowers/specs/2026-10-21-admin-design.md` (§10 = fases siguientes). Uso y variables: `docs/admin.md`.

## Decisiones tomadas
- Sin login por ahora: la entrega de productos será por correo.
- DMs de Instagram con ManyChat (plan Essential) mientras Meta revisa la app M LABS (solo tiene caso de uso de WhatsApp; la verificación de acceso de El Metacho S.A.S. está en revisión desde el 28 de septiembre de 2026).
- Pagos con Bold (Cuenta Bold, persona natural); varios negocios con la misma cédula.
- **Lo gratis no revela el método (2026-10-15):** las guías y las páginas de producto cuentan qué hace y qué resultado da, nunca con qué programas ni cómo. La configuración es para quien compra. Una prueba en `contenido.test.js` falla si aparecen ffmpeg, whisper, Python, Node.js, HyperFrames, NVIDIA, Claude Code o las marcas del guion en guías, productos o públicos.
- **Regla de verdad en el contenido:** ninguna novedad sin fuente https (el build falla). Precios y fechas de los productos los pone el dueño; mientras estén en `null`, la preventa dice «Lo anunciamos primero a quienes aparten su cupo».
- Las preventas no muestran video hasta tener un clip real del producto (`labs.mp4` es el de videos animados, no el del editor).
- La cuenta de Vercel es **Pro**, no Hobby, así que Web Analytics admite eventos personalizados. Hoy los correos por guía se cuentan con el campo `origen` de cada lead en Redis; se puede agregar `track()` después.

## Cómo funciona (para la próxima sesión)
- **Contenido:** `src/app/mlabs/contenido/` (guías, productos, novedades, públicos). `index.js` valida todo al importarse; si algo está mal, `npm run build` falla con la lista de errores. La lógica pura va en `src/app/mlabs/lib/` y se prueba con `npm test` (`node:test`, sin librerías).
- **Desbloqueo por correo:** sin correo se ven el resumen y la primera sección (`seccionesLibres`). El resto viene en el HTML (bueno para SEO), oculto con `.contenido-bloqueado`. Un `<script>` plano en el `<head>` del layout raíz lo muestra antes de pintar si la persona ya dejó el correo (CLS 0). Si `/api/lead` falla, el primer intento muestra el error y el segundo desbloquea igual, con el lead pendiente en el navegador para reintentarlo.
- **Orígenes de los leads** (lista `mlabs:leads` en Redis + aviso a Telegram): `guia-<slug>`, `preventa-<slug>`, `instalar-<slug>` (CTA «Lo instalamos por ti»), `novedades-AAAA-MM-DD`, `mlabs-inicio`.
- **Componentes de cliente:** no pueden importar `contenido/index.js` ni `MlabsMarco.jsx`, porque meterían todo el contenido en el JS que baja el teléfono. Los enlaces de contacto están en `src/app/mlabs/enlaces.js`, y al catálogo se le pasa `tarjetasGuias`, que no lleva el texto de las guías.
- **Vista previa de un PR en Vercel:** está protegida (pide iniciar sesión en Vercel) y no usa el subdominio. Las páginas de MLABS se abren con `/mlabs` adelante (p. ej. `…vercel.app/mlabs/recursos/resena`), y ahí los enlaces internos dan 404. Las variables tienen que estar marcadas también para **Preview**.
- **Admin (`src/app/admin/`):** clave `ADMIN_CLAVE` + cookie firmada (sin `proxy.js`; cada API y la lista verifican la sesión). El PC usa `ADMIN_PC_TOKEN` en `/admin/api/pc/*`. Archivos en Vercel Blob privado (`elmetacho-web-blob`, subida directa del navegador), datos en el mismo Redis (`admin:cantados:*`). Se borra todo `cantados/<id>/` al bajarlo el PC, al cancelar, al fallar y a las 48 h si quedó sin enviar; el registro, al entregar. Lógica pura en `src/app/admin/lib/` con pruebas. Lado del PC: `PREMIERE-CLAUDE/cantados/herramientas/web.py` y `docs/runbook-pasada.md`.
- **Pasos para publicar** (además de la regla 5): `npm test`, `npx eslint --ignore-pattern ".claude/**"` (ver aprendizajes), `npm run build`, probar los leads en la vista previa, fusionar y revisar la URL en vivo.

## Aprendizajes técnicos
- **`next/script` con `strategy="beforeInteractive"` no corre antes de pintar en el App Router:** solo apila el código y lo ejecuta antes de hidratar. Para algo que deba correr antes de pintar, usar un `<script dangerouslySetInnerHTML>` plano en el `<head>` del layout raíz. Si el `<script>` va dentro de un componente de página, React da error al navegar dentro del sitio.
- **`/api/lead` no leía `KV_REDIS_URL`**, que es el nombre que pone la integración de Redis de Vercel. Hasta el 2026-10-14 los leads solo llegaban a Telegram y no quedaban en Redis. Quedó arreglado en `src/app/api/lead/config.js`, con prueba.
- **Lo que llega al teléfono:** si a un componente de cliente se le pasa `guias` completo, todo el texto de las guías termina en el HTML. Hay que pasarle solo los campos de la tarjeta.
- **Velocidad:** el LCP de MLABS es un texto que se repinta cuando carga la fuente Archivo (variable, 88 KB). En Lighthouse móvil, en local: guía RESEÑA 2,42 s, EDITOR 2,71 s, inicio 3,70 s (el inicio de `main` antes de la Parte A: 3,43 s). Bajarlo pide decidir sobre la fuente (`display: optional` o una más liviana).
- **ESLint** también revisa `.claude/worktrees/*/.next` (builds de otras sesiones) y falla. Usar `npx eslint --ignore-pattern ".claude/**"` o borrar esa carpeta. En Vercel no pasa.
- **Windows:**
  - Turbopack no acepta `node_modules` enlazado con junction; hay que correr `npm ci` en la copia.
  - En un heredoc de bash, `\\n` dentro de código Python puede terminar como un salto de línea real; mejor usar la herramienta de edición.
  - El Python de Windows no entiende rutas `/c/...`.
- **Vercel Blob:** al crear el almacén hay que marcar «Add a read-write token env var»; sin `BLOB_READ_WRITE_TOKEN`, `handleUpload` no puede autorizar subidas desde el navegador. `head`, `del` y `list` de `@vercel/blob` 2.8.2 aceptan el pathname.
- **La vista previa protegida también bloquea al PC:** las API con token propio (`/admin/api/pc/*`) no se pueden probar desde fuera en la vista previa; se prueban en producción.
- **Node 24:** `node --test <carpeta>` falla; usar el glob `"src/**/*.test.js"`.
- **Guías:** todo lo que se diga de las herramientas del dueño se verifica en su código. Por ejemplo, `limpiar_v7.py` solo usa texto y audio; no detecta hacia dónde mira la persona.

## Resumen de sesiones
- **2026-10-14:** portada partida, nuevo look (rojo de los videos), MLABS en subdominio, guías CLAUDE/RESEÑA/RECICLA/COMPETENCIA, leads en Redis + Telegram, SEO (JSON-LD, sitemap, robots, llms.txt), pagos con Bold en `/pagar` (compra de prueba aprobada).
- **2026-10-15:** investigación (viabilidad de productos instalables, conversión, SEO, retención). Spec de la Parte A aprobado tal cual. Plan escrito en `docs/plans/2026-10-15-mlabs-parte-a-catalogo.md` (11 tareas; el flujo de punta a punta queda listo en la tarea 4). Pendientes del dueño: precios y fechas de los dos productos, decidir si Sellame es producto (los guiones de RESEÑA lo nombran), guion 36 sin fuente (no entra como novedad), activar Web Analytics en Vercel.
- **2026-10-15 (implementación):** Parte A construida en la rama `feat/mlabs-parte-a` (12 commits, 40 pruebas con `node:test`, lint y build en verde, revisión final hecha y sus 2 puntos importantes corregidos). Incluye: contenido validado al compilar, desbloqueo por correo, preventas (`/productos/editor-automatico`, `/productos/creador-de-carruseles`), buscador, catálogo con filtros, `/novedades`, páginas `/para/*`, inicio nuevo, 404 de MLABS, SEO y Vercel Analytics. Guías nuevas: EDITOR, FICHA, CALENDARIO, CLIENTE, DICTA, FORMULA, PRECIO.
  - Pendiente del dueño: push y PR; precios y fechas de las preventas; activar Web Analytics en Vercel; clip real del editor (sin él la preventa va sin video); revisar textos de guías y productos; decidir Sellame.
  - Avisos para la sesión de VIDEOS: el guion `lab-2026-10-15-27` dice que el editor detecta cuando miras a otro lado (no lo hace: solo texto y audio); el `lab-2026-10-15-34` sugiere que el agente de Gemini ya está en el Gmail de todos (está en vista previa privada para Business/Enterprise).
  - Rendimiento: CLS 0. LCP móvil: RESEÑA 2,42 s; EDITOR 2,71 s e inicio 3,70 s pasan la meta de 2,5 s. La causa es la fuente Archivo y ya ocurría en `main`; arreglarlo es una decisión de diseño.
  - Seguridad: `npm audit` marca `next` 16.2.12 con alertas críticas (incluida `next/og`, que usa `apple-icon.js`); se arregla subiendo a 16.4.1, en una rama aparte.
- **2026-10-15 (novedades semanales):** rama `feat/novedades-semanales`. `/novedades` pasa a ediciones semanales: muestra siempre la más reciente (URL fija para el DM de NOVEDADES), destacado libre y el resto con el desbloqueo por correo de las guías (lead `novedades-AAAA-MM-DD`), archivo en `/novedades/AAAA-MM-DD`, guías relacionadas al final. Primera edición (15 de octubre): Anthropic Academy (con «¿por cuál empiezo?» por curso) y el agente de Gemini con la aclaración de vista previa privada atribuida a 9to5Google (el anuncio oficial de Google no da planes ni fecha). 56 pruebas, `eslint src` y build en verde; probado en vista de teléfono. Cómo agregar ediciones y la regla de ManyChat: `docs/novedades-semanales.md`.
  - Publicado: PR #5 fusionado y en vivo en https://mlabs.elmetacho.com/novedades (archivo: /novedades/2026-10-15).
  - Pendiente del dueño: crear la regla NOVEDADES en ManyChat con el texto del doc; volver a verificar con Google si publica planes y fecha del agente de Gemini.
  - Aviso: `npm run lint` marca 34 errores que vienen de `.claude/worktrees/priceless-hellman-4dca31/.next` (build viejo de otra sesión), no del código; borrar esa carpeta o ignorarla en ESLint.
- **2026-10-14/15 (publicación de la Parte A y confidencialidad):**
  - Publicado y revisado en vivo:
    - PR #1: Next 16.4.1, que cierra 3 alertas críticas (una de ellas en `next/og`).
    - PR #2: ícono de Apple.
    - PR #3: Parte A.
    - PR #4: guía EDITOR y producto sin programas ni método.
  - Leads verificados de punta a punta en la vista previa: llegaron `guia-resena` y `preventa-editor-automatico` a Telegram y a Redis. Para lograrlo se agregó `TELEGRAM_BOT_TOKEN` a Preview en Vercel y se arregló la lectura de `KV_REDIS_URL`.
  - Revisión final de la Parte A con un revisor aparte: 0 críticos. Quedaron arreglados el script de desbloqueo que corría tarde y el catálogo que mandaba el texto de las guías al teléfono.
  - Fuera del repo: se liberaron ~47 GB en C: (versiones viejas de CapCut y el zip de Applio). Las voces, scripts y salidas de `metacho-voz-tts` quedaron en `D:\METACHO CLAUDE\metacho-voz-tts`, sin sus entornos de Python.
  - Pendiente del dueño:
    - Borrar los dos leads «PRUEBA» de `mlabs:leads`.
    - Definir precios y fechas de las preventas.
    - Activar Web Analytics (Proyecto → Analytics → Enable).
    - Conseguir un clip real del editor.
    - Revisar los textos de las 7 guías nuevas.
    - Decidir qué pasa con Sellame.
    - Crear la regla NOVEDADES en ManyChat (ya documentada).
    - Verificar el sitio en Search Console y Bing.
  - Para la sesión de VIDEOS:
    - Los guiones de EDITOR (`lab-2026-10-15-25/26/27`) explican el método y prometen «la guía de cómo lo armé». Hay que ajustarlos a la regla de confidencialidad (p. ej. «Comenta EDITOR y te mando cómo funciona»).
    - El guion 27 además dice que el editor detecta hacia dónde mira la persona, y no es cierto.
  - Por decidir: si la guía RECICLA, que regala el prompt de las siete piezas (incluido el carrusel), también pasa a una versión superficial.
  - Mejoras menores anotadas, sin hacer:
    - El error de red sale en inglés («Failed to fetch»).
    - El lead pendiente se borra antes de reenviarlo, así que puede perderse o duplicarse, y un error 4xx se reintenta siempre.
    - El lead pendiente queda en localStorage sin cifrar; conviene mencionarlo en la política de privacidad.
    - El JSON-LD no escapa «<».
    - Las tarjetas muestran la palabra clave y no los públicos.
    - `/recursos/RESENA` da 404 (podría redirigir a la guía).
    - El 404 de MLABS y las páginas de MLABS usan el título, el `og:title` y el `og:image` de El Metacho.
    - El inicio tiene dos buscadores.
    - `npm test` muestra el aviso `MODULE_TYPELESS_PACKAGE_JSON`.
  - Sigue: la Parte B (cobro con Bold y entrega automática por correo), empezando por lluvia de ideas y spec.
  - Ramas que ya se fusionaron y se pueden borrar: `spec/mlabs-parte-a`, `feat/mlabs-parte-a`, `fix/next-seguridad`, `fix/apple-icon` y `fix/guias-confidenciales`. La rama `docs/brief-parte-a-publicada` quedó reemplazada por esta entrada.
- **2026-10-21/22 (admin de cantados):** lluvia de ideas → spec → plan (13 tareas) ejecutado con subagentes y revisión por tarea + revisión final de toda la rama. Publicado `elmetacho.com/admin` (PR #8) y `Disallow: /admin` (PR #9); comprobado en vivo (portada, MLABS, robots, `/admin` pide clave, API sin clave = 401) y el PC ya lee los pedidos desde producción. El dueño creó el Blob privado y puso `ADMIN_CLAVE`/`ADMIN_PC_TOKEN`; primer pedido real subido desde el admin y en producción en una sesión aparte. Decisiones: franja de las 2 p. m.; sin aprobación de letra en pedidos web; bucle sin tope con aviso > 25 s; Telegram queda de respaldo sin rehacer repetidos; nada vive en la nube tras bajar. Riesgo conocido: un pedido atascado en «el PC lo está haciendo» no se cancela desde la web (ver `docs/admin.md`).
  - Sigue: fase 2 del admin (subir video + gancho, Claude escoge comentarios y Oscar los revisa en la web), investigación de la política de Meta para reeditar videos monetizados (fase de «remix»), revisión de las 5 vulnerabilidades altas de npm (sesión aparte) y Parte B (sesión aparte).
- **2026-10-22 (madrugada, fase 2 y remix):** con autorización del dueño («vayas avanzando y publiques») se construyeron y publicaron la fase 2 «por link» (PR #11: propuesta de comentarios que Oscar revisa en `/admin/cantados/<id>/revisar`, pantallazos cuando TikTok bloquea) y el **remix** (PR #13: rehacer un cantado publicado con los mismos comentarios reales, otro orden y otra canción). Spec y planes en el PR #12 (lo aprueba el dueño). Comprobado en vivo: portada, MLABS, `/admin` y API sin credencial = 401. Pendiente: un pedido real por link y un remix real de punta a punta; mirar las pantallas nuevas en el celular; el primer remix es la prueba de monetización (panel de riesgo de Meta).
