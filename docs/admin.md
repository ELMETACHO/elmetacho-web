# Admin de cantados (`/admin`)

Página privada de elmetacho.com para pedir videos de "comentarios cantados" desde el celular. Reemplaza (sin quitar) el pedido por el bot de Telegram. Spec: `docs/superpowers/specs/2026-10-21-admin-design.md`. Código: `src/app/admin/`.

## Qué es y el flujo

1. **Celular → web.** Oscar entra a `/admin`, sube el video original, marca los bucles, sube su gancho y los pantallazos, y envía el pedido. Los archivos van directo del navegador a Vercel Blob (privado); los datos del pedido quedan en Redis.
2. **PC a las 2 p. m.** La tarea programada "cantados-pasada" pregunta a la web por los pedidos `listo`, baja los archivos con enlaces firmados (1 h), verifica el tamaño de cada uno y marca `bajado`. Ahí la web **borra los blobs**.
3. **Producción y entrega.** El PC produce (sistema `PREMIERE-CLAUDE/cantados`) y entrega los dos cortes por Telegram. Al entregar, el PC llama `DELETE` y la web **borra el registro** de Redis.
4. **Nada queda en la nube.** Blobs borrados al bajar, registro borrado al entregar, borradores sin enviar de más de 48 h borrados solos (cuando el PC consulta la lista). Un pedido cancelado borra lo que ya había subido.

Telegram sigue de respaldo. Si un pedido de Telegram es igual a uno de la web (título y duración ±0,5 s) queda como repetido y no se hace.

## Cómo se usa desde el celular

1. Abre `elmetacho.com/admin` (o la vista previa del PR), escribe la clave y entra. La sesión dura 30 días.
2. **Nuevo video** → pantalla de nuevo pedido:
   1. **Video original:** elígelo; empieza a subir con barra de progreso y ya puedes marcar tramos sin esperar.
   2. **Bucles (máx. 3):** con el reproductor usa "Marca inicio" / "Marca fin", ajusta con −1 s, −0,1 s, +0,1 s, +1 s, prueba cada tramo con ▶ y bórralo con 🗑. Muestra el total ("Contexto: 10 s"); **si pasa de 25 s sale un aviso amarillo** (no bloquea). No deja tramos solapados ni fuera de la duración.
   3. **Gancho:** tu video; **si es menor de 1080p avisa** (no bloquea). **Título** es opcional: vacío, el PC lo transcribe del gancho.
   4. **Pantallazos:** selección múltiple (hasta 40); ↑↓ para reordenar, ✕ para quitar.
   5. **Estilo:** Salsa / Merengue / Salsa y merengue (por defecto).
   6. **Enviar pedido:** se activa con original subido, ≥ 1 tramo, gancho y ≥ 1 pantallazo. Llega aviso al bot: "Recibí: … sale a las 2 p. m.".
3. En la lista puedes **Cancelar** un pedido en `listo`, `subiendo` o `fallido` (no si está `en_pc`). Si se corta la señal en una subida, sale "Reintentar" y el pedido sigue en `subiendo`.

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

Cambia `ADMIN_CLAVE` en Vercel y haz redeploy: **todas las sesiones caen** (la cookie queda inválida). Cinco intentos fallidos desde una misma IP bloquean 15 min (contador en Redis). Para el PC: cambia `ADMIN_PC_TOKEN` en Vercel y en `PREMIERE-CLAUDE/.env`.

## API

| Ruta | Quién | Qué hace |
|---|---|---|
| `POST /admin/api/entrar` | Cualquiera (con límite de intentos) | Verifica la clave y pone la cookie |
| `POST /admin/api/salir` | Sesión | Borra la cookie |
| `POST /admin/api/cantados` | Sesión | Crea pedido `subiendo` |
| `PATCH /admin/api/cantados/<id>` | Sesión | Guarda tramos, título, estilo, pantallazos, archivos subidos |
| `POST /admin/api/cantados/<id>/enviar` | Sesión | Valida, pasa a `listo`, avisa a Telegram |
| `DELETE /admin/api/cantados/<id>` | Sesión | Cancela: borra blobs y registro (no si `en_pc`) |
| `POST /admin/api/cantados/subir` | Sesión | `handleUpload` de Blob (tipos video/imagen) |
| `GET /admin/api/pc/pedidos` | Solo PC | Pedidos `listo` con enlaces firmados; limpia borradores > 48 h |
| `POST /admin/api/pc/pedidos/<id>/bajado` | Solo PC | Pasa a `en_pc` y borra sus blobs |
| `POST /admin/api/pc/pedidos/<id>/fallido` | Solo PC | `fallido` + motivo |
| `DELETE /admin/api/pc/pedidos/<id>` | Solo PC | Entregado: borra el registro |

Sin sesión → 401. El token del PC no sirve en las rutas de sesión y la cookie no sirve en las del PC. No hay `proxy.js`: la sesión se verifica en `layout.jsx` y al inicio de cada API.

## Límites

- Subida: **2 GB por archivo** (`maximumSizeInBytes`), tipos `video/*` e `image/*`.
- Hasta **3 tramos** de bucle, sin tope de duración (aviso a los 25 s; el PC no recorta; más de 7 s activa zooms cada 3 s).
- Hasta **40 pantallazos** por pedido.
- Borradores sin enviar: 48 h.

## Lo verificado de `@vercel/blob` 2.8.2

Verificado en los tipos instalados y con `build` (Task 6):
- `head()` y `del()` aceptan pathname (no hace falta guardar URL); `del()` acepta lista.
- `issueSignedToken({pathname, operations, validUntil, ...})` y `presignUrl(token, {operation: "get", pathname, access: "private"})` exportados desde `@vercel/blob`.
- `handleUpload` y `upload` en `@vercel/blob/client`; `onBeforeGenerateToken(pathname, clientPayload, multipart)` devuelve `allowedContentTypes` (admite comodines como `video/*`), `maximumSizeInBytes`, `addRandomSuffix`, `allowOverwrite`, etc.
- Pruebas: `npm test` 87 pasan; `eslint` y `npm run build` sin errores. El build no necesita variables.

## Lo que NO se ha probado

- **Subida real a Blob** (nunca se corrió contra un almacén real; solo tipos y build).
- **Enlaces firmados reales** (que el PC los descargue de verdad).
- **Punta a punta:** pedido real desde el celular, franja a mano en el PC, llegada por Telegram y comprobación de que Blob y las llaves `admin:cantados:*` quedan vacíos.
- Vista de teléfono en la vista previa del PR.

## Seguridad

- Repo público: no hay nada sensible en el código; las claves viven en variables de Vercel y archivos `.env` locales.
- Cookie `admin_sesion`: httpOnly, Secure, SameSite=Lax, 30 días, firmada HMAC-SHA256; clave comparada en tiempo constante.
- `/admin` lleva `noindex, nofollow`; no está en `sitemap.js` ni en `llms.txt`.
- `Disallow: /admin` en `src/app/robots.js` va en un **PR aparte** (archivo compartido; lo aprueba Oscar).
- Los blobs son privados; solo se leen con enlaces firmados de 1 h que entrega la API del PC.
