# Revisión de Meta: app «M LABS REPLY» (Instagram API with Instagram Login)

Documento de trabajo para el envío a App Review (2026-10-25). Pide **acceso avanzado** a `instagram_business_basic`, `instagram_business_manage_messages` e `instagram_business_manage_comments`. Los textos en inglés están listos para pegar; el guion de los videos y la lista de pendientes están en español.

---

## A. Fuentes y requisitos encontrados (verificado el 2026-10-25)

Fuentes consultadas:

- App Review para Instagram: https://developers.facebook.com/docs/instagram-platform/app-review
- Guía de envío (screencasts, descripciones, instrucciones de prueba): https://developers.facebook.com/docs/resp-plat-initiatives/app-review/submission-guide
- Resumen de App Review: https://developers.facebook.com/docs/resp-plat-initiatives/individual-processes/app-review
- Referencia de permisos (una sola página para todos): https://developers.facebook.com/docs/permissions/reference/instagram_business_manage_messages (las secciones de `instagram_business_basic`, `instagram_business_manage_messages` e `instagram_business_manage_comments` están en esa página).

Lo que piden, según esas páginas:

| Tema | Requisito documentado |
|---|---|
| Cuándo hay revisión | Requerida si la app pide acceso avanzado para varios negocios (Tech Provider). Para una app que solo sirve a negocios propios, con acceso estándar, no hace falta. «Your app must complete App Review before it can request permissions with Advanced Access from any app user.» |
| Antes de pedir acceso avanzado | Hay que haber hecho al menos una llamada exitosa a la API. |
| Ajustes de la app | Ícono 1024x1024, URL de política de privacidad, categoría, correo de contacto del negocio. |
| Instrucciones de prueba | Pasos de inicio de sesión y prueba por plataforma, cuándo y cómo se usa cada permiso; credenciales de prueba si hacen falta. La app debe estar «publicly available» o dar instrucciones de acceso. Usar cuentas de prueba de Meta; no poner credenciales personales. |
| Descripción por permiso | Una descripción propia por permiso, lo más específica posible, sin copiar el mismo texto entre permisos. |
| Screencast | Mostrar las acciones que usan el permiso, resolución 1080 o mayor, interfaz en inglés si se puede (si no, subtítulos y tooltips), sin audio (no lo escuchan), usar el mouse, explicar botones poco claros. El botón de inicio de sesión debe verse. |
| `instagram_business_basic` | Video: flujo completo de login con la concesión del permiso y luego mostrar el nombre de usuario y el ID del perfil (según Meta). Nuestra app no llama a ningún endpoint de perfil: se muestra desde el panel de Meta. |
| `instagram_business_manage_messages` (depende de `basic`) | Describir las funciones de mensajería que se ofrecen a los negocios. Video: login completo con la concesión, la app enviando un mensaje a un usuario de Instagram y el inbox de Instagram recibiéndolo; además, una solicitud cURL de envío de mensaje (se puede generar con el «API Integration Helper» en App Dashboard > Instagram). |
| `instagram_business_manage_comments` (depende de `basic`) | Explicar por qué se necesita gestionar comentarios. Video: login completo con la concesión; «Demonstrate creating, updating, and deleting a comment»; mostrar el resultado en la app y en la app nativa de Instagram. |
| Acceso avanzado | Requiere verificación del negocio (El Metacho S.A.S ya está verificado). |
| Permisos de más | Pedir permisos que la app no usa o que no encajan con el uso permitido hace que «your submission will not be approved». |

Lo que NO está documentado o no coincide (no lo invento):

- La página de referencia no dice si la grabación es obligatoria para mensajes en este permiso (en `instagram_manage_messages`, el de Facebook Login, sí insisten en grabar). Se graba de todas formas.
- La descripción oficial de `instagram_business_manage_comments` en la página de referencia está copiada de otro permiso (publicar contenido). Solo las secciones de caso de uso y screencast son específicas de comentarios. No tiene efecto en nuestro envío, pero conviene saberlo si el revisor pregunta.
- Meta pide demostrar «crear, actualizar y borrar» un comentario. Nuestra app solo **crea** una respuesta pública (`POST /{comment-id}/replies`) y no edita ni borra. Se declara con honestidad en la descripción; ver riesgo en la sección F.
- No encontré una guía propia de Meta con un formato fijo para las instrucciones de prueba más allá de lo de arriba.
- Una guía de terceros (Cloudfon) también sugiere un screencast por permiso; no es fuente de Meta y no se usa como requisito.

---

## B. Descripciones de uso por permiso (inglés, para pegar)

### B.1 `instagram_business_basic`

```
M LABS REPLY needs instagram_business_basic because it is the base permission on which instagram_business_manage_messages and instagram_business_manage_comments depend, and it gives the app basic access to the Instagram professional accounts it is connected to.

We operate two Instagram professional accounts, both owned by our verified business, El Metacho S.A.S.: El Metacho (@elmetacho_, Instagram ID 17841402790807435) and MLABS (@metacholabs, Instagram ID 17841480070378472). Every webhook notification carries the ID of the account that received the event (entry.id). The app compares that ID with the two accounts above to decide what to do with the event. The app does not call any profile endpoint to do this.

We do not read or store the profile's media, followers or insights.
```

### B.2 `instagram_business_manage_messages`

```
M LABS REPLY uses instagram_business_manage_messages in two separate flows, one per account.

Flow 1 - Receiving links by DM (account @elmetacho_, no message is ever sent). Followers of El Metacho (a Colombian comedy channel) share reels and TikTok links with the account by Instagram DM, so the owner can consider them as ideas for new videos. Our webhook (https://mlabs.elmetacho.com/api/instagram/webhook, every request is verified with the X-Hub-Signature-256 signature) receives the message event. The app extracts only the shared link (the ig_reel attachment URL or a URL in the text) and the time it arrived, and stores them. The sender's name, the text of the message and any other content are not stored. The stored links appear in a private admin page ("Links por DM", www.elmetacho.com/admin/dm-links) that only the account owner can open, and the owner's computer retrieves them once a day to propose videos. No reply is sent in this flow.

Flow 2 - Sending a link after a keyword comment (account @metacholabs, the account of our agency MLABS). The business configures keywords in a private admin page (www.elmetacho.com/admin/palabras). When a person comments a configured keyword on a post of @metacholabs (for example "curso"), the app sends exactly one private reply to that person with POST /{ig-id}/messages using recipient.comment_id, containing a link to a free resource hosted at mlabs.elmetacho.com. The person asked for it by commenting, and we send only one message per comment, within the 7-day window.
Optionally, a keyword can require that the person follows the account first. In that case the private reply asks the person to follow the account and includes a quick reply button, "Ya te sigo" ("I already follow you"). The person can tap the button or simply reply to the message; in both cases Instagram delivers a message from the user, which opens the 24-hour messaging window. The app treats any message from a person who has a pending follow check (24 hours) as the confirmation. The app then checks GET /{igsid}?fields=is_user_follow_business. If the person follows the account, the app sends the resource link. If not, it sends a short reminder asking the person to follow the account and reply or tap the button again.

What we store: only the Instagram-scoped ID of the person while they wait for the follow check (24 hours, then deleted), and a marker that a comment was already answered (8 days). We do not store the text of comments or messages or usernames. We do not send marketing broadcasts, we do not message people who have not commented or written first, and we do not use the data for advertising or share it with third parties.

Privacy policy: https://mlabs.elmetacho.com/privacidad
Data deletion instructions: https://mlabs.elmetacho.com/eliminar-datos
```

### B.3 `instagram_business_manage_comments`

```
M LABS REPLY uses instagram_business_manage_comments on the account @metacholabs (MLABS, owned by our verified business El Metacho S.A.S.) to answer comments that contain a keyword configured by the business.

The business configures keywords and the public reply text in a private admin page (www.elmetacho.com/admin/palabras). When our webhook (https://mlabs.elmetacho.com/api/instagram/webhook, signature verified) receives a "comments" notification and the comment contains a configured keyword as a whole word (case and accent insensitive), the app posts one public reply to that comment with POST /{comment-id}/replies, for example "Enviado! Revisa tu DM" ("Sent! Check your DM"). Right after, it sends the private reply described under instagram_business_manage_messages. The public reply tells the commenter that the resource is waiting in their DMs.

The app attempts one public reply to each comment that matches a keyword. If Instagram rejects it (for example because the comment is itself a reply), the app logs the error and still sends the private reply. It does not edit or delete comments, it does not moderate, hide or delete anyone's comments, it ignores comments written by the account itself, and it answers each comment only once. The app does not store the text of comments or usernames; it stores only a marker that a comment ID was already answered (8 days) to avoid duplicate replies when Meta resends a notification.

Privacy policy: https://mlabs.elmetacho.com/privacidad
Data deletion instructions: https://mlabs.elmetacho.com/eliminar-datos
```

---

## C. Guion de los tres videos (español)

Reglas comunes (de la guía de Meta): grabar en 1080 o más, **sin audio** (no lo escuchan), navegador y Instagram en **inglés** si se puede (si algo queda en español, poner subtítulos o un texto en pantalla que lo explique), usar el mouse, mostrar la barra de direcciones para que se vea el sitio (recomendación nuestra, no de Meta), y poner rótulos en pantalla (por ejemplo «Cuenta: @metacholabs»). Cada video, de preferencia menos de 2 minutos (recomendación nuestra, no de Meta). Antes de grabar: app configurada (webhook a `mlabs.elmetacho.com`, `IG_TOKEN_LABS` y `CRON_SECRET` en Vercel, palabra «curso» creada y activa) y, si la app aún no está publicada, hacerlo con cuentas con rol en la app.

Parte común al inicio de cada video (unos 20 segundos): mostrar el **inicio de sesión de Instagram** con el botón visible y la pantalla donde se concede el permiso del que trata el video (Meta lo pide en cada permiso). Si el inicio de sesión por permiso no se puede repetir, ver la nota en la sección F.

### Video 1: `instagram_business_manage_messages` + `instagram_business_basic` (reel por DM a elmetacho_)

1. (Rótulo: «Permisos: instagram_business_basic y instagram_business_manage_messages».) Mostrar el login de Instagram de la cuenta **elmetacho_** y la pantalla de permisos concedidos.
2. Mostrar en el panel de Meta (App Dashboard > Instagram) la cuenta **elmetacho_** conectada, con su nombre de usuario y el ID `17841402790807435`. Rótulo: «Esto se ve en el panel de Meta, no en la app; la app identifica la cuenta por el ID que llega en el aviso del webhook (entry.id)» (cubre `basic`, de la que dependen los otros dos permisos).
3. Desde otro celular o cuenta de prueba (una cuenta con rol en la app): abrir un reel, tocar enviar y mandarlo por DM a **elmetacho_**. Que se vea el DM enviado.
4. Cambiar al navegador: abrir `www.elmetacho.com/admin/dm-links` (con la sesión de admin iniciada) y mostrar que el link del reel apareció, con la hora. Rótulo: «La app guarda solo el link y la hora».
5. Mostrar también el aviso del webhook: en Vercel, el registro de la petición `POST /api/instagram/webhook` con código 200 (sin mostrar datos personales).
6. Cerrar con la solicitud cURL: en el API Integration Helper, la solicitud de envío de mensaje (`POST /{ig-id}/messages`) tal como pide Meta. Rótulo: «En este flujo no se envía respuesta; el envío de mensajes se muestra en el video 2 y 3».

### Video 2: `instagram_business_manage_comments` + mensaje por comentario (metacholabs)

1. (Rótulo: «Permisos: instagram_business_manage_comments e instagram_business_manage_messages».) Mostrar el login de Instagram de **metacholabs** y la concesión de permisos.
2. Abrir `www.elmetacho.com/admin/palabras` y mostrar la palabra «curso» (sin «pedir seguir»), con la respuesta pública, el mensaje y el link configurados.
3. Desde una cuenta de prueba con rol, abrir una publicación de **metacholabs** y comentar `curso`.
4. Mostrar en la **app de Instagram** (la nativa) bajo ese comentario la respuesta pública de metacholabs («¡Enviado! Revisa tu DM»). Meta pide ver el resultado en la app nativa.
5. Abrir los DM de la cuenta de prueba y mostrar el mensaje con el link recibido de metacholabs. Tocar el link y mostrar que abre el recurso en `mlabs.elmetacho.com`.
6. Mostrar el cURL de la respuesta pública (`POST /{comment-id}/replies`) y del DM con `recipient.comment_id` en el API Integration Helper.
7. Decir en un rótulo: «La app solo crea respuestas; no edita ni borra comentarios».

### Video 3: flujo «Ya te sigo» (metacholabs)

1. (Rótulo: «Mismos permisos que el video 2».) En `www.elmetacho.com/admin/palabras`, mostrar una palabra con «pedir seguir» activado (por ejemplo «guia»).
2. La cuenta de prueba **no** sigue a metacholabs. Comentar `guia` en una publicación de metacholabs.
3. Mostrar la respuesta pública y el DM «Para recibirlo, sígueme y toca 👇» con el botón **«Ya te sigo»** (si Instagram no muestra el botón, ver el riesgo 5 de la sección F: se responde con cualquier texto).
4. Tocar «Ya te sigo» (o responder cualquier texto) sin seguir la cuenta: mostrar el recordatorio «Aún no me sigues…».
5. Seguir a metacholabs desde la cuenta de prueba (mostrar el botón «Siguiendo») y tocar «Ya te sigo» (o responder) otra vez: mostrar que llega el mensaje con el link.
6. Mostrar el cURL de la consulta `GET /{igsid}?fields=is_user_follow_business` en el API Integration Helper. Rótulo: «Solo se consulta después de que el usuario escribe primero».

---

## D. Test instructions for the reviewer (English)

```
OVERVIEW
M LABS REPLY is a server-side app (no end-user web UI for the Instagram flows). Everything is triggered by Instagram events that reach our webhook (https://mlabs.elmetacho.com/api/instagram/webhook). Two business accounts, both owned by El Metacho S.A.S. (verified business), are connected:
- El Metacho: @elmetacho_ (Instagram ID 17841402790807435) - receives links by DM.
- MLABS: @metacholabs (Instagram ID 17841480070378472) - answers keyword comments.
Privacy policy: https://mlabs.elmetacho.com/privacidad
Data deletion: https://mlabs.elmetacho.com/eliminar-datos

WHAT YOU NEED
- An Instagram account with a role on the app (tester) or a Meta test account. Credentials: [OSCAR: complete here a tester account created for the reviewer, or write "use the Meta test account provided by App Review"; do not use a personal account].
- Admin pages: www.elmetacho.com/admin/dm-links and www.elmetacho.com/admin/palabras. Admin login: [OSCAR: temporary reviewer credentials, created for this review and revoked afterwards].

TEST 1 - instagram_business_basic and instagram_business_manage_messages (receiving a link)
1. From your test Instagram account, open any reel and send it by DM to @elmetacho_ (Share > Send).
2. Open www.elmetacho.com/admin/dm-links and sign in. Within a few seconds a new row appears with the reel link and the arrival time.
3. The app only stores the link and the time. No reply is sent in this flow.

TEST 2 - instagram_business_manage_comments and instagram_business_manage_messages (keyword comment, no follow required)
1. Open www.elmetacho.com/admin/palabras to see the configured keywords. The keyword "curso" is active and does not require following.
2. From your test account, open any recent post of @metacholabs and comment: curso
3. Within a few seconds, a public reply from @metacholabs appears under your comment ("Enviado! Revisa tu DM").
4. Open your Instagram DMs: you receive one private message from @metacholabs with a link to a resource at mlabs.elmetacho.com.
5. Comment "curso" again on the same post: a second comment gets its own reply, but a repeated webhook for the same comment never produces a duplicate.
6. A comment that does not contain a keyword as a whole word (for example "recursos") gets no reply.

TEST 3 - "Ya te sigo" flow (follow first)
1. Make sure your test account does NOT follow @metacholabs.
2. Comment on a post of @metacholabs: guia  (keyword with "follow first" enabled).
3. You receive a public reply and a DM asking you to follow the account, with a quick reply button "Ya te sigo" (if your Instagram client does not show the button, just proceed with the next step by replying with any text).
4. Tap "Ya te sigo" (or reply with any text) without following: the account replies that you do not follow it yet and offers the button again.
5. Follow @metacholabs and tap "Ya te sigo" (or reply with any text) again: you receive the resource link.
6. The follow status is read with GET /{igsid}?fields=is_user_follow_business, only after you wrote to the account (tapping the button or replying).

NOTES
- Instagram Login is the only login used. The app uses the permissions instagram_business_basic, instagram_business_manage_messages and instagram_business_manage_comments, and no others.
- Private replies are limited to one message per comment, within 7 days of the comment.
- To delete data: follow https://mlabs.elmetacho.com/eliminar-datos.
```

---

## E. Lista para Oscar antes de enviar (español)

En el panel de la app «M LABS REPLY» (developers.facebook.com):

- [ ] **Ajustes > Básico:** URL de política de privacidad `https://mlabs.elmetacho.com/privacidad`.
- [ ] **Eliminación de datos:** URL de instrucciones `https://mlabs.elmetacho.com/eliminar-datos`.
- [ ] **Dominio de la app:** `mlabs.elmetacho.com`.
- [ ] **Ícono** de 1024x1024, **categoría** de la app y **correo de contacto** del negocio (aquí llegan los resultados).
- [ ] **Instagram > Webhooks:** cambiar la URL de devolución de llamada a `https://mlabs.elmetacho.com/api/instagram/webhook` (con la frase de verificación de Vercel) y suscribir los campos `messages` y `comments`.
- [ ] **Vercel:** variable `IG_TOKEN_LABS` (token generado con «Generar identificador» en la fila de metacholabs; no se pega en el chat) y `CRON_SECRET` (para el cron diario que renueva el token). Redesplegar después de ponerlas.
- [ ] Hacer **al menos una llamada exitosa** con cada permiso (Meta lo exige antes de pedir acceso avanzado): comentario real y DM real con cuentas con rol.
- [ ] Crear la cuenta de prueba y las credenciales temporales de admin para el revisor (no existe modo de solo lectura; se crean para la revisión y se quitan después), y completar los `[OSCAR: …]` de la sección D.
- [ ] Palabras creadas en `/admin/palabras`: «curso» (sin pedir seguir) y una con «pedir seguir» (por ejemplo «guia»), con link al recurso.
- [ ] Grabar los tres videos (sección C) y subirlos, cada uno al permiso que corresponde.
- [ ] Pegar las tres descripciones de la sección B, una por permiso, sin mezclar.
- [ ] Verificación del negocio: ya está (El Metacho S.A.S). Revisar que sigue vigente.
- [ ] Después del envío, anotar la fecha en `docs/BRIEF.md` («Resumen de sesiones»).

---

## F. Riesgos y dudas (para no llevarse sorpresas)

1. **Comentarios: crear, actualizar y borrar.** Meta pide mostrar los tres. La app solo crea respuestas. Puede que el revisor lo cuestione; la descripción lo dice con claridad y el video lo muestra. Si lo rechazan por eso, la salida honesta es explicar el uso real o añadir un borrado de nuestras propias respuestas desde `/admin` (decisión de Oscar, no se hace sin spec).
2. **«Login completo» en cada video.** Meta lo pide por permiso, y nuestra app no tiene botón de login de cara al público: las cuentas se conectan desde el panel de Meta («Generar identificador»). En el video hay que mostrar ese flujo de concesión de permisos del panel y decirlo en un rótulo. Meta documenta que el botón de login debe verse, pero no dice qué hacer para una app que conecta solo cuentas propias. Es una duda abierta; se resuelve con lo que diga el revisor.
3. **¿Hace falta revisión?** La documentación dice que una app que sirve solo a un negocio propio con acceso estándar no la necesita. Aun así, según lo comprobado en el spec §2, los avisos del webhook solo llegan a apps publicadas, y publicar con datos reales exige la revisión. Por eso se envía.
4. **Instrucciones de prueba:** Meta no define un formato fijo más allá de «pasos de inicio de sesión y prueba»; lo escrito es la mejor interpretación.
5. **Botón «Ya te sigo» no verificado.** La documentación de Meta no dice que una respuesta privada (con `recipient.comment_id`) acepte botones de respuesta rápida. El código trata cualquier mensaje del usuario con una espera vigente de 24 h como confirmación, así que el flujo funciona aunque el botón no aparezca (el usuario responde con cualquier texto). Antes de grabar el video 3, comprobar en vivo si el botón se ve; si no, grabar con respuesta de texto y ajustar el rótulo.
