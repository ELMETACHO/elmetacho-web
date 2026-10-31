# Revisión de Meta: app «MLABS» (Instagram API with Instagram Login)

Documento de trabajo para el envío a App Review (reescrito el 2026-10-30 para MLABS multimarca; la versión anterior era de la app de una sola cuenta, «M LABS REPLY»). Pide **acceso avanzado** a `instagram_business_basic`, `instagram_business_manage_messages` e `instagram_business_manage_comments`. Los textos en inglés están listos para pegar; las notas para Oscar, el guion de los videos y la lista de envío están en español.

**Qué cambió frente al envío planeado antes:** ya no es una app que sirve solo a cuentas propias. Es una herramienta de autoservicio para marcas (cuentas profesionales de Instagram) que inician sesión con Instagram (Business Login). Eso la convierte en el caso que Meta sí revisa («Tech Provider» que sirve a varios negocios) y hace que Meta pueda probar el inicio de sesión completo, que antes era la duda 2 de la sección F.

---

## A. Fuentes y requisitos encontrados (verificado el 2026-10-25; releído el 2026-10-30)

Fuentes consultadas:

- App Review para Instagram: https://developers.facebook.com/docs/instagram-platform/app-review
- Guía de envío (screencasts, descripciones, instrucciones de prueba): https://developers.facebook.com/docs/resp-plat-initiatives/app-review/submission-guide
- Resumen de App Review: https://developers.facebook.com/docs/resp-plat-initiatives/individual-processes/app-review
- Referencia de permisos (una sola página para todos): https://developers.facebook.com/docs/permissions/reference/instagram_business_manage_messages (las secciones de `instagram_business_basic`, `instagram_business_manage_messages` e `instagram_business_manage_comments` están en esa página).

Lo que piden, según esas páginas:

| Tema | Requisito documentado |
|---|---|
| Cuándo hay revisión | Requerida si la app pide acceso avanzado para varios negocios (Tech Provider). Para una app que solo sirve a negocios propios, con acceso estándar, no hace falta; MLABS ya no es ese caso (sirve a varias marcas). «Your app must complete App Review before it can request permissions with Advanced Access from any app user.» |
| Antes de pedir acceso avanzado | Hay que haber hecho al menos una llamada exitosa a la API. |
| Ajustes de la app | Ícono 1024x1024, URL de política de privacidad, categoría, correo de contacto del negocio. |
| Instrucciones de prueba | Pasos de inicio de sesión y prueba por plataforma, cuándo y cómo se usa cada permiso; credenciales de prueba si hacen falta. La app debe estar «publicly available» o dar instrucciones de acceso. Usar cuentas de prueba de Meta; no poner credenciales personales. |
| Descripción por permiso | Una descripción propia por permiso, lo más específica posible, sin copiar el mismo texto entre permisos. |
| Screencast | Mostrar las acciones que usan el permiso, resolución 1080 o mayor, interfaz en inglés si se puede (si no, subtítulos y tooltips), sin audio (no lo escuchan), usar el mouse, explicar botones poco claros. El botón de inicio de sesión debe verse. |
| `instagram_business_basic` | Video: flujo completo de login con la concesión del permiso y luego mostrar el nombre de usuario y el ID del perfil (según Meta). MLABS sí llama a `GET /me` al iniciar sesión y muestra `@usuario` en el panel de la marca: eso es lo que se graba. |
| `instagram_business_manage_messages` (depende de `basic`) | Describir las funciones de mensajería que se ofrecen a los negocios. Video: login completo con la concesión, la app enviando un mensaje a un usuario de Instagram y el inbox de Instagram recibiéndolo; además, una solicitud cURL de envío de mensaje (se puede generar con el «API Integration Helper» en App Dashboard > Instagram). |
| `instagram_business_manage_comments` (depende de `basic`) | Explicar por qué se necesita gestionar comentarios. Video: login completo con la concesión; «Demonstrate creating, updating, and deleting a comment»; mostrar el resultado en la app y en la app nativa de Instagram. |
| Acceso avanzado | Requiere verificación del negocio (El Metacho S.A.S. ya está verificado). |
| Permisos de más | Pedir permisos que la app no usa o que no encajan con el uso permitido hace que «your submission will not be approved». |

Lo que NO está documentado o no coincide (no lo invento):

- La página de referencia no dice si la grabación es obligatoria para mensajes en este permiso (en `instagram_manage_messages`, el de Facebook Login, sí insisten en grabar). Se graba de todas formas.
- La descripción oficial de `instagram_business_manage_comments` en la página de referencia está copiada de otro permiso (publicar contenido). Solo las secciones de caso de uso y screencast son específicas de comentarios. No tiene efecto en nuestro envío, pero conviene saberlo si el revisor pregunta.
- Meta pide demostrar «crear, actualizar y borrar» un comentario. MLABS solo **crea** una respuesta pública (`POST /{comment-id}/replies`) y no edita ni borra. Se declara con honestidad en la descripción; ver riesgo en la sección F.
- No encontré una guía propia de Meta con un formato fijo para las instrucciones de prueba más allá de lo de arriba.
- Una guía de terceros (Cloudfon) también sugiere un screencast por permiso; no es fuente de Meta y no se usa como requisito.

---

## B. Descripción del producto y uso por permiso (inglés, para pegar)

### B.0 Descripción general de la app (para el campo de descripción / detalles de la app)

```
MLABS is a self-service tool for Instagram professional accounts (brands, businesses and creators). When a person comments a keyword on one of the brand's posts, MLABS automatically (1) replies publicly to that comment and (2) sends that person one private reply (DM) with a link chosen by the brand. Optionally, the brand can require the person to follow the account first: the private reply then asks them to follow and includes a "Ya te sigo" ("I already follow you") button; once the person writes back, MLABS checks whether they follow the account and, if so, sends the link.

How a brand uses it:
1. The brand opens https://mlabs.elmetacho.com/automatizar and taps "Log in with Instagram" (Instagram API with Instagram Login / Business Login) with its professional account and grants the permissions.
2. In its dashboard (https://mlabs.elmetacho.com/panel) the brand configures its own keywords, the public reply text, the DM text and the link for each keyword.
3. The brand pays a monthly subscription through Mercado Pago (the first connection of an account includes a 7-day free trial). The automation only runs while the subscription is active.
4. The brand can cancel the subscription at any time from the dashboard (the service keeps working until the end of the paid period) and can disconnect Instagram, which immediately and permanently deletes all its data.

Data use: we use the data only to provide the service on behalf of the brand that connected its account. Access tokens are stored encrypted. We do not sell data, do not use it for advertising and share it only with the providers we need to run the service (Vercel, Redis, Mercado Pago and Telegram for internal alerts). We do not store the text of comments or messages or the usernames of the people who comment.

Privacy policy: https://mlabs.elmetacho.com/privacidad
Data deletion instructions and callback: https://mlabs.elmetacho.com/eliminar-datos
```

### B.1 `instagram_business_basic`

```
MLABS needs instagram_business_basic because it is the base permission on which instagram_business_manage_comments and instagram_business_manage_messages depend, and because it is how we identify the brand that logs in.

When a brand completes "Log in with Instagram", we call GET /me?fields=user_id,username,account_type,id with the brand's token. We use the result for three things only:
1. To check that the account is a professional account (business or creator). Personal accounts are rejected with a message asking the brand to switch to a professional account.
2. To show the brand its own username (@username) at the top of its dashboard, so it can confirm that the right account is connected.
3. To store the account ID, because every webhook notification carries the ID of the account that received the event (entry.id), and that is how we find which brand's keywords apply. The app-scoped ID is stored only to find the account when Instagram calls our deauthorize / data deletion callbacks.

We do not read or store the brand's media, followers or insights, and we do not use this permission for anything else.
```

### B.2 `instagram_business_manage_comments`

```
MLABS uses instagram_business_manage_comments to answer, on behalf of the brand, the comments that contain one of the keywords the brand configured in its dashboard.

Each brand defines in its dashboard (https://mlabs.elmetacho.com/panel) a list of keywords and, for each one, the public reply text. Our webhook (https://mlabs.elmetacho.com/api/instagram/webhook, every request verified with the X-Hub-Signature-256 signature) receives the "comments" notification of the brand's account. If the comment contains a configured keyword as a whole word (case and accent insensitive), the app posts one public reply to that comment with POST /{comment-id}/replies, for example "Sent! Check your DM". Right after, it sends the private reply described under instagram_business_manage_messages. The public reply tells the commenter that the information was sent, so they know to look in their DMs.

Why it is needed: without it the app cannot answer the comment, and the commenter would not know that a private message is waiting for them.

The app posts at most one public reply per matching comment. Instagram only allows public replies to top-level comments, so for a comment that is itself a reply the app skips the public reply and sends only the private message. The app does not edit, hide, moderate or delete comments, it ignores comments written by the brand's own account, and it answers each comment only once. Comments are not stored: only a marker that a comment ID was already answered is kept for 8 days to avoid duplicates.

The automation only runs for brands with an active subscription and can be stopped by the brand at any time (delete the keyword, cancel the subscription or disconnect Instagram).

Privacy policy: https://mlabs.elmetacho.com/privacidad
Data deletion instructions: https://mlabs.elmetacho.com/eliminar-datos
```

### B.3 `instagram_business_manage_messages`

```
MLABS uses instagram_business_manage_messages to send, on behalf of the brand, one private reply (DM) to a person who commented a keyword on the brand's post, and to complete the optional "follow first" step.

Flow 1 - Private reply after a keyword comment. When a person comments a keyword configured by the brand, the app sends exactly one message to that person with POST /{ig-id}/messages using recipient.comment_id, containing the text and the link that the brand configured for that keyword (for example a price list, a catalog or a booking page). The person asked for it by commenting. We send one message per comment, within the 7-day window Instagram allows for private replies. We do not send marketing broadcasts, we do not message people who have not commented or written first, and we do not use messages for advertising.

Flow 2 - Optional "follow first" step. If the brand enabled "ask to follow" for a keyword, the private reply asks the person to follow the account and includes a quick reply button "Ya te sigo" ("I already follow you"). The person can tap the button or simply reply; in both cases Instagram delivers a message from the user, which opens the 24-hour messaging window. The app treats any message from a person who has a pending follow check as the confirmation and reads GET /{igsid}?fields=is_user_follow_business. If the person follows the account, the app sends the link. If not, it sends one reminder to follow and offers the button again.

Why it is needed: the private reply is the core of the product (deliver the brand's link to the person who asked for it) and the follow check needs the person's reply to be read.

What we store: only the Instagram-scoped ID of the person while they wait for the follow check (24 hours, then deleted) and a marker that a comment was already answered (8 days). We do not store the text of comments or messages, nor usernames. The brand's DM text and link are the brand's own configuration and are deleted when it disconnects.

Note: our own accounts (@elmetacho_ and @metacholabs, owned by El Metacho S.A.S., our verified business) are connected to the same app. For @elmetacho_ the webhook receives reels that followers share by DM and stores only the shared link and its arrival time and, if configured, an anonymous hash of the sender (an HMAC, not the ID or username) for 3 days to avoid duplicates (no reply is sent). This is described in the privacy policy.

Privacy policy: https://mlabs.elmetacho.com/privacidad
Data deletion instructions: https://mlabs.elmetacho.com/eliminar-datos
```

---

## C. Guion de los tres videos

Reglas comunes (de la guía de Meta; ver sección A): grabar en 1080 o más, **sin audio**, interfaz de Instagram y del navegador en **inglés** si se puede (nuestra web está en español: por eso cada paso lleva subtítulo en inglés), usar el mouse, mostrar la barra de direcciones (recomendación nuestra) y explicar los botones poco claros. Un video por permiso y **solo** con lo de ese permiso. Cada video de preferencia menos de 2 a 3 minutos (recomendación nuestra). El botón «Iniciar sesión con Instagram» debe verse en cada video (Meta lo exige).

**Antes de grabar:**
- Dos cuentas de Instagram de prueba **profesionales y públicas**, ambas con rol de probador en la app: la «marca» (A) y quien comenta (B). La marca A debe tener al menos una publicación.
- La marca A **sin** conectar a MLABS (o desconectada), para grabar el inicio de sesión desde cero.
- `MLABS_CODIGO_REVISION` puesto en Vercel. Si se activa con el código, el código se escribe en un campo de texto VISIBLE (no es un campo de contraseña): difumina el código en la edición del video. No mostrar nunca el código real.
- Palabras de ejemplo: «precio» (sin pedir seguir) y «guia» (con «Pedir que me siga»).
- Los subtítulos se agregan en edición (o texto en pantalla).

### Video 1: `instagram_business_basic` (inicio de sesión y perfil)

| # | Qué se ve y qué se hace | Subtítulo (inglés) |
|---|---|---|
| 1 | Abrir `https://mlabs.elmetacho.com/automatizar`. Mostrar la página y el botón «Iniciar sesión con Instagram». | MLABS landing page. Brands log in with their Instagram professional account. |
| 2 | Clic en «Iniciar sesión con Instagram». | Button "Iniciar sesión con Instagram" = "Log in with Instagram". |
| 3 | Pantalla de Instagram con el usuario de la marca A y la lista de permisos. Pausar para que se lean los tres permisos. | Instagram Business Login: the brand grants instagram_business_basic, manage_comments and manage_messages. |
| 4 | Permitir. Vuelve a `/panel`. Mostrar `@usuario` arriba. | After login, the dashboard shows the connected account (@username), read with instagram_business_basic. |
| 5 | Mostrar «Estado: sin_pago» y el formulario «Activa tu automatización». | Status "sin_pago" = payment pending. The brand must activate the subscription. |
| 6 | Abrir «Tengo un código de acceso», pegar el código en el campo de texto (difuminarlo en la edición) y pulsar «Activar». Vuelve el panel con la cuenta activa. | "Tengo un código de acceso" = "I have an access code" (reviewer code). Brands normally pay through Mercado Pago. |
| 7 | (Opcional) Mostrar el mensaje de `/automatizar?error=personal`. | Personal accounts are rejected: only professional accounts can connect. |

### Video 2: `instagram_business_manage_comments` (respuesta pública)

Inicio común (unos 20 s): el login del video 1, pasos 1 a 4, resumido y con el botón visible.

| # | Qué se ve y qué se hace | Subtítulo (inglés) |
|---|---|---|
| 1 | En `/panel`, bloque «Tus palabras clave». Mostrar la palabra «precio» con sus campos. | Keywords section. "Palabra" = keyword, "Respuesta en el comentario" = public reply, "Mensaje del DM" = DM text, "Link" = link. |
| 2 | Mostrar «Respuesta en el comentario» (por ejemplo «¡Enviado! Revisa tu DM 📩») y «Activa» marcado. | Public reply that MLABS will post under the comment: "Sent! Check your DM". |
| 3 | Con la cuenta B, abrir una publicación de la marca A y comentar `precio`. | Another account comments the keyword "precio" on the brand's post. |
| 4 | En la **app nativa de Instagram**, mostrar bajo ese comentario la respuesta pública de la marca A. | MLABS replied publicly with POST /{comment-id}/replies (instagram_business_manage_comments). |
| 5 | Comentar `hola` (sin la palabra) y mostrar que no hay respuesta. | A comment without the keyword gets no reply. |
| 6 | Rótulo final. | The app only creates replies. It never edits, hides or deletes comments. |
| 7 | (Opcional) Mostrar el cURL de `POST /{comment-id}/replies` del API Integration Helper. | Equivalent API request. |

### Video 3: `instagram_business_manage_messages` (DM con el link y «Ya te sigo»)

Inicio común (unos 20 s): login resumido, con el botón visible y la pantalla de permisos.

| # | Qué se ve y qué se hace | Subtítulo (inglés) |
|---|---|---|
| 1 | En `/panel`, mostrar «precio» con «Mensaje del DM» y «Link» configurados. | The brand configured the DM text and the link for this keyword. |
| 2 | Cuenta B comenta `precio` en la publicación de la marca A. | A person comments the keyword. |
| 3 | Abrir los mensajes de la cuenta B y mostrar el DM recibido de la marca A con el link. Tocar el link. | The person receives one private reply with the link (POST /{ig-id}/messages with recipient.comment_id). |
| 4 | En `/panel`, mostrar «guia» con «Pedir que me siga» marcado. | "Pedir que me siga" = "Ask the person to follow me first". |
| 5 | La cuenta B **no** sigue a la marca A. Comentar `guia`. Mostrar el DM con «Ya te sigo». | The DM asks the person to follow first and shows the button "Ya te sigo" = "I already follow you". |
| 6 | Tocar «Ya te sigo» (o escribir cualquier texto) sin seguir: mostrar el recordatorio «Aún no me sigues…». | The person has not followed yet: MLABS replies with a reminder. |
| 7 | Seguir a la marca A desde B (mostrar «Following»). Tocar «Ya te sigo» de nuevo: llega el mensaje con el link. | After following, the person receives the link. Follow status is read with GET /{igsid}?fields=is_user_follow_business. |
| 8 | (Opcional) Mostrar el cURL de `POST /{ig-id}/messages` del API Integration Helper. | Equivalent API request. |

Nota: el botón «Ya te sigo» en una respuesta privada **no se ha probado nunca en vivo**. Si Instagram no lo muestra, grabar con una respuesta de texto y ajustar el subtítulo (ver riesgo 5 en la sección F).

---

## D. Test instructions for the reviewer (English, para pegar)

El código de acceso **no** va escrito en este archivo (el repo es público). Oscar lo pega a mano en el formulario de Meta, donde dice `<OSCAR PASTES MLABS_CODIGO_REVISION HERE IN THE META FORM>`.

```
OVERVIEW
MLABS is a self-service web tool for Instagram professional accounts (brands). When someone comments a keyword on the brand's post, MLABS replies publicly and sends the person a private reply (DM) with a link. Every brand logs in with Instagram (Business Login), configures its own keywords in its dashboard and pays a monthly subscription through Mercado Pago. For review, a one-time access code activates the account without payment.
Site: https://mlabs.elmetacho.com/automatizar
Privacy policy: https://mlabs.elmetacho.com/privacidad
Data deletion: https://mlabs.elmetacho.com/eliminar-datos
The website is in Spanish; English translations of the labels are given below in parentheses.

WHAT YOU NEED
- Account A: an Instagram PROFESSIONAL (business or creator) and PUBLIC account with at least one post. This is the "brand". Personal accounts are rejected by design.
- Account B: any other Instagram account, used to write the comment and to receive the DM.
- ACCESS CODE: <OSCAR PASTES MLABS_CODIGO_REVISION HERE IN THE META FORM>

STEPS
1. Open https://mlabs.elmetacho.com/automatizar and click the black button "Iniciar sesión con Instagram" ("Log in with Instagram").
2. Log in with account A and accept the permissions (instagram_business_basic, instagram_business_manage_comments, instagram_business_manage_messages). You are redirected to https://mlabs.elmetacho.com/panel and see "@<account A username>" at the top and "Estado: sin_pago" ("Status: payment pending").
3. In the box "Activa tu automatización" ("Activate your automation"), open "Tengo un código de acceso" ("I have an access code"), paste the ACCESS CODE and click "Activar" ("Activate"). The page reloads and the status changes to "activa" (active). The email field is not needed when you use the code. No payment is requested.
4. In the section "Tus palabras clave" ("Your keywords") click "+ Palabra" ("+ Keyword") and fill in:
   - "Palabra" (Keyword): precio
   - "Respuesta en el comentario" (Reply in the comment): the default text is fine ("Sent! Check your DM" in Spanish)
   - "Mensaje del DM" (DM message): any text, for example "Here is the information you asked for"
   - "Link": any https:// link, for example https://mlabs.elmetacho.com
   - Leave "Activa" (Active) checked and "Pedir que me siga" (Ask them to follow me first) unchecked.
   Click "Guardar" (Save). You will see "Guardado ✓" (Saved).
5. With account B, open a post of account A and comment: precio
6. Within a few seconds you will see (a) a public reply from account A under your comment and (b) a private message from account A in the DMs of account B, containing your text and link.
7. A comment that does not contain the keyword as a whole word (for example "precios" or "hola") gets no reply. A repeated notification for the same comment never produces a duplicate reply.

OPTIONAL - "follow first" flow
8. In the dashboard add a second keyword, for example "guia", and check "Pedir que me siga" (Ask them to follow me first). Save.
9. Make sure account B does NOT follow account A. Comment: guia
10. Account B receives a DM asking to follow the account, with a button "Ya te sigo" ("I already follow you"). If your client does not show the button, reply with any text.
11. Tap the button (or reply) without following: the account answers that you do not follow it yet ("Aún no me sigues...") and offers the button again.
12. Follow account A from account B and tap the button (or reply) again: you receive the link. The follow status is read with GET /{igsid}?fields=is_user_follow_business only after account B wrote to the account.

DISCONNECT (data deletion)
13. At the bottom of the dashboard, click "Desconectar Instagram y borrar mis datos" ("Disconnect Instagram and delete my data") and confirm. You are taken to https://mlabs.elmetacho.com/eliminar-datos?listo=1 with the message "Listo: tu cuenta se desconectó y tus datos se borraron" ("Done: your account was disconnected and your data were deleted"). Token, keywords, subscription and all records of the account are removed immediately. Brands with a paid subscription also have a "Cancelar suscripción" ("Cancel subscription") button in the dashboard.
14. If the brand removes the app from Instagram (Settings > Apps and websites), our deauthorize callback (https://mlabs.elmetacho.com/api/mlabs/instagram/desautorizar) deletes the same data; the data deletion request callback is https://mlabs.elmetacho.com/api/mlabs/instagram/eliminar.

NOTES
- The app uses only instagram_business_basic, instagram_business_manage_comments and instagram_business_manage_messages.
- Private replies are limited to one message per comment, within 7 days of the comment.
- The app only creates public replies; it does not edit or delete comments.
- Comment and message texts and usernames of commenters are not stored.
```

---

## E. Lista de envío para Oscar (español)

Hazla el día del envío, en este orden. Lo marcado «(doc)» sale de la documentación de Meta releída el 2026-10-30 (https://developers.facebook.com/docs/instagram-platform/app-review). **Ese día vuelve a leer esa página y anota abajo cualquier cambio.**

**Antes de abrir el formulario**
- [ ] **Prueba de punta a punta hecha** (Tarea 13, Paso 1 del plan): Meta exige al menos una llamada exitosa por permiso (doc), y «Ya te sigo» nunca se ha probado en vivo.
- [ ] **Nombre de la app en Meta:** «MLABS». Las páginas `/privacidad` y `/eliminar-datos` del sitio ya dicen «MLABS» (corregido el 2026-10-30).
- [ ] Dos cuentas de prueba profesionales y públicas con rol de probador (marca A y comentarista B), ver sección C.
- [ ] `MLABS_CODIGO_REVISION` puesto en Vercel (frase larga y aleatoria que solo tú ves). Sin la variable ningún código sirve.
- [ ] Grabar y editar los tres videos (sección C) con subtítulos en inglés.
- [ ] Glifo oficial de Instagram (pack de Meta): ya está en `public/marca/instagram-glyph.png` y el botón de `/automatizar` lo muestra.

**Ajustes de la app (App Dashboard > Ajustes de la app > Básico)**
- [ ] **Ícono de 1024×1024** (doc).
- [ ] **URL de la política de privacidad:** `https://mlabs.elmetacho.com/privacidad` (doc).
- [ ] **Categoría** de la app (doc).
- [ ] **Correo de contacto del negocio** en Ajustes de desarrollador: aquí llegan los resultados (doc).
- [ ] **Dominio de la app:** `mlabs.elmetacho.com`.
- [ ] **Eliminación de datos:** URL de devolución de llamada `https://mlabs.elmetacho.com/api/mlabs/instagram/eliminar` (responde `url` y `confirmation_code`), o la página `https://mlabs.elmetacho.com/eliminar-datos` si el formulario pide una página.
- [ ] **Desautorizar:** `https://mlabs.elmetacho.com/api/mlabs/instagram/desautorizar`.
- [ ] **URI de redirección OAuth** de Instagram Business Login: `https://mlabs.elmetacho.com/api/mlabs/instagram/vuelta` (exactamente igual).
- [ ] **Webhooks de Instagram:** URL `https://mlabs.elmetacho.com/api/instagram/webhook` con la frase de `IG_WEBHOOK_VERIFY_TOKEN`; campos `comments` y `messages`.
- [ ] Verificación del negocio vigente (El Metacho S.A.S.); el acceso avanzado la exige.
- [ ] App publicada (modo Live) y que se pueda cargar y probar desde fuera (doc).

**App Review > Permisos y funciones: por cada permiso**
- [ ] Solicitar los tres y **solo** esos tres (pedir de más hace que no aprueben; doc). `basic` va incluido porque los otros dos dependen de él (doc).
- [ ] **Descripción** del uso: pegar la de la sección B que corresponde (B.1, B.2, B.3), sin mezclar entre permisos. B.0 va en la descripción general.
- [ ] **Video:** el 1 a `basic`, el 2 a `manage_comments`, el 3 a `manage_messages`.
- [ ] **Aceptar el uso permitido** de cada permiso (doc).
- [ ] **Instrucciones de prueba:** pegar la sección D y, **solo en el formulario de Meta**, reemplazar `<OSCAR PASTES MLABS_CODIGO_REVISION HERE IN THE META FORM>` por el código real. No lo escribas en este archivo, en el chat ni en ningún commit.
- [ ] Sin credenciales personales en las instrucciones (usar cuentas de prueba).

**Después del envío**
- [ ] Anotar la fecha del envío en `docs/BRIEF.md` («Resumen de sesiones») y en la bitácora.
- [ ] Cuando aprueben: cambiar o quitar `MLABS_CODIGO_REVISION` (el código deja de servir) y comprobar que las cuentas activadas con él (`origen: "codigo"`) sean solo de prueba.

**Cambios en la doc de Meta el día del envío:** _(anotar aquí)_

---

## F. Riesgos y dudas (para no llevarse sorpresas)

1. **Comentarios: crear, actualizar y borrar.** Meta pide mostrar los tres. La app solo crea respuestas. Puede que el revisor lo cuestione; la descripción lo dice con claridad y el video 2 lo rotula. Si lo rechazan por eso, la salida honesta es explicar el uso real o añadir un borrado de nuestras propias respuestas (decisión de Oscar, no se hace sin spec).
2. **Botón de inicio de sesión.** Meta dice que debe verse y seguir sus guías de marca (doc). El botón ya lleva el glifo oficial de Instagram (`public/marca/instagram-glyph.png`); **falta mirarlo en la vista previa** y comprobar que cumple las guías de marca antes de grabar.
3. **Revisor sin rol en la app.** Mientras el acceso avanzado no esté aprobado, normalmente solo autorizan la app las cuentas con rol. **No está verificado** que el revisor de Meta pueda conectar su cuenta sin rol. Si responde que no puede, añadirlo como probador. Estar atento al correo de contacto.
4. **El revisor no paga:** usa el código. Si Meta insiste en ver el cobro, ofrecer un video; nunca dar tarjetas.
5. **Botón «Ya te sigo» no verificado.** La documentación de Meta no dice que una respuesta privada (con `recipient.comment_id`) acepte botones de respuesta rápida. El código trata cualquier mensaje del usuario con una espera vigente de 24 h como confirmación, así que el flujo funciona aunque el botón no aparezca (el usuario responde con cualquier texto). Antes de grabar el video 3, comprobar en vivo si el botón se ve; si no, grabar con respuesta de texto y ajustar el subtítulo.
6. **Textos del sitio con el nombre viejo.** Resuelto el 2026-10-30: `/privacidad` y `/eliminar-datos` ya dicen «MLABS».
7. **Cuentas propias en la misma app.** @elmetacho_ (links por DM) y @metacholabs se atienden con la misma app; la política de privacidad lo explica y B.3 lo declara. El revisor puede preguntar.
