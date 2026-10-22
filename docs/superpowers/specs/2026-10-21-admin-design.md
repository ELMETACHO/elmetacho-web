# Admin · Pedidos de comentarios cantados desde la web

Fecha: 2026-10-21 · Estado: borrador para revisión del dueño · Plan: `docs/plans/2026-10-21-admin-cantados.md` (después de aprobar esta spec)

## 1. Propósito

Pasar a `elmetacho.com/admin` (privado) lo que Oscar hoy hace por el bot de Telegram @ComentariosCantados_bot para pedir videos de "comentarios cantados": subir el video original, marcar los bucles, subir su gancho y los pantallazos de los comentarios ya escogidos. El PC de Oscar recoge los pedidos en la franja de las 2:00 p. m., los produce con el sistema que ya existe (`D:\METACHO CLAUDE\PREMIERE-CLAUDE\cantados`) y entrega el video por Telegram.

**Éxito:** Oscar arma un pedido completo desde el celular en pocos minutos, sin límite de tamaño de archivo y sin texto libre que haya que interpretar; al día siguiente (o ese mismo día si lo sube antes de las 2 p. m.) recibe los dos cortes en Telegram, y en Vercel no queda ningún archivo ni registro del pedido.

**Fuera de alcance:** producir en la nube; transcribir el gancho al subirlo; aprobación de la letra; pedidos por link de TikTok (sigue en Telegram); edición de un pedido ya enviado (se cancela y se sube de nuevo); pulido visual.

## 2. Decisiones tomadas (2026-10-21, con Oscar)

1. **Franja de las 2 p. m.** El PC despierta a las 2 p. m., procesa lo que encuentre en la web (y en Telegram), entrega y se suspende si no hay otra sesión trabajando. No hay procesamiento inmediato.
2. **Sin aprobación de letra.** Los comentarios los escoge Oscar; Claude solo corrige el OCR contra las fotos, tildes y formato para Suno (inglés como se pronuncia, (sí)/(no), sin risas tipo "ksjdk"). No quita ni reordena.
3. **Bucle sin tope.** Hasta 3 tramos, sin límite de duración. La web muestra el total y avisa (amarillo, no bloquea) si pasa de 25 s; el PC respeta lo marcado sin recortar. Todo contexto de más de 7 s lleva zooms cada 3 s (`bucle_largo`).
4. **Telegram queda de respaldo.** Los pedidos por el bot siguen funcionando. Un pedido de Telegram igual a uno de la web (título y duración del original ±0,5 s) se marca `repetido` y no se hace.
5. **Enfoque de archivos: Vercel Blob privado + Redis.** Subida directa del navegador a Blob (sin pasar por la función, que tiene tope de 4,5 MB). Datos del pedido en el Redis existente (`KV_REDIS_URL`).
6. **Nada vive en la nube.** Apenas el PC baja y verifica los archivos de un pedido, se borran de Blob. Al entregar el video se borra el registro de Redis.

## 3. Dónde vive y cómo se protege

- Ruta `/admin`; código en `src/app/admin/` (páginas, `api/`, `lib/` con pruebas `*.test.js` al lado). Documentación en `docs/admin.md`.
- **Sesión de Oscar:** `/admin` pide una clave comparada (tiempo constante) con `ADMIN_CLAVE`. Si es correcta se pone una cookie `admin_sesion` httpOnly, Secure, SameSite=Lax, 30 días, firmada con HMAC-SHA256 usando una llave derivada de `ADMIN_CLAVE` (cambiar la clave invalida todas las sesiones). 5 intentos fallidos por IP bloquean 15 min (contador en Redis).
- **Sin `proxy.js`:** la sesión se verifica en `src/app/admin/layout.jsx` (salvo la página de entrada) y al inicio de cada API de `src/app/admin/api/`. Ninguna API responde sin sesión.
- **Clave del PC:** `ADMIN_PC_TOKEN` (cabecera `Authorization: Bearer …`). Solo sirve para las API `api/pc/*`; no abre páginas ni sirve para subir.
- **Sin indexar:** `metadata.robots = { index: false, follow: false }` en el layout de `/admin`; no se agrega a `sitemap.js` ni a `llms.txt`; `Disallow: /admin` en `src/app/robots.js` (archivo compartido → PR que aprueba Oscar).
- **Repo público:** no hay contenido privado en el código. Archivos en Blob privado; datos en Redis; claves en variables de Vercel.

### Variables de entorno (las pone Oscar)
| Variable | Dónde | Para qué |
|---|---|---|
| `ADMIN_CLAVE` | Vercel (Production y Preview) y `.env.local` | Clave de entrada a `/admin` |
| `ADMIN_PC_TOKEN` | Vercel (Production y Preview) y `PREMIERE-CLAUDE/.env` | Clave del PC para leer/marcar pedidos |
| `BLOB_READ_WRITE_TOKEN` (+ `BLOB_STORE_ID`) | Las crea Vercel al conectar el almacén Blob privado al proyecto | Subidas del navegador y enlaces firmados |

Paso de Oscar: Vercel → proyecto → Storage → Create → Blob → acceso **Private** → conectar a Production y Preview (y Development si se prueba en local).

## 4. Pantallas (teléfono primero; feo pero funcional)

### `/admin` (entrada)
Sin sesión: campo de clave + "Entrar". Con sesión: lista de pedidos con estado y botón **"Nuevo video"**. Cada pedido muestra nombre (título o nombre del archivo), fecha, estado y "Cancelar" (solo en `listo`, `subiendo` o `fallido`).

### `/admin/cantados/nuevo`
Una sola página, de arriba abajo:
1. **Video original**: input de archivo (video). Empieza a subir al elegirlo, con barra de progreso. Se reproduce localmente (`URL.createObjectURL`) para marcar tramos sin esperar la subida.
2. **Bucles (máx. 3)**: reproductor + barra de tiempo con los tramos de colores. Botones "Marca inicio" / "Marca fin" (toman `currentTime`), ajuste −1 s, −0,1 s, +0,1 s, +1 s del extremo seleccionado, ▶ por tramo (reproduce solo ese tramo) y 🗑. Total en vivo ("Contexto: 10 s"); aviso amarillo > 25 s. No permite tramos solapados, con fin ≤ inicio o fuera de la duración.
3. **Gancho**: archivo de video; sube al elegirlo. Si `videoHeight` < 1080 (en vertical, el lado corto < 1080) muestra aviso, sin bloquear. Campo "Título (opcional)": si queda vacío, el PC lo transcribe del gancho.
4. **Pantallazos**: selección múltiple de imágenes; quedan en el orden de selección; flechas ↑↓ para reordenar y ✕ para quitar; suben al elegirlas.
5. **Estilo**: Salsa / Merengue / Salsa y merengue (por defecto).
6. **"Enviar pedido"**: activo solo si hay original subido, ≥ 1 tramo válido, gancho subido y ≥ 1 pantallazo subido. Al enviar: estado `listo` y aviso al bot de Telegram: "📥 Recibí: <título o nombre> — sale a las 2 p. m.".

Un pedido empezado y no enviado queda en `subiendo`; se puede cancelar desde la lista (borra lo subido). Borradores de más de 48 h sin enviar se borran solos cuando el PC consulta la lista.

## 5. Datos

### Redis
- `admin:cantados:ids` — set con los ids de pedidos vivos.
- `admin:cantados:<id>` — JSON:
```json
{
  "id": "c_20261021_ab12",
  "creado": "2026-10-21T18:30:00-05:00",
  "estado": "subiendo | listo | en_pc | fallido",
  "titulo": null,
  "estilo": "Salsa, merengue",
  "tramos": [[0, 4], [7, 13]],
  "original": {"pathname": "cantados/c_…/original.mp4", "tamano": 12345678, "duracion": 28.03, "ancho": 1080, "alto": 1920},
  "gancho": {"pathname": "cantados/c_…/gancho.mov", "tamano": 2809094, "ancho": 1080, "alto": 1920},
  "pantallazos": [{"pathname": "cantados/c_…/p01.jpg", "tamano": 24184}],
  "motivo": null
}
```
- `admin:intentos:<ip>` — contador con expiración de 15 min.

### Blob (privado)
`cantados/<id>/original.<ext>`, `gancho.<ext>`, `pNN.<ext>`. Subida con `upload()` de `@vercel/blob/client` contra `src/app/admin/api/cantados/subir/route.js` (`handleUpload`, que verifica la sesión en `onBeforeGenerateToken` y limita tipos a video/imagen y la ruta al id del pedido). El registro en Redis lo actualiza el navegador al terminar cada subida (llamada a la API con sesión, que verifica con `head()` que el blob exista y su tamaño), no `onUploadCompleted` (no llega a localhost y no es necesario).

## 6. API

| Ruta | Auth | Qué hace |
|---|---|---|
| `POST /admin/api/entrar` | — (con límite de intentos) | Verifica la clave y pone la cookie |
| `POST /admin/api/salir` | sesión | Borra la cookie |
| `POST /admin/api/cantados` | sesión | Crea pedido `subiendo` y devuelve id |
| `PATCH /admin/api/cantados/<id>` | sesión | Guarda tramos, título, estilo, orden de pantallazos, archivo subido |
| `POST /admin/api/cantados/<id>/enviar` | sesión | Valida y pasa a `listo`; aviso a Telegram |
| `DELETE /admin/api/cantados/<id>` | sesión | Cancela: borra blobs y registro (no si `en_pc`) |
| `POST /admin/api/cantados/subir` | sesión | `handleUpload` de Blob |
| `GET /admin/api/pc/pedidos` | PC | Pedidos `listo` con enlaces GET firmados (1 h) por archivo; limpia borradores > 48 h |
| `POST /admin/api/pc/pedidos/<id>/bajado` | PC | Pasa a `en_pc` y borra sus blobs |
| `POST /admin/api/pc/pedidos/<id>/fallido` | PC | `fallido` + motivo (los blobs ya no existen; se cancela o se sube de nuevo) |
| `DELETE /admin/api/pc/pedidos/<id>` | PC | Entregado: borra el registro |

Validación pura en `src/app/admin/lib/` (tramos, pedido completo, cookie, límite de intentos) con pruebas `node:test`.

## 7. Lado del PC (`PREMIERE-CLAUDE/cantados`)

- Nuevo `herramientas/web.py`: `pedidos()`, `bajar(pedido, destino)` (verifica tamaño de cada archivo contra el registro; si falla, no marca nada), `bajado(id)`, `fallido(id, motivo)`, `entregado(id)`. Lee `ADMIN_PC_TOKEN` y la URL base (`https://www.elmetacho.com`) desde el entorno/`.env` sin que Claude lo abra.
- `pasada leer`: primero la web, luego Telegram. Cada pedido web se registra en `logs/pedidos.json` con clave `web:<id>`, `modo: pantallazos`, `tramos`, `bucle_largo` si el total > 7 s, `titulo`, `estilo`; el gancho pasa por `gancho.procesar`; los pantallazos por `pantallazos.leer` → `armar_proyecto`. Tras `bajado`, el pedido queda `por_revisar` y, después de la revisión de Claude (§2 del runbook, en el orden de Oscar), va directo a `aprobado` (sin `enviar-letras`).
- Sin recorte de tramos para pedidos web (`_recortar` no aplica); la validación de `proyecto.py` acepta tramos largos cuando `origen == "web"`.
- `entregar`: tras enviar por Telegram, `web.entregado(id)`. Si un pedido queda `fallido`, `web.fallido(id, motivo)` además del aviso por el bot.
- Repetidos: al registrar un pedido de Telegram, si hay uno `web:*` vivo (en `pedidos.json`) con título equivalente (normalizado) y duración del original ±0,5 s, queda `repetido` sin producirse.
- Si la web no responde: se anota en `logs/pasada.log`, se avisa por el bot y la pasada sigue con Telegram.
- El runbook (`docs/runbook-pasada.md`) y `BITACORA-CANTADOS.md` se actualizan. Ese código lo lleva la sesión "Construir pedidos de cantados por Telegram": se anota el cambio en su bitácora.

## 8. Errores

| Caso | Qué pasa |
|---|---|
| Clave mala | "Clave incorrecta"; al 5.º intento, bloqueo 15 min |
| Subida cortada (señal) | Barra en rojo + "Reintentar"; el pedido sigue `subiendo` |
| Tramo inválido | No se agrega; mensaje junto a los botones |
| Web caída a las 2 p. m. | El PC sigue con Telegram y avisa |
| Archivo incompleto al bajar | No se borra nada; se reintenta en la franja siguiente |
| Falla la producción | `fallido` + motivo en la web y aviso por el bot |
| Cancelar con `en_pc` | No se permite ("el PC lo está haciendo") |

## 9. Pruebas y verificación

- Web: `node:test` de `lib/` (tramos, pedido completo, cookie firmada/vencida/alterada, límite de intentos) y de las API (sin sesión → 401; PC sin token → 401; token del PC no sirve en API de sesión). `npm test`, `npx eslint --ignore-pattern ".claude/**"`, `npm run build` sin errores. Vista de teléfono revisada en la vista previa del PR.
- PC: pytest con un servidor falso (pedidos, descarga con tamaño correcto/incorrecto, borrado, fallido, repetido) + las 240 pruebas actuales.
- Punta a punta: Oscar sube un pedido real desde el celular; Claude corre la franja a mano; llegan los dos cortes por Telegram; se comprueba que el almacén Blob y las llaves `admin:cantados:*` quedan vacíos.

## 10. Fases siguientes (anotadas 2026-10-21; cada una con su propia lluvia de ideas → spec → plan)

1. **Reedición de videos ya publicados ("remix").** Oscar sube un cantado ya monetizado + el link del original. El sistema recupera los MISMOS comentarios en el mismo orden (por red del original; si no aparecen, recortes del video de Oscar o tarjeta recreada con los datos reales leídos de su video, como las tarjetas HTML actuales) y lo reedita con otra canción, ritmo, karaoke y cabeza. Pendiente verificar con la política actual de Meta que la reedición propia califique para monetizar. Solo comentarios reales: nunca inventados.
2. **Flujo actual de Telegram en la web.** Subir video + gancho (sin pantallazos): Claude elige comentarios, los deja en la web para que Oscar los revise (hasta 24 h) y a la franja siguiente de las 2 p. m. edita con lo aprobado.

## 11. Publicación

- PR 1 (`feat/admin-cantados`): `src/app/admin/**`, `docs/admin.md`, esta spec y el plan, **más `package.json`/`package-lock.json` (`@vercel/blob`)** → toca archivos compartidos: lo aprueba Oscar.
- PR 2: `src/app/robots.js` (`Disallow: /admin`) → lo aprueba Oscar.
- Después de fusionar: comprobar en vivo `/admin` sin sesión (pide clave), con sesión, https://www.elmetacho.com y https://mlabs.elmetacho.com.
- Cambios del PC: en `PREMIERE-CLAUDE/cantados` (no está en git), con sus pruebas.
