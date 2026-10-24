# Admin de cantados (`/admin`)

Página privada de elmetacho.com para pedir videos de "comentarios cantados" desde el celular. Reemplaza (sin quitar) el pedido por el bot de Telegram. Spec: `docs/superpowers/specs/2026-10-21-admin-design.md`. Código: `src/app/admin/`.

## Qué es y el flujo

1. **Celular → web.** Oscar entra a `/admin`, sube el video original, marca los bucles, sube su gancho y los pantallazos, y envía el pedido. Los archivos van directo del navegador a Vercel Blob (privado); los datos del pedido quedan en Redis.
2. **PC a las 5 a. m.** La tarea programada "cantados-pasada" pregunta a la web por los pedidos `listo`, baja los archivos con enlaces firmados (12 h), verifica el tamaño de cada uno y marca `bajado`. Ahí la web **borra los blobs**.
3. **Producción y entrega.** El PC produce (sistema `PREMIERE-CLAUDE/cantados`) y entrega los dos cortes por Telegram. Al entregar, el PC llama `DELETE` y la web **borra el registro** de Redis.
4. **Nada queda en la nube.** Todo lo que haya bajo `cantados/<id>/` en Blob se borra **por prefijo** (se lista el prefijo y se borra cada blob, así caen también las subidas reemplazadas o nunca registradas, p. ej. un `gancho.mp4` cambiado por un `gancho.mov`) en cuatro momentos: al bajar el PC, al cancelar, en la purga de borradores de más de 48 h y al entregar. El registro de Redis se borra al entregar o cancelar. **La purga de 48 h solo corre cuando el PC consulta la lista**: si la tarea del PC está pausada, los borradores esperan hasta la siguiente consulta.

Telegram sigue de respaldo. Si un pedido de Telegram es igual a uno de la web (título y duración ±0,5 s) queda como repetido y no se hace.

## Stories de Facebook (2026-10-22, spec `PREMIERE-CLAUDE\cantados\docs\2026-10-22-stories-design.md`)

Prueba de una semana: 3 cantados al día que salen como **story de Facebook**, de videos virales distintos a los de los reels.

1. **Nuevo video → Story.** Es el mismo formulario de «Con pantallazos»: original, tramos, gancho, pantallazos y estilo. El pedido se guarda como `tipo: "pantallazos"` con `destino: "story"`. Los pedidos sin `destino` son reels. La API no deja crear una story de otro tipo (400). Al enviar llega al bot «📥 Recibí la story: <nombre> — sale a las 5 a. m.».
2. **Lista.** El pedido lleva la etiqueta «Story» junto al nombre. Todo lo demás (estados, cancelar) es igual.
3. **PC.** `GET /admin/api/pc/pedidos` incluye `destino`. El PC lo hace igual que un pedido con pantallazos, pero **sin corto de YouTube**, y lo entrega por el bot como un solo video con el pie «📱 STORY de Facebook — no subir como reel».

## Pedidos por link (fase 2, spec `docs/superpowers/specs/2026-10-22-admin-fase2-design.md`)

1. **Nuevo video → Por link.** Pega el link de TikTok (`https://www.tiktok.com/…`, `https://vm.tiktok.com/…` o `https://vt.tiktok.com/…`; otro no deja enviar), sube el video, marca los tramos y sube tu gancho. No lleva pantallazos.
2. **Franja de las 5 a. m. (día 1).** El PC baja los archivos (la web los borra), lee los comentarios en TikTok con el original subido, Claude escoge y revisa con el reglamento y publica la **propuesta**: el pedido pasa a `en_revision` y llega al bot un aviso con el enlace `…/admin/cantados/<id>/revisar`.
3. **Revisión (celular).** Tarjetas en orden: ✓ = dentro, ✕ = a «Fuera» (no deja quitar el último comentario que queda), ↑↓ = mover, ✎ = corregir la línea que se canta (termina en coma; si no la pones, se agrega). En «Fuera», ↩ lo vuelve a meter al final. Cada cambio se guarda solo. «Aprobar» → `aprobado`. «Trae más» → la franja siguiente pone otros en lugar de los que quitaste y vuelve el enlace (si no quitaste ninguno llega «No quitaste ninguno…»; si no hay con qué reponer, «No hay más comentarios para reponer…»; en los dos casos sigue en revisión con 24 h nuevas). Mientras «Aprobar» o «Trae más» están en camino, los botones de edición quedan desactivados.
4. **Plazo.** 24 h desde la propuesta; se da por vencida **2 h antes** para que la franja del día siguiente la recoja con la lista como esté (la pantalla dice «se aprueba solo en N h»). Ojo: una propuesta publicada después de ~7 a. m. vence después de la franja del día 2, así que se aprueba sola en la del **día 3**.
5. **Franja siguiente (día 2).** El PC trae los aprobados, aplica la lista final, hace la canción, edita y entrega; al entregar se borra el registro.
6. **TikTok pide sesión o captcha.** El pedido pasa a `necesita_pantallazos` y llega el aviso con `…/admin/cantados/<id>/pantallazos`. Sube las fotos en orden en esa página y toca «Enviar pantallazos»; la franja siguiente lo hace como pedido con pantallazos. Mientras el PC no lo haya bajado, `necesita_pantallazos` se puede cancelar.

En Redis solo hay texto: la propuesta (`id`, usuario, texto, línea, likes, dentro) y la revisión (orden, fuera, líneas corregidas). Nada de imágenes.

**Versión de la propuesta.** Las APIs de revisión de sesión exigen la `version` de la propuesta en el cuerpo: `{orden, fuera, lineas, version}` en `PATCH …/revision` y `{version}` en `aprobar` y `trae-mas`. Si la propuesta cambió (llegó una nueva), responden 409 «La propuesta cambió: recarga la página.». Un cuerpo JSON `null` o que no sea objeto se trata como `{}`.

### Estados

`subiendo` → `listo` → `en_pc` → (por link) `en_revision` → `aprobado` → (borrado al entregar); (remix) `en_pc` → (borrado al entregar), sin revisión. Ramas: `en_pc` → `necesita_pantallazos` → `en_pc` (por link o remix); `fallido`. No se puede cancelar en `en_pc`, `en_revision` ni `aprobado` (el PC ya tiene el proyecto); `necesita_pantallazos` sí, hasta que el PC lo baje.

## Remix (fase 2, spec `docs/superpowers/specs/2026-10-22-admin-fase2-design.md` §2.4–8, §5, §7)

Reeditar un cantado ya publicado: los mismos comentarios en otro orden, otra canción y gancho nuevo. El tipo `remix` ya está disponible en la web (`TIPOS_DISPONIBLES`); el PC lo hace con `PREMIERE-CLAUDE/cantados` (`herramientas/remix.py`, `docs/runbook-pasada.md`).

1. **Nuevo video → Remix.** Pega el link del TikTok **original**, sube **tu video ya publicado** (el cantado tal como salió; también sirve el corte corto de YouTube), el **clip original** sin editar (marca los tramos como siempre) y tu **gancho nuevo**. El título es opcional. No hay selector de estilo ni pantallazos. Si el publicado lo hizo este sistema, el PC saca el estilo contrario al suyo (salsa ↔ merengue) y el color de karaoke que sigue al que tenía; si no (remix por tarjetas, p. ej. un video de Premiere), no hay proyecto previo y estilo y color salen por turno, alternando como en un pedido nuevo. «Enviar pedido» se activa con link, publicado, clip, ≥ 1 tramo y gancho. Llega aviso al bot: «📥 Recibí: <nombre> — remix: sale a las 5 a. m., sin revisión (mismos comentarios en otro orden, con otra canción).»
2. **Franja de las 5 a. m. (el mismo día, sin revisión de letra).** El PC baja los tres videos (la web los borra) y busca los comentarios:
   - Si el publicado lo hizo este sistema (mismo link o mismo video de TikTok, y un corte renderizado que dura lo mismo ±1 s), los toma de su proyecto viejo, con sus textos ya revisados.
   - Si no (p. ej. un video hecho en Premiere), lee las tarjetas del publicado (un cuadro cada 0,5 s + OCR) y las empareja con los comentarios de TikTok (usuario, likes y foto reales). Las que no aparecen en TikTok se **dibujan** con el texto real que se leyó, un usuario inventado y neutro, sin likes y con avatar genérico.
   - Todo texto dudoso se corrobora con el audio del publicado (whisper: lo que se canta mientras la tarjeta está en pantalla) y Claude lo compara con el cuadro antes de cantarlo. Nunca se inventa texto: si no se lee ni se oye, ese comentario queda fuera.
   - Reordena (el primero sale de los más graciosos; ninguno queda en su puesto anterior cuando se puede), hace la canción, edita y entrega los dos cortes. **El resumen del bot dice cuántas tarjetas se dibujaron y cuáles son (los primeros 40 caracteres de cada una).**
3. **«Subir pantallazos» (TikTok bloquea o no se leyeron tarjetas).** El PC pasa el pedido a `necesita_pantallazos` y llega el aviso con `…/admin/cantados/<id>/pantallazos`. La pantalla pide los pantallazos de los comentarios que salen en tu video publicado, **en el orden en que aparecen en el video**, y «Enviar pantallazos» lo devuelve a la franja siguiente. Dos casos: TikTok pide sesión o captcha (los pantallazos se emparejan con las tarjetas leídas) o no se pudo leer ninguna tarjeta (los pantallazos pasan a ser las tarjetas, en el orden que subiste). Si tampoco se lee nada en las fotos, queda `fallido` con el motivo.
4. **Riesgo de monetización (spec §2.8):** el primer remix es una prueba. Se publica y se mira el panel de riesgo de monetización de Meta antes de hacer más.

En Redis el remix solo agrega la ranura `publicado` (archivo `cantados/<id>/publicado.<ext>`, que se borra al bajar el PC, como los demás).

## Cabina (2026-10-23, spec `docs/superpowers/specs/2026-10-23-admin-cabina-design.md`)

Los candidatos que saca el sondeo del PC de los links de TikTok se revisan aquí, no en la Cabina local (`herramientas/cabina.py`, que queda de respaldo hasta la primera corrida real buena). **Oscar solo graba el gancho y, si quiere, cambia el orden; Claude hace el resto.**

1. **Franja de las 5 a. m. (PC).** Por cada candidato: `POST /admin/api/pc/cabina` (texto: link, comentarios con likes, respuestas y si traen imagen/GIF, y las medidas de la vista previa) → `{id}`. Luego, **de a un archivo**, `POST …/<id>/subida` con `{pathname, tamano}` → `{token}` y sube con `put(pathname, archivo, {access: "private", token})` de `@vercel/blob/client`: la vista previa (`cantados/<id>/vista.mp4`, ≤ 50 MB; son los primeros 180 s del original a 480p) y cada medio (`cantados/<id>/mNN.<ext>`, NN = posición del comentario, ≤ 20 MB). Al final `POST …/<id>/publicar`: la web comprueba cada archivo contra el tamaño anunciado y lo pasa a `en_revision` con `vence` = publicada + **72 h** (se da por vencido 2 h antes, a las 70 h). La web **no avisa por candidato**: el PC manda un resumen por franja a Telegram («🎬 Cabina: N candidatos nuevos»).
2. **Lista.** Arriba de los pedidos sale **«Cabina (N)»** con cada candidato en revisión (el que vence antes primero), sus comentarios y «sale solo en N días». Los pedidos normales no muestran candidatos.
3. **Candidato (`/admin/cabina/<id>`).** Video de la vista previa (enlace firmado de 12 h que pide la página a `GET /admin/api/cabina/<id>/medios`) con el editor de **hasta 3 tramos**; comentarios con usuario, ♥ likes, ↩ respuestas, texto, imagen o GIF y la línea grande; ⠿ arrastrar, ↑↓, ✎ corregir, ✕ sacar, «Fuera» con ↩; subir **tu gancho** (barra y «Reintentar»; aviso si no es 1080p); destino **Reel | Story**. **Aprobar** se activa con gancho y al menos un tramo y espera el último guardado. **Descartar** pide confirmación y borra el candidato de Blob y Redis al instante.
4. **Sin revisar en el plazo.** Se da por vencido a `vence − 2 h` (70 h; la misma holgura `HOLGURA_FRANJA_H` de los pedidos por link), así la franja de las 5 a. m. del **día 3** lo recoge. La consulta del PC (`GET /admin/api/pc/cabina`) lo pasa a `automatico` y lo recibe con el **orden propuesto** de los comentarios dentro (story corta, spec §6). Uno publicado después de las 7 a. m. del día 0 vence después de la franja del día 3 y sale en la del día 4.
5. **Franja siguiente (PC).** `GET /admin/api/pc/cabina` → `{decididos, vivos}` (`vivos` = todos los candidatos que existen, en cualquier estado); baja el gancho firmado, `POST …/<id>/bajado` (la web borra el prefijo en Blob y deja `en_pc`) y, al entregar, `DELETE /admin/api/pc/cabina/<id>`. Los ids que el PC tenía y ya no están en `vivos` son descartados.
6. **Purga** (en cada `GET /admin/api/pc/cabina`, **antes** de vencer): sin publicar a las 24 h y en revisión más de 7 días → se borran prefijo y registro (así, si el PC no consulta en una semana, no salen todos de golpe como stories).

**Estados:** `subiendo` (el PC está subiendo; no se ve en la lista) → `en_revision` → `aprobado` (Oscar) | `automatico` (vencido a las 70 h) → `en_pc` (bajado) → borrado (entregado). Descartar = borrar (solo en `subiendo` o `en_revision`; decidido → 409).

**Redis:** el candidato es un pedido con `tipo: "cabina"`, `origen: "sondeo"`, `destino`, `link`, `vista_previa: {pathname, tamano, duracion, ancho, alto}`, `propuesta` y `revision` como los pedidos por link (cada comentario con `likes`, `respuestas` y `medio: {pathname, tipo, tamano}`), `tramos` (contra la duración de la vista previa) y `gancho`. Mientras está `subiendo`, los comentarios viven en `comentarios_cabina`.

**PATCH de un candidato** (`PATCH /admin/api/cantados/<id>`): solo `tramos`, `destino` y `gancho`, y solo en `en_revision` (vencido → 409). El orden y las líneas van por `PATCH …/revision` como en Revisar. La página guarda todo en **una sola fila** porque el servidor reescribe el registro entero. El gancho se sube como en los demás pedidos (multipart desde 20 MB).

**El flujo por link no ve la Cabina:** `GET /admin/api/pc/aprobados` no lista ni aprueba candidatos.

**Arrastre (Cabina, Revisar y pantallazos).** Con eventos de puntero desde el asa ⠿ (sirve con el dedo), raya verde donde cae y desplazamiento solo cerca de los bordes; se guarda igual que con las flechas. **Pantallazos** (Nuevo video y Subir pantallazos): cada uno a lo ancho, hasta 60 % del alto de la pantalla, número grande y nombre pequeño.

## Cómo se usa desde el celular

1. Abre `elmetacho.com/admin` (o la vista previa del PR), escribe la clave y entra. La sesión dura 30 días.
2. **Nuevo video** → pantalla de nuevo pedido:
   1. **Video original:** elígelo; empieza a subir con barra de progreso y ya puedes marcar tramos sin esperar.
   2. **Bucles (máx. 3):** con el reproductor usa "Marca inicio" / "Marca fin", ajusta con −1 s, −0,1 s, +0,1 s, +1 s, prueba cada tramo con ▶ y bórralo con 🗑. Muestra el total ("Contexto: 10 s"); **si pasa de 25 s sale un aviso amarillo** (no bloquea). No deja tramos solapados ni fuera de la duración.
   3. **Gancho:** tu video; **si es menor de 1080p avisa** (no bloquea). **Título** es opcional: vacío, el PC lo transcribe del gancho.
   4. **Pantallazos:** selección múltiple (hasta 40); ↑↓ para reordenar, ✕ para quitar.
   5. **Estilo:** Salsa / Merengue / Salsa y merengue (por defecto).
   6. **Enviar pedido:** se activa con original subido, ≥ 1 tramo, gancho y ≥ 1 pantallazo. Llega aviso al bot: "Recibí: … sale a las 5 a. m.". Si faltan `TELEGRAM_BOT_TOKEN` o `TELEGRAM_CHAT_ID`, el pedido se envía igual, sin aviso.
3. En la lista puedes **Cancelar** un pedido en `listo`, `subiendo` o `fallido` (no en `en_pc`, `en_revision` ni `aprobado`). Si se corta la señal en una subida, sale "Reintentar" y el pedido sigue en `subiendo`.

## Variables de entorno

Las pone Oscar; nunca se escriben en el repo (es público) ni las abre Claude.

| Variable | Dónde se pega | Para qué |
|---|---|---|
| `ADMIN_CLAVE` | Vercel (Production y Preview) y `.env.local` | Clave de entrada a `/admin`; también deriva la llave que firma la cookie |
| `ADMIN_PC_TOKEN` | Vercel (Production y Preview) y `PREMIERE-CLAUDE/.env` | Clave del PC (`Authorization: Bearer …`) para las rutas `api/pc/*` |
| `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID` | Las crea Vercel al conectar el almacén Blob | Subidas del navegador y enlaces firmados |
| `KV_REDIS_URL` | Ya existe en Vercel (Redis del sitio) | Pedidos y contador de intentos |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Ya existen en Vercel | Aviso "Recibí…" al enviar un pedido |

**Recomendación:** `ADMIN_CLAVE` larga y aleatoria (**20 caracteres o más**). Si alguien roba la cookie, puede intentar adivinar la clave sin conexión (la cookie va firmada con una llave derivada de ella); el límite de 5 intentos no lo frena. Lo mismo para `ADMIN_PC_TOKEN`. Genéralas con un administrador de contraseñas.

## Crear el almacén Blob privado

Vercel → proyecto → **Storage** → **Create** → **Blob** → acceso **Private** → conectarlo a **Production** y **Preview** (y **Development** si se prueba en local). Vercel crea `BLOB_READ_WRITE_TOKEN` y `BLOB_STORE_ID`. Después, redeploy.

## Cambiar la clave

Cambia `ADMIN_CLAVE` en Vercel y haz redeploy: **todas las sesiones caen** (la cookie queda inválida). Cinco intentos fallidos desde una misma IP bloquean 15 min (contador en Redis; INCR y EXPIRE van juntos en una transacción MULTI, así la clave nunca queda sin vencimiento; el plazo se renueva con cada fallo); mientras esté bloqueada, el login responde 429. Para el PC: cambia `ADMIN_PC_TOKEN` en Vercel y en `PREMIERE-CLAUDE/.env`.

## API

| Ruta | Quién | Qué hace |
|---|---|---|
| `POST /admin/api/entrar` | Cualquiera (con límite de intentos) | Verifica la clave y pone la cookie |
| `POST /admin/api/salir` | Sesión | Borra la cookie |
| `POST /admin/api/cantados` | Sesión | Crea pedido `subiendo`; cuerpo `{tipo}`: `pantallazos` (por defecto), `link` o `remix` |
| `PATCH /admin/api/cantados/<id>` | Sesión | Guarda link, tramos, título, estilo, pantallazos, archivos subidos (`original`, `gancho` y, solo en remix, `publicado`) (en `necesita_pantallazos` solo acepta pantallazos) |
| `POST /admin/api/cantados/<id>/enviar` | Sesión | Valida, pasa a `listo`, avisa a Telegram; en `necesita_pantallazos` marca `pantallazos_listos` y avisa |
| `DELETE /admin/api/cantados/<id>` | Sesión | Cancela (o descarta un candidato de la Cabina en `subiendo`/`en_revision`): borra el prefijo en Blob y el registro (no en `en_pc`, `en_revision` ni `aprobado` de un pedido normal, ni en un candidato decidido); si no existe responde ok |
| `POST /admin/api/cantados/subir` | Sesión | `handleUpload` de Blob (tipos video/imagen); sin sesión responde 400 con el mensaje, no 401 |
| `GET /admin/api/pc/pedidos` | Solo PC | Pedidos `listo` (con `tipo`, `link`, `estado` y `publicado` firmado en remix) y `necesita_pantallazos` con pantallazos enviados (`original`/`gancho`/`publicado` en `null`), con enlaces firmados; limpia borradores > 48 h |
| `POST /admin/api/pc/pedidos/<id>/bajado` | Solo PC | Pasa `listo` y `necesita_pantallazos` a `en_pc`, borra sus blobs (también el publicado), deja los archivos en `null` y los pantallazos en `[]` |
| `POST /admin/api/pc/pedidos/<id>/fallido` | Solo PC | `fallido` + motivo; **borra todos los archivos del pedido** y quita `propuesta` y `revision` (el texto solo vive mientras está en revisión) |
| `DELETE /admin/api/pc/pedidos/<id>` | Solo PC | Entregado: borra el prefijo en Blob (por si quedó algo) y el registro |
| `PATCH /admin/api/cantados/<id>/revision` | Sesión | Guarda `{orden, fuera, lineas, version}` completo; 409 si ya no está en revisión, pidió más, venció o la `version` ya no es la vigente |
| `POST /admin/api/cantados/<id>/aprobar` | Sesión | Cuerpo `{version}`; `en_revision` → `aprobado` (409 si la propuesta cambió) |
| `POST /admin/api/cantados/<id>/trae-mas` | Sesión | Cuerpo `{version}`; marca «trae más» (la revisión queda congelada hasta la franja) |
| `POST /admin/api/pc/pedidos/<id>/propuesta` | Solo PC | Publica la propuesta, `en_revision`, vence en 24 h, aviso con enlace → `{ok, version, vence}`. **Idempotente:** si el pedido está `en_revision` o `aprobado` y llega la misma propuesta (mismos ids, orden, líneas y «dentro»), responde 200 con la `version`/`vence` guardados sin tocar la revisión ni avisar otra vez. Si no, 409 salvo que esté `en_pc`, `necesita_pantallazos` o `en_revision` con «trae más»; el 409 trae `{error, estado, version}` |
| `GET /admin/api/pc/aprobados` | Solo PC | Aprobados (y vencidos, que se aprueban solos) y los que piden más, con su lista final |
| `POST /admin/api/pc/pedidos/<id>/necesita-pantallazos` | Solo PC | Pedido por link o remix bloqueado por TikTok (`en_pc` → `necesita_pantallazos`): pide pantallazos con aviso. Repetido sobre un pedido que ya está en `necesita_pantallazos` → 200 sin cambios ni aviso nuevo |
| `POST /admin/api/pc/pedidos/<id>/trae-mas-atendido` | Solo PC | Cuerpo opcional `{motivo}`: `"sin_quitados"` → aviso «No quitaste ninguno…»; si no, «No hay más comentarios para reponer…». Vuelve a revisión con 24 h nuevas |
| `POST /admin/api/pc/cabina` | Solo PC | Crea un candidato `subiendo` `{link, comentarios, vista}` → `{id}`; 400 si los datos no sirven; 503 si no hay id libre |
| `POST /admin/api/pc/cabina/<id>/subida` | Solo PC | `{pathname, tamano}` → `{token}` de subida de 1 h para la vista (≤ 50 MB, `video/mp4`) o un medio (≤ 20 MB, `image/*`/`video/mp4`) de ese candidato; guarda el tamaño anunciado. 400 ruta ajena o tamaño malo; 409 si no está `subiendo` |
| `POST /admin/api/pc/cabina/<id>/publicar` | Solo PC | Comprueba los archivos y pasa a `en_revision` (`vence` = +72 h; vencido 2 h antes), sin aviso por candidato → `{ok, version, vence}`; repetido → 200 igual; faltan → 409 `{error, faltan}` |
| `GET /admin/api/pc/cabina` | Solo PC | Purga, pasa a `automatico` los vencidos y responde `{decididos, vivos}` con el gancho firmado (12 h) |
| `POST /admin/api/pc/cabina/<id>/bajado` | Solo PC | `aprobado`/`automatico` → `en_pc`, borra el prefijo en Blob; repetido → 200; sin decidir → 409 |
| `DELETE /admin/api/pc/cabina/<id>` | Solo PC | Entregado: borra prefijo y registro; un id que no es de la Cabina → 404 sin borrar |
| `GET /admin/api/cabina/<id>/medios` | Sesión | `{vista, medios: {idComentario: url}}` firmadas 12 h, solo en `en_revision` (otro estado → 409) |

Sin sesión → 401 (salvo `subir`, que da 400; y el login, que puede dar 429 si está bloqueado). El token del PC no sirve en las rutas de sesión y la cookie no sirve en las del PC. No hay `proxy.js`: la sesión se verifica en `layout.jsx` y al inicio de cada API.

## Límites

- Subida: **2 GB por archivo** (`maximumSizeInBytes`), tipos `video/*` e `image/*`.
- Cabina: vista previa ≤ 50 MB, cada imagen/GIF ≤ 20 MB, hasta 80 comentarios (`likes` entero o `null`, `respuestas` entero, 0 si no se sabe; GIF como `.gif`), vence a las 70 h (72 − 2), purga a las 24 h (sin publicar) y a los 7 días (en revisión).
- Hasta **3 tramos** de bucle, sin tope de duración (aviso a los 25 s; el PC no recorta; más de 7 s activa zooms cada 3 s).
- Hasta **40 pantallazos** por pedido.
- Borradores sin enviar: 48 h.

## Lo verificado de `@vercel/blob` 2.8.2

Verificado en los tipos instalados y con `build` (Task 6):
- `head()` y `del()` aceptan pathname (no hace falta guardar URL); `del()` acepta lista.
- `issueSignedToken({pathname, operations, validUntil, ...})` y `presignUrl(token, {operation: "get", pathname, access: "private"})` exportados desde `@vercel/blob`.
- `handleUpload` y `upload` en `@vercel/blob/client`; `onBeforeGenerateToken(pathname, clientPayload, multipart)` devuelve `allowedContentTypes` (admite comodines como `video/*`), `maximumSizeInBytes`, `addRandomSuffix`, `allowOverwrite`, etc.
- `list({prefix, cursor})` devuelve `{blobs, cursor, hasMore}`; se usa para el borrado por prefijo (probado solo con un doble, no contra un almacén real).
- Pruebas (2026-10-22): `npm test` 94 pasan, 0 fallan; `eslint` sin salida; `npm run build` OK. El build no necesita variables.
- Fase 2 por link (2026-10-22): `npm test` 139 pasan, 0 fallan; `npx eslint --ignore-pattern ".claude/**"` sin salida; `npm run build` OK.
- Remix (2026-10-22): `npm test` 149 pasan, 0 fallan; `npx eslint --ignore-pattern ".claude/**"` sin salida; `npm run build` OK.
- `generateClientTokenFromReadWriteToken({pathname, maximumSizeInBytes, allowedContentTypes, allowOverwrite, addRandomSuffix, validUntil})` exportada desde `@vercel/blob/client`; sin `token` usa `BLOB_READ_WRITE_TOKEN` (dist/client.js). Tamaño máximo de un blob: 5 TB; multipart solo recomendado desde 100 MB (docs «Vercel Blob Pricing», actualizadas 2026-09-23).
- Cabina (2026-10-23): `npm test` 202 pasan, 0 fallan; `npx eslint --ignore-pattern ".claude/**" src/app/admin` sin salida; `npm run build` OK.

## Lo que NO se ha probado

- **Subida real a Blob** (nunca se corrió contra un almacén real; solo tipos y build).
- **Enlaces firmados reales** (que el PC los descargue de verdad).
- **Punta a punta:** pedido real desde el celular, franja a mano en el PC, llegada por Telegram y comprobación de que Blob y las llaves `admin:cantados:*` quedan vacíos.
- Vista de teléfono en la vista previa del PR.
- **Fase 2 por link:** revisión real en el celular, aviso real del bot con el enlace y un pedido real de punta a punta.
- **Remix:** un remix real de punta a punta (uno de un video de este sistema y uno de Premiere), la lectura de tarjetas sobre videos nuevos, el emparejamiento con TikTok real, la pantalla de remix en el celular y el remix por tarjetas con estilo y color por turno (solo se probó con dobles).
- **Cabina:** token de subida real del PC con `put` de `@vercel/blob/client`, video firmado reproduciéndose y buscando (Range) en el celular, GIF `.gif` animado y medios `.mp4` en bucle, arrastre real con el dedo (iPhone y Android), un gancho grande (multipart desde 20 MB) por datos móviles, y un candidato de punta a punta (Task 12 del plan).

## Seguridad

- Repo público: no hay nada sensible en el código; las claves viven en variables de Vercel y archivos `.env` locales.
- Cookie `admin_sesion`: httpOnly, Secure, SameSite=Lax, 30 días, firmada HMAC-SHA256; clave comparada en tiempo constante.
- `/admin` lleva `noindex, nofollow`; no está en `sitemap.js` ni en `llms.txt`.
- `Disallow: /admin` en `src/app/robots.js` va en un **PR aparte** (archivo compartido; lo aprueba Oscar).
- Los blobs son privados; solo se leen con enlaces firmados de 12 h que entrega la API del PC.

## Riesgos conocidos

- **Pedido atascado en `en_pc`, `en_revision` o `aprobado`.** Si el PC nunca lo termina (ni lo marca entregado ni fallido), queda un registro en Redis que no se puede cancelar desde la web (cancelar responde 409 en esos tres estados). Para limpiarlo: pídele a Claude que llame `DELETE /admin/api/pc/pedidos/<id>` con el token del PC (`ADMIN_PC_TOKEN`), o borra la clave `admin:cantados:<id>` en Redis (y quita el id del set `admin:cantados:ids`).
- **Publicar con 409.** Si una pasada publicó la propuesta y se perdió la respuesta, la siguiente la repite (`enviar-letras` reintenta en cada pasada los pedidos por link `por_revisar` + `revisado`) y la web responde 200 con la misma versión: el PC sigue solo, sin intervenir. Por eso un 409 con `estado` `en_revision` o `aprobado` significa que **la web tiene otra lista** distinta a la del PC: el PC **no** la adopta (con su numeración se perderían comentarios que aprobaste), deja el pedido en `por_revisar` con `propuesta_en_conflicto` y la versión de la web, lo anota en el informe («la web tiene otra propuesta (vN) de <carpeta>: revísalo a mano»), te avisa una sola vez por Telegram y `enviar-letras` deja de reintentarlo. Claude lo resuelve a mano: compara la lista de la web (la página de revisión) con la del PC; si vale la del PC y el pedido sigue `en_revision`, te pide pulsar «Trae más» en la web y repite `publicar-propuesta` (la web la acepta como versión nueva y el conflicto se limpia); si vale la de la web o ya está `aprobado`, te pregunta qué hacer (p. ej. borrar el pedido con `DELETE /admin/api/pc/pedidos/<id>` y pedirlo otra vez). Con otro estado (p. ej. `listo` porque falló «bajado») el PC no cambia nada, lo anota en el informe y lo reintenta en la próxima pasada; si se repite varios días, míralo a mano. Si responde 404 (lo cancelaste en la web), el pedido local pasa a `fallido`. Si tras limpiar las líneas no queda ningún comentario dentro, el PC no publica: lo marca `fallido` («la propuesta quedó sin comentarios») y la web lo recibe por `fallido`.
- **Pantallazos con respuesta perdida.** Si la web pasó a `necesita_pantallazos` pero el PC no se enteró, el PC igual baja los pantallazos cuando lleguen (su pedido sigue por link en `recibido`), y si vuelve a pedirlos la web responde 200 sin avisar de nuevo.
- **Recargar la página de pantallazos** pierde la lista de fotos ya subidas en pantalla (los archivos quedan en Blob, pero la lista que se envía hay que volver a armarla).
