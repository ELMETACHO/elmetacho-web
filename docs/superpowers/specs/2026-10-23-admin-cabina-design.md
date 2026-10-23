# Admin · Cabina en la web: candidatos del sondeo para aprobar desde `/admin`

Fecha: 2026-10-23 · Estado: borrador para revisión del dueño · Base: `2026-10-21-admin-design.md` (fase 1) y `2026-10-22-admin-fase2-design.md` (por link y remix) · Repos: `elmetacho-web` (web) y `PREMIERE-CLAUDE/cantados` (PC) · Plan: después de aprobar esta spec.

## 1. Propósito

Hoy la Cabina es una página local del PC (`herramientas/cabina.py`, puerto 8765): muestra los candidatos que el sondeo nocturno saca de los links de TikTok, y Oscar marca bucle, ordena comentarios, escribe estilo y copia estilo/letra/título para hacer él la canción en Suno. Se lleva a `elmetacho.com/admin` para que **todo se revise en un solo lugar** y con el reparto de trabajo nuevo:

> **Oscar solo graba el gancho y, si no le gusta, cambia el orden. Claude hace el resto** (comentarios, líneas, canción, render, entrega).

**Éxito:**
- Cada día hay **10–15 candidatos** en `/admin` → Cabina.
- Oscar aprueba uno en 1–2 minutos desde el celular: ve el video, ordena (arrastrando o con flechas), marca tramos y sube su gancho.
- Lo aprobado sale en la franja de las 2 p. m. siguiente. Lo que no revise en 3 días sale solo como story corta.
- En Vercel solo viven los candidatos sin decidir. Al aprobar, descartar o vencer, todo pasa al PC y se borra de la nube.
- **Todo corre en la franja de las 2 p. m.; nada en la madrugada.**

**Fuera de alcance:** publicar en redes; elegir canción o estilo desde la web; editar la letra entera (solo línea por línea, como en Revisar); sondear Instagram o TikToks con login; cambiar el formato del reel largo.

## 2. Decisiones (2026-10-23, con Oscar)

1. La Cabina se muda a `/admin`. La local queda de respaldo hasta la primera corrida real buena y luego se retira.
2. **Se lleva** de la Cabina: lista de candidatos, video, comentarios con imagen/GIF, likes y respuestas, **arrastrar para ordenar**, ✓/✗ meter o sacar, ✎ corregir la línea, Descartar, destino reel/story.
3. **Se trae** de `/admin`: subir el gancho ahí mismo (el título sale de transcribirlo) y el editor de **hasta 3 tramos** (reemplaza inicio/fin de bucle y «contexto largo»).
4. **Se elimina:** Copiar estilo/título/letra y el campo de estilo (Claude hace las canciones); color de resaltado, lado de Oscar y posición de tarjetas (Claude los decide, como hoy en pedidos; las tarjetas evitan caras); «Listo para Suno» pasa a «Aprobar».
5. **Arrastrar sin quitar las flechas**, también en la pantalla Revisar de los pedidos por link. Debe funcionar en el celular.
6. **Sin revisar en 3 días → automático como story corta**: 30–40 s, solo los comentarios más likeados, los primeros **5 s vacíos** para el gancho, entrega con la nota «Pendiente: tu gancho».
7. **Todo a las 2 p. m.:** el sondeo y la producción que hoy hace la tarea de las 2 a. m. («Metacho Cantados Noche») pasan a la franja; esa tarea se quita.
8. **Sondeo:** unos **20 links por franja** (hoy pasan ~70 %: 28 de 40 el 2026-10-23), con su propio Chrome, en paralelo a Suno y los renders. Aviso por Telegram cuando en `PENDIENTES.txt` queden **menos de 40 links**.
9. **Vercel Pro** (Oscar, 2026-10-23): sin bloqueo por cuota; las imágenes de los comentarios se suben una por una y los ganchos siguen subiéndose como hoy (multipart desde 20 MB, que aguanta mejor una caída de señal).
10. **Pantallazos más grandes al subirlos** (Nuevo video y Subir pantallazos): Oscar debe poder leer cada uno para ordenarlos; el nombre del archivo pasa a segundo plano.

## 3. Recorrido

| Momento | Quién | Qué pasa |
|---|---|---|
| Franja 2 p. m., día 0 | PC | Sondea ~20 links. Por cada uno que pase el filtro: escoge comentarios y líneas (reglamento de siempre, revisión de Claude por línea roja y ortografía), comprime una vista previa (480p) y sube vista previa + imágenes/GIF a Blob; publica el candidato → `en_revision` (tipo `cabina`, vence a las 72 h). |
| Día 0–3 | Oscar | En `/admin` → Cabina: ordena, saca/mete, corrige líneas, marca tramos, sube gancho, elige destino → **Aprobar** (`aprobado`) o **Descartar** (se borra al instante de Blob y Redis). |
| Siguiente franja | PC | Baja los aprobados (gancho incluido), la web borra el prefijo en Blob; transcribe el gancho como título; Suno → render → hoja → entrega por Telegram como un pedido más (reel o story según el destino). |
| Franja después de 72 h sin revisar | PC | Lo toma como **automático**: la web lo marca y borra su Blob; el PC hace la story corta (§6) y la entrega con «Pendiente: tu gancho». |

Los descartados que el PC tenía como `capturado` pasan a `descartado` en su `proyecto.json` en la siguiente franja (el PC compara su lista con la de la web).

## 4. Web (`src/app/admin/`)

### Datos (Redis)
Pedido con `tipo: "cabina"`, `origen: "sondeo"`, `destino` (`reel` por defecto | `story`), `link` (el del video sondeado), `propuesta` y `revision` como en `link` (`lib/revision.js`), y además:
- `vista_previa`: `{pathname, tamano, duracion, ancho, alto}` (`cantados/<id>/vista.mp4`).
- `propuesta.comentarios[i]` admite además `likes`, `respuestas` y `medio`: `{pathname, tipo: "imagen"|"gif"}` (`cantados/<id>/m<NN>.<ext>`).
- `tramos` (máx. 3, reglas de `lib/tramos.js` contra `vista_previa.duracion`), `gancho` (archivo, como en la fase 1).
- `vence` = publicada + 72 h.

Estados: `en_revision` → `aprobado` (Oscar) | `automatico` (vencido, lo pone el PC al pedirlo) → borrado del registro al entregar. Descartar = borrar (Blob + Redis). `fallido` como hoy.

### Pantallas
- **Lista:** bloque **«Cabina (N)»** arriba de los pedidos, con cada candidato (miniatura o nombre, nº de comentarios, «sale solo en N días»). Los pedidos siguen como hoy.
- **Candidato (`/admin/cabina/<id>`):**
  1. Video de la vista previa (URL firmada de lectura, 12 h, pedida por una ruta con sesión) con el `EditorTramos` actual debajo.
  2. Comentarios: tarjeta con usuario, likes ♥, respuestas ↩, texto original, imagen o GIF (si tiene) y la línea que se canta en grande. Controles: **asa para arrastrar** + ↑↓ + ✎ + ✕; sección «Fuera» con ↩ (igual que Revisar).
  3. Gancho: subida con barra y «Reintentar» (`subidas.js`); avisa si no es 1080p.
  4. Destino: Reel | Story.
  5. **Aprobar** (exige gancho subido y al menos un tramo; espera el último guardado; control de `version` y 409 como Revisar) y **Descartar** (con confirmación).
- **Revisar (pedidos por link):** se le agrega el arrastre; nada más cambia.
- **Pantallazos (Nuevo video y Subir pantallazos):** cada pantallazo se ve a lo ancho de la tarjeta (alto máximo ~60 % de la pantalla, legible en el celular), con número de orden grande; el nombre del archivo, pequeño debajo. Se mantienen ↑↓ y ✕, y se agrega el arrastre.

### Arrastre (componente común)
- Con **eventos de puntero** (`pointerdown/move/up`), no con el drag and drop nativo (no funciona en pantallas táctiles).
- Se arrastra desde un **asa** (⠿) para no pelear con el scroll; la lista se desplaza sola cerca de los bordes; una línea marca dónde caerá.
- Al soltar, el orden se guarda igual que con las flechas (mismo `PATCH` en fila). Teclado: las flechas siguen ahí.

### API
Con sesión (Oscar): leer candidato y URL de lectura de su vista previa y medios; `PATCH` de revisión, tramos, destino y gancho; `POST …/aprobar`; `DELETE` (descartar). La subida del gancho usa la de la fase 1 (`subidaPermitida` acepta `gancho` en un candidato `en_revision`).

Con token del PC (`Authorization: Bearer ADMIN_PC_TOKEN`):
- `POST /admin/api/pc/cabina` → crea el candidato (texto) y devuelve el `id`.
- `POST /admin/api/pc/cabina/<id>/subida` → devuelve un **token de subida de cliente** de Vercel Blob limitado a una ruta de ese candidato (`vista.mp4` o `mNN.*`), tipo de contenido y tamaño máximo. El PC sube con ese token (script Node con `@vercel/blob`), así el archivo no pasa por una función. *(El método exacto —`generateClientTokenFromReadWriteToken` + `put` del cliente— se verifica contra la documentación vigente en el plan.)*
- `POST /admin/api/pc/cabina/<id>/publicar` → comprueba que estén todos los archivos (`head`) y pasa a `en_revision`.
- `GET /admin/api/pc/cabina` → candidatos `aprobado` (con orden, líneas, tramos, destino, gancho firmado) y los vencidos, que pasan a `automatico` en esa misma llamada; más la lista de ids vivos (para detectar descartados).
- `POST /admin/api/pc/cabina/<id>/bajado` → borra el prefijo en Blob (igual que los pedidos).
- `DELETE /admin/api/pc/cabina/<id>` → entregado.
- Purga: candidatos `en_revision` de más de 7 días o sin publicar a las 24 h se borran (por si el PC falla a medias).

## 5. PC (`PREMIERE-CLAUDE/cantados`)

- **Franja de las 2 p. m. (`pasada`):** se le agregan, después de leer la web, (a) bajar candidatos aprobados y automáticos y ponerlos en la cola de producción de esa misma franja; (b) el **sondeo** de `links_por_franja` (20) en segundo plano; (c) por cada candidato nuevo, la revisión de Claude (línea roja, ortografía, sin inventar) y la publicación; (d) la producción que hoy hace `noche.py` (bandeja de Suno y ganchos de la carpeta GANCHOS siguen funcionando). `noche.py` queda como funciones que llama la pasada; la tarea de Windows de las 2 a. m. se elimina.
- **Proyecto local:** el candidato es un `proyecto.json` con `web_id` y `origen: "cabina"`; al bajar el aprobado se aplican orden, líneas, tramos (`bucle.tramos`), destino y gancho, y entra al flujo normal de pedidos aprobados (Suno por Claude, `pendientes-suno` lo incluye).
- **Vista previa:** ffmpeg a 480p, H.264, sin bajar de ~1 Mbps, con audio (para marcar tramos con sonido); objetivo ≤ 5 MB por video.
- **Aviso de links:** si tras tomar la tanda quedan menos de 40 en `PENDIENTES.txt`, mensaje por el bot: «Quedan N links para la Cabina: manda otra tanda».
- **Arreglos que ya están** (commits del 2026-10-23): el video del proyecto es el de sus comentarios (`aweme_id`), y las imágenes de los comentarios se recortan sin franja blanca.

## 6. Story corta automática
- **Comentarios:** los incluidos en la propuesta, ordenados por likes de mayor a menor; se toman los que quepan para que el video dure **30–40 s** en total (estimación por palabras cantadas; se ajusta al alinear).
- **Inicio:** **5 s sin gancho**: el comienzo del video original, sin sonido, sin título ni Oscar (el espacio donde Oscar pegará su gancho).
- **Resto:** como un cantado normal (tramos automáticos: los primeros segundos del original; estilo y color por turno). Destino `story`: un solo video, sin corte de YouTube.
- **Entrega:** por Telegram con «📱 STORY automática — Pendiente: tu gancho (5 s al inicio)».

## 7. Errores
- Una subida que falla deja el candidato sin publicar; la siguiente franja lo reintenta o la purga lo borra a las 24 h.
- Si la web no responde, la franja sigue con lo demás y lo anota en el resumen.
- Aprobar sin gancho o sin tramos: botón deshabilitado con «Falta: …».
- Un candidato aprobado cuyo gancho no baja completo no se marca `bajado` (se reintenta).
- TikTok con captcha en el sondeo: el link vuelve a `PENDIENTES.txt` (como hoy).

## 8. Pruebas
- **Web:** estados y transiciones (crear, publicar, aprobar, vencer a las 72 h, descartar, bajado, entregado), permisos (sesión vs token del PC), token de subida limitado a la ruta del candidato, purgas, `subidaPermitida` del gancho, orden por arrastre (lógica pura de mover de i a j).
- **PC:** selección de la story corta (30–40 s), vista previa ≤ 5 MB, publicación con la web simulada, descartados → `descartado`, aviso de links.
- **De punta a punta:** sondeo real de 2–3 links en la franja, revisión desde el celular de Oscar (arrastre incluido), un aprobado hasta Telegram, y un candidato vencido a mano para ver la story corta.
