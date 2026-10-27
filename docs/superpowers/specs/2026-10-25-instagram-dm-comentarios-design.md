# Instagram: DM → Cabina y palabras clave en comentarios (app de Meta «M LABS REPLY»)

**Fecha:** 2026-10-25 · **Estado:** diseño aprobado por Oscar en el chat; falta su revisión de este texto.
**Repos:** `elmetacho-web` (todo lo web) y `PREMIERE-CLAUDE/cantados` (solo el paso del PC, §4.2).

## 1. Qué se quiere

1. **Parte 1 — DM → Cabina.** Los reels y links que la comunidad le manda a **elmetacho_** por DM entran solos a la cola de la Cabina. De ahí sigue el camino de siempre: sondeo, filtro (muchos comentarios, varios con muchos likes, respuestas que se ríen, fuera la línea roja), Cabina y story corta automática si Oscar no revisa en 3 días.
2. **Parte 2 — Palabras clave en comentarios.** En **metacholabs** (la cuenta de la agencia MLABS), si alguien comenta una palabra clave («curso»), se responde el comentario en público («¡Enviado! Revisa tu DM») y le llega por DM un mensaje con el link del recurso en `mlabs.elmetacho.com`. Opcional por palabra: pedir que siga la cuenta antes de mandar el link.
3. **Una sola revisión de Meta** para las dos partes, con acceso avanzado a mensajes y comentarios.

**Fuera de alcance:** páginas de recursos con formulario de lead (van en su propio spec; el DM solo lleva el link configurado); que otras marcas conecten sus cuentas tipo ManyChat («parte 3»: proveedor de tecnología, verificación de acceso, tokens de terceros, cobro). Este diseño guarda todo **por cuenta** para que la parte 3 sea «otra cuenta», no una reescritura.

## 2. Hechos verificados (documentación de Meta, 2026-10-25)

- Los avisos del webhook solo llegan a apps **publicadas**; publicar exige negocio verificado y **revisión de la app** para datos reales. Probado: con la app sin publicar, tres DM de metacholabs (cuenta con rol) a elmetacho_ no generaron ningún aviso; el botón «Test» de Meta sí llega. Fuente: [webhooks/setup](https://developers.facebook.com/documentation/instagram-platform/webhooks/setup), [crear la app](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/create-a-meta-app-with-instagram).
- El portafolio **El Metacho S.A.S** (dueño de la app) ya está **verificado**.
- Reels compartidos por DM: adjunto `ig_reel` con `payload.url` (changelog de Instagram Messaging, 11-jun-2024). Por eso hoy sí se puede lo que hace un año no (n8n).
- Firma: `X-Hub-Signature-256: sha256=<HMAC-SHA256(cuerpo crudo, clave)>`. Comprobado en vivo con el «Test» de Meta (POST 200 en Vercel).
- `comments` necesita acceso avanzado. Respuesta privada: **un** mensaje al autor del comentario, **dentro de 7 días**, con `recipient: {comment_id}`; tope 750/hora por cuenta. Respuestas públicas solo a comentarios de primer nivel. Fuentes: [política](https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy), [enviar mensajes](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/), [respuestas a comentarios](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-comment/replies).
- Seguimiento: `GET graph.instagram.com/<IGSID>?fields=is_user_follow_business` solo funciona **después** de que el usuario le escribe a la cuenta (consentimiento). Fuente: [perfil de usuario](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/user-profile).
- **Por verificar al escribir el plan** (no de memoria): formato exacto de «respuestas rápidas» en Instagram Login; forma del aviso `comments` (`value.from.id`, `value.media.id`, `value.text`, `value.parent_id`); endpoint de renovación del token largo (`refresh_access_token`, 60 días); si cambiar la URL de privacidad tras aprobar obliga a revisar otra vez.

## 3. Dónde vive todo

Todo bajo **mlabs.elmetacho.com** (la agencia): `next.config.mjs` no reescribe `/api`, así que `https://mlabs.elmetacho.com/api/instagram/webhook` ya llega al receptor (probado: 403 con frase equivocada). En Meta se cambia la URL del webhook a esa. Páginas nuevas: `mlabs.elmetacho.com/privacidad` y `mlabs.elmetacho.com/eliminar-datos` («MLABS, un servicio de El Metacho S.A.S», con apartado de Instagram). Si algún día se compra un dominio propio (p. ej. `mlabs.co`), se cambian URL de webhook, dominio de la app y páginas legales; el código no cambia.

## 4. Piezas

### 4.1 Receptor (`src/app/api/instagram/webhook/`)
Ya existe (PR #18): verificación GET, firma, extracción de links. Cambia a **repartidor por cuenta**: cada `entry.id` es el id de la cuenta de Instagram que recibe el aviso.

| Aviso | Cuenta | Acción |
|---|---|---|
| `messaging[]` con mensaje (no `is_echo`) | elmetacho_ (`IG_CUENTA_CABINA`) | links → cola de la Cabina (como hoy) |
| `changes[].field = "comments"` | metacholabs (`IG_CUENTA_PALABRAS`) | §4.4 |
| `messaging[]` con respuesta rápida «Ya te sigo» | metacholabs | §4.5 |
| cualquier otro | — | 200 sin hacer nada |

Ids de cuenta: elmetacho_ `17841402790807435`, metacholabs `17841480070378472` (de la pantalla de la app). Van en variables de Vercel, no en el código, para que la parte 3 sea configuración. Siempre se responde 200 tras la firma, salvo Redis caído (500 → Meta reintenta hasta 36 h); el trabajo lento (llamadas a Meta) se hace después de leer el aviso pero dentro de la misma función, con tiempo máximo por llamada.

### 4.2 Parte 1: la cola llega al PC
- **Web, entrega en dos pasos** (solo PC, `ADMIN_PC_TOKEN`): `GET /admin/api/pc/dm-links` devuelve los links de `cabina:dm:links` que aún no están en `cabina:dm:entregados`, sin marcar nada; `POST /admin/api/pc/dm-links/recibidos` con esos links los marca en `cabina:dm:entregados` (con la hora). Si el PC se cae entre los dos pasos, el siguiente `GET` los vuelve a dar y el PC no los duplica porque revisa `PENDIENTES.txt`.
- **/admin → «Links por DM»:** lista con link, cuándo llegó y si ya pasó al PC (para Oscar y para el video de la revisión).
- **PC (`cantados`):** en `pasada leer`, después de los pedidos web, baja la lista, agrega a `PENDIENTES.txt` los que no estén ya (mismo formato que los links del bot) y confirma. Si la web falla, la pasada sigue. Se coordina con la sesión «cantados-instagram» (PR #17), dueña hoy del soporte de Instagram en `pasada.py`; los links de TikTok funcionan desde el primer día, los de Instagram cuando esa sesión termine.

### 4.3 Configuración de palabras clave (/admin → «Palabras clave»)
Por cuenta (hoy solo metacholabs). Cada disparador: `palabra`, `respuesta_publica`, `mensaje_dm`, `link`, `pedir_seguir` (sí/no), `activa` (sí/no). Coincidencia: el comentario **contiene la palabra completa**, sin distinguir mayúsculas ni tildes («Curso!!», «quiero el curso», «CURSO 🙏» sí; «recursos» no). Si coinciden varias, gana la primera de la lista. Las palabras son globales en la cuenta (cualquier publicación); varios videos comparten CTA usando la misma palabra.

### 4.4 Flujo de un comentario
1. Aviso `comments` de metacholabs. Se ignora si lo escribió la propia cuenta.
2. Busca disparador activo; si no hay, nada.
3. `SET ig:<cuenta>:respondido:<id_comentario> NX EX 8 días`; si ya existía, nada (avisos repetidos).
4. Respuesta pública con `respuesta_publica`. Si falla (p. ej. es respuesta a otro comentario), se sigue.
5. Respuesta privada (`recipient: {comment_id}`):
   - sin `pedir_seguir`: `mensaje_dm` + `link`;
   - con `pedir_seguir`: «Para recibirlo, sígueme y toca 👇» + respuesta rápida **«Ya te sigo»** (payload con el id del disparador); guarda `ig:<cuenta>:esperando:<id_usuario>` = id del disparador, vence en 24 h.

### 4.5 «Ya te sigo»
Llega como mensaje de esa persona (abre la ventana de 24 h y da el consentimiento). Se consulta `is_user_follow_business`: si sigue → `mensaje_dm` + `link` y se borra la espera; si no → «Aún no me sigues 🙂 Sígueme y vuelve a tocar el botón» con el mismo botón. Sin espera vigente (vencida o ya atendida) → nada.

### 4.6 Token de metacholabs
Responder exige un token de la cuenta. Oscar lo genera en Meta («Generar identificador» en la fila de metacholabs) y lo pega en Vercel como `IG_TOKEN_LABS`; nunca pasa por el chat. Dura 60 días: un cron diario de Vercel lo renueva cuando le falten menos de 15 días y guarda el nuevo en `ig:<cuenta>:token` (con vencimiento); si `ig:<cuenta>:token` existe gana sobre la variable. Si la renovación o una llamada falla por token inválido → aviso por Telegram y las palabras clave quedan en pausa hasta un token nuevo.

## 5. Datos (Redis)

- Parte 1: `cabina:dm:links`, `cabina:dm:vistos` (ya existen), `cabina:dm:entregados`.
- Parte 2 (por cuenta): `ig:<cuenta>:disparadores`, `ig:<cuenta>:respondido:<comentario>` (8 días), `ig:<cuenta>:esperando:<usuario>` (24 h), `ig:<cuenta>:token`, `ig:<cuenta>:fallos` (contador por hora).
- **No se guarda** el texto de comentarios ni de mensajes, ni nombres de usuario. Del usuario solo su id de Instagram mientras dura la espera de 24 h.

## 6. Errores

| Caso | Qué pasa |
|---|---|
| Firma mala | 401, nada más |
| Redis caído | 500 → Meta reintenta hasta 36 h |
| Aviso repetido | la marca del paso 3 lo frena |
| Falla la respuesta pública | igual se manda el DM |
| Falla el DM | queda en el registro; 3 fallos en una hora → aviso por Telegram |
| Token vencido/inválido | aviso por Telegram de inmediato; pausa hasta token nuevo |
| Meta responde «límite» | se anota; sin reintentos en bucle |
| Pasaron 7 días del comentario | Meta rechaza la respuesta privada; se anota |

## 7. Pruebas

- `node --test` (como el resto de la web), con Meta y Redis simulados: reparto por cuenta, coincidencia de palabras (tildes, mayúsculas, palabra completa), duplicados, flujo «Ya te sigo» (sigue / no sigue / vencido), renovación del token, ruta del PC en dos pasos.
- `cantados`: prueba de que `leer` agrega a `PENDIENTES.txt` sin repetir y que una web caída no frena la pasada.
- Antes de la revisión (app sin publicar): llamadas reales de respuesta pública y DM desde la API a una cuenta con rol, y el «Test» de Meta para la forma de los avisos.
- `npm run lint` y `npm run build` sin errores; comprobar las URL en vivo.

## 8. Revisión de Meta (un solo envío)

- Permisos con acceso avanzado: `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`.
- Datos de la app: privacidad `https://mlabs.elmetacho.com/privacidad`, eliminación de datos `https://mlabs.elmetacho.com/eliminar-datos`, ícono, categoría, dominio `mlabs.elmetacho.com`.
- Tres videos de pantalla: (1) reel por DM a elmetacho_ → aparece en «Links por DM»; (2) comentario «curso» en metacholabs → respuesta pública → DM con link; (3) flujo «Ya te sigo». Descripción de uso por permiso, en inglés, escrita por Claude.

## 9. Orden de trabajo

1. Web: receptor por cuenta + parte 1 (ruta del PC en dos pasos, «Links por DM») → PR.
2. PC: `leer` baja los links (coordinado con «cantados-instagram») → commit en cantados.
3. Web: parte 2 (palabras clave, respuesta, «Ya te sigo», token y cron) → PR.
4. Web: páginas legales de MLABS → PR. En Meta: URL del webhook a `mlabs.elmetacho.com`, datos de la app.
5. Videos y envío de la revisión.

Cada paso queda funcionando y probado antes del siguiente.
