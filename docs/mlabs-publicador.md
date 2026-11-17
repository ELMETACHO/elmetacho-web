# Publicador oficial de Reels de @metacholabs (PR 3, 2026-11-16) · APAGADO

Publica Reels por la API oficial de Instagram (Instagram API with Instagram Login), desde Vercel, sin el PC prendido. **No publica nada mientras `MLABS_PUBLICADOR` no sea `activo`.**

## Flujo
1. **Encolar:** el PC encola con `node scripts/mlabs-publicar.mjs <id> <video.mp4> <portada.jpg|-> <caption.txt> <ISO>` y el `ADMIN_PC_TOKEN` en el entorno.
   - El video y la portada suben al **Blob privado** (`publicar/<id>/…`).
   - El item queda en la cola de Redis (`ig:pub:cola` y `ig:pub:item:<id>`).
2. **Cron:** Vercel corre `/api/instagram/publicar` cada 5 minutos, con `CRON_SECRET`.
3. **Publicación de cada item vencido:**
   1. Revisa `content_publishing_limit`. Si el cupo de 24 h está lleno, espera y avisa por Telegram.
   2. Crea el contenedor `POST /{ig}/media` con `media_type=REELS`, `video_url` y `cover_url`. Esas URL son **links prefirmados del Blob privado, válidos 3 h** (Meta baja el video de ahí). También manda `caption` y `share_to_feed`.
   3. En las vueltas siguientes consulta `status_code`. Con `FINISHED` llama a `media_publish`, **borra los archivos del Blob** y avisa «✅ Publicado».
   4. Con `ERROR` o `EXPIRED`, o si pasa 1 h en `IN_PROGRESS`, deja el item en error, avisa y **no borra** los archivos.
4. **Candado:** solo publica en **17841480070378472**. Se exige en la variable `IG_CUENTA_PUBLICAR` (tiene que ser ese id exacto), al encolar y otra vez en el cron, antes de cualquier llamada a Meta.
5. **Modo `simulacro`:** hace todo menos llamar a Meta y avisa por Telegram lo que habría publicado. Sirve para la primera semana.

## ¿App aparte o la misma app MLABS?
**Recomendación: app aparte**, por ejemplo «Metacho Publicador», tipo Business, solo con Instagram Login y los permisos `instagram_business_basic` + `instagram_business_content_publish`.
- **App Review:** la app MLABS tiene la App Review de comentarios en curso (desde el 31-oct). Agregarle un permiso nuevo mientras la revisan puede pedir más material o demorarla. Una app aparte no la toca.
- **Acceso:** según la documentación de Meta, Standard Access «es todo lo que necesitas» si la app solo sirve a tu propia cuenta profesional, y la publicación está soportada en Standard Access. No hace falta App Review ni verificación del negocio.
- **Lo que no está escrito explícitamente:** que una cuenta con rol en la app pueda publicar sin App Review. Se confirma en la primera prueba (paso 5 de abajo).
- **Token:** un token por app. Si se revoca o vence uno, no se cae el otro (los DMs siguen funcionando).

## Pasos de Oscar (en orden; nada se publica hasta el último)
1. En developers.facebook.com: crear la app «Metacho Publicador» (Business) → agregar el producto **Instagram** → **API setup with Instagram login**.
2. Agregar la cuenta @metacholabs como **Instagram tester** (Roles de la app) y aceptarla desde Instagram (Configuración › Apps y sitios web › Invitaciones de prueba).
3. En «Generate access tokens», generar el token de @metacholabs con los permisos `instagram_business_basic` e `instagram_business_content_publish`. Copiarlo con `clip`; **nunca va por el chat**.
4. En Vercel (Production) poner:
   - `IG_TOKEN_PUBLICADOR`: el token del paso 3.
   - `IG_CUENTA_PUBLICAR`: `17841480070378472`.
   - `MLABS_PUBLICADOR`: `simulacro`.
   - `CRON_SECRET`, `MLABS_CLAVE_TOKENS` y `BLOB_READ_WRITE_TOKEN` ya existen.
5. **Prueba en simulacro:** Claude encola un Reel con hora pasada. En 5 minutos llega a Telegram «🧪 … se habría publicado».
6. **Primera publicación real:** solo con el **OK explícito de Oscar** para ese video. Se cambia `MLABS_PUBLICADOR` a `activo`, se encola un Reel y en unos 10 minutos debe llegar «✅ Publicado».
7. Después de 1 semana sin errores, la fábrica de LABS puede encolar sola. Mientras tanto, Oscar programa en la app de IG.

## Límites (docs de Meta, 2026-11-16)
- **Cupo:** los docs dicen 50 en unas páginas y 100 en otras por 24 h. Por eso se lee en vivo de `content_publishing_limit` y no se escribe en el código.
- **Video:** MP4 o MOV con H.264 o HEVC, 23–60 fps, máximo 1920 px de ancho, 3 s a 15 min, máximo 300 MB, recomendado 9:16. Audio AAC a 48 kHz como máximo.
- **Portada y caption:** portada JPEG de hasta 8 MB; caption de hasta 2200 caracteres y 30 hashtags.
- **Contenedores:** vencen a las 24 h.
- **Etiqueta de IA:** la API tiene `is_ai_generated`. Todavía no se envía; si un Reel usa voz IA, la etiqueta de Meta se decide aparte.
