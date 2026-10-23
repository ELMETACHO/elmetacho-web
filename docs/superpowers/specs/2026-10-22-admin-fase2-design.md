# Admin · Fase 2: pedidos por link (con revisión) y remix

Fecha: 2026-10-22 · Estado: borrador para revisión del dueño · Base: `docs/superpowers/specs/2026-10-21-admin-design.md` (fase 1, publicada en PR #8) · Plan: después de aprobar esta spec y de la prueba de lectura de tarjetas (§7).

## 1. Propósito

Pasar a `elmetacho.com/admin` los dos flujos que faltan:
1. **Por link:** lo que hoy Oscar hace por Telegram (link + gancho → Claude escoge comentarios → Oscar aprueba → se edita), con la revisión en la web en vez de comandos por el bot.
2. **Remix:** reeditar un cantado ya publicado (mismos comentarios, otro orden, otra canción, otro ritmo, otro color de karaoke, gancho nuevo) para volver a publicarlo.

**Éxito:** Oscar arma cualquiera de los tres tipos desde el celular; revisa una propuesta de comentarios en la web con botones en menos de 2 minutos; recibe los dos cortes por Telegram; en la nube solo vive texto mientras el pedido está en revisión, y nada después de la entrega.

**Fuera de alcance:** mostrar en la revisión las imágenes de los comentarios (posible después); editar tramos después de enviar; publicar en redes; cualquier validación automática de la política de Meta.

## 2. Decisiones (2026-10-22, con Oscar)

1. Una sola spec con dos tipos nuevos; cada uno puede tener su plan.
2. **Por link:** Oscar sube link de TikTok + video descargado + tramos (editor visual de la fase 1) + gancho. El link solo sirve para leer comentarios.
3. **Revisión en la web (opción A):** ✓ dejar, ✕ quitar, ↑↓ mover, ✎ corregir la línea que se canta, lista «Fuera» para meter uno descartado, «Trae más» (repone los quitados) y «Aprobar». Plazo de 24 h; si no aprueba, se aprueba solo.
4. **Remix:** Oscar sube link del TikTok original + su video ya publicado + clip original descargado + tramos + **gancho nuevo** (opción B: graba otro).
5. **Remix sin revisión (opción A):** sale el mismo día; el resumen dice qué tarjetas se dibujaron.
6. **Remix: comentarios reales siempre.** El texto se lee del video publicado y nunca se inventa. Si un comentario no aparece en TikTok, la tarjeta se dibuja con el texto real, un **usuario inventado** y sin likes (Oscar, 2026-10-22: «cambia el nombre de usuario por uno inventado, no pasa nada»).
7. Remix: Claude cambia el orden (el primero sigue siendo de los más graciosos; el resto, ninguno en su posición original cuando se pueda), el estilo al contrario (salsa ↔ merengue) y el color de karaoke.
8. Riesgo de monetización (investigación del 2026-10-22, fuentes en el resumen de la sesión): ninguna fuente oficial de Meta confirma que reeditar un video propio califique; Meta penaliza reutilizar contenido ajeno sin transformación significativa y baja el alcance de duplicados. Oscar decide construirlo; el primer remix se publica como prueba y se mira el panel de riesgo de monetización antes de hacer más.
9. Todo lo de la fase 1 sigue: franja de las 2 p. m., Telegram de respaldo, nada de archivos en la nube tras bajarlos.

## 3. Tipos de pedido y recorrido

| Tipo | Oscar sube | Día 1 (2 p. m.) | Después |
|---|---|---|---|
| `pantallazos` (fase 1) | video, tramos, gancho, pantallazos | baja, edita, entrega | — |
| `link` | link, video, tramos, gancho | baja (la web borra archivos), sondea comentarios en TikTok, Claude escoge y revisa con el reglamento, publica la propuesta → `en_revision`; aviso por el bot con enlace | Oscar revisa hasta 24 h → `aprobado` (o vence). Siguiente 2 p. m.: aplica la lista final → Suno → render → hoja → entrega. «Trae más» → la franja siguiente repone y vuelve a `en_revision` con 24 h nuevas |
| `remix` | link, video publicado, clip original, tramos, gancho nuevo | baja, lee tarjetas del video publicado, empareja con el sondeo, reordena, estilo y color contrarios, edita, entrega | — |

Si TikTok pide iniciar sesión o captcha en `link` o `remix`: estado `necesita_pantallazos` + aviso; Oscar sube pantallazos en ese mismo pedido y sigue como `pantallazos` (en `remix`, los pantallazos reemplazan la búsqueda en TikTok: el emparejamiento se hace contra ellos).

## 4. Web (`src/app/admin/`)

### Datos (Redis, solo texto)
Pedido de la fase 1 + `tipo` (`pantallazos` | `link` | `remix`), `link` (URL de TikTok validada: `https://(www.|vm.|vt.)tiktok.com/…`), `publicado` (archivo, solo `remix`, ruta `cantados/<id>/publicado.<ext>`). Estados nuevos: `en_revision`, `aprobado`, `necesita_pantallazos`.

`propuesta` (solo `link`): `{ publicada, vence, version, comentarios: [{ id, usuario, texto, linea, likes, dentro }] }`, y `revision`: `{ orden: [id…], fuera: [id…], lineas: {id: texto}, trae_mas: bool, aprobada_en }`. Sin imágenes ni archivos.

### Pantallas
- `Nuevo video`: primero tres botones de tipo; luego solo los campos del tipo (link, video publicado, pantallazos). Mismo editor de tramos, subida directa a Blob y reglas de la fase 1.
- `/admin/cantados/<id>/revisar` (teléfono primero): tarjetas en orden con ✓/✕, ↑↓, ✎ (editar la línea que se canta, termina en coma), sección «Fuera» con ↩ para meter, botones «Trae más» y «Aprobar», contador «se aprueba solo en N h». Guarda cada cambio.
- Lista: los `en_revision` arriba con botón «Revisar»; `necesita_pantallazos` con botón «Subir pantallazos».

### API (todas con sesión o token del PC, como la fase 1)
- Sesión: `PATCH /admin/api/cantados/<id>/revision`, `POST …/aprobar`, `POST …/trae-mas`; subir pantallazos en `necesita_pantallazos` reutiliza la subida y el `PATCH` de la fase 1 (permitidos en ese estado).
- PC: `POST /admin/api/pc/pedidos/<id>/propuesta` (publica y pasa a `en_revision`, `vence` = ahora + 24 h, aviso por el bot central con enlace), `GET /admin/api/pc/aprobados` (pedidos `aprobado` o vencidos, con su lista final; marcar vencidos como aprobados automáticamente), `POST …/necesita-pantallazos`, `POST …/trae-mas-atendido`.
- `GET /admin/api/pc/pedidos` sigue devolviendo solo `listo` (ahora con `tipo`, `link` y `publicado`) y, además, los `necesita_pantallazos` que ya tienen pantallazos nuevos.
- Borrado: igual que la fase 1 (prefijo `cantados/<id>/` al bajar, cancelar, fallar, 48 h de borrador, entregar). La propuesta vive en Redis hasta la entrega.

## 5. PC (`PREMIERE-CLAUDE/cantados`)

- `leer_web` registra los tipos nuevos: `link` → modo sondeo (con `original` local, no baja de TikTok) y `remix` → modo remix. Clave `web:<id>` como hoy.
- **Por link, día 1:** `sondear` lee comentarios por red en el Chrome de captura (9223), con el original local; Claude revisa (runbook §2, reglamento de siempre); `pasada publicar-propuesta <carpeta>` sube la propuesta (sin `enviar-letras` ni espera de 60 min).
- **Por link, día 2:** `leer` trae `aprobados` y aplica la lista final al proyecto con la misma lógica de `respuestas.py` (orden, quitar, cambiar línea, reponer); `trae_mas` → `_reponer` y nueva propuesta. Luego §3–§5 del runbook.
- **Remix:** módulo nuevo (`remix.py`): cuadros del video publicado → OCR de tarjetas → lista ordenada → emparejar con el sondeo del link (parecido de texto) → tarjetas reales o dibujadas (texto real, usuario inventado de una lista neutra, sin likes, sin avatar o con avatar genérico) → reorden → estilo y color contrarios → proyecto listo para Suno. El resumen del bot dice cuántas tarjetas se dibujaron.
- Repetidos web ↔ Telegram: se comparan también los tipos nuevos.
- Runbook y bitácora se actualizan.

## 6. Errores

| Caso | Qué pasa |
|---|---|
| Link inválido | La web no deja enviar |
| TikTok pide sesión/captcha | `necesita_pantallazos` + aviso; sigue con pantallazos |
| Oscar no revisa en 24 h | Se aprueba solo con la propuesta tal cual |
| «Trae más» sin más en «Fuera» | La franja siguiente avisa «no hay más» y vuelve a `en_revision` sin cambios |
| Remix: no se leen tarjetas del video publicado | `fallido` con motivo y aviso; Oscar puede reenviarlo con pantallazos del video publicado |
| Remix: comentario no encontrado en TikTok | Tarjeta dibujada (texto real, usuario inventado); se lista en el resumen |

## 7. Riesgo a probar antes del plan

Leer las tarjetas de un video ya editado (entran animadas; los videos de Premiere tienen otro diseño). Prueba desechable con al menos un video del sistema nuevo y uno de Premiere: si la lectura recupera ≥ 80 % de los comentarios en orden, se construye así; si no, el remix pide además los pantallazos del video publicado.

### Resultado de la prueba (2026-10-22, código desechable)
Cuadros cada 0,5 s + RapidOCR: 100 %, 83 % y 100 % en tres videos del sistema nuevo, y 90 % en un video de Premiere (pantallazos reales de TikTok, tema claro, girados), siempre en orden. Alrededor de 1 de cada 6 tarjetas sale con errores de texto (palabras desordenadas por la rotación, «Responder» o «Ver N respuestas» pegados, usuario cortado).

Por eso el remix lee los comentarios así:
1. Si el video lo hizo el sistema nuevo, salen de su `proyecto.json` (sin OCR).
2. Si no, OCR de tarjetas. Lo emparejado con TikTok usa el texto real de TikTok.
3. Lo no emparejado, o mal leído, se **corrobora con la transcripción del audio** del video publicado (la canción canta cada comentario: whisper sobre el tramo en que la tarjeta está en pantalla; idea de Oscar, 2026-10-22) y Claude lo corrige contra el cuadro antes de que se cante. Nunca se inventa texto.

## 8. Pruebas

Web: `node:test` de la lógica nueva (validar link, transiciones de estado, aplicar revisión, vencimiento a 24 h, permisos de cada API), `eslint` y `build`. PC: pytest (registro por tipo, aplicar lista final, `trae_mas`, emparejamiento y reorden del remix, usuario inventado solo cuando no hay pareja). Punta a punta: un pedido real de cada tipo.

## 9. Publicación

Como la fase 1: todo en `src/app/admin/**` y `docs/admin*`; si no se toca `package.json` ni otros archivos compartidos, el PR se puede fusionar sin aprobación; si se toca, lo aprueba Oscar.
