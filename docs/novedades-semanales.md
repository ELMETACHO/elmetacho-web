# Novedades de IA de la semana (mlabs.elmetacho.com/novedades)

## Cómo funciona
- `/novedades` muestra **siempre la edición más reciente**. La URL no cambia nunca, así que el DM de NOVEDADES sirve todas las semanas.
- El **destacado** se ve libre. El resto de la edición se abre con el mismo formulario de correo de las guías (lead con origen `novedades-AAAA-MM-DD` → Redis `mlabs:leads` + aviso al bot de Telegram). Si la persona ya desbloqueó una guía, no se le vuelve a pedir el correo.
- Las ediciones anteriores quedan como archivo en `/novedades/AAAA-MM-DD` y se listan al final de la página.
- Todo el contenido está en `src/app/mlabs/contenido/novedades.js`. El validador (`contenido/validar.js`) detiene el build si una novedad no tiene fuente con enlace https, si una aclaración no tiene su fuente, si un curso no dice para quién es o si una guía relacionada no existe.

## Agregar la edición de la semana (cada semana)
1. Abre `src/app/mlabs/contenido/novedades.js`.
2. Copia el bloque completo de la edición más reciente y pégalo **de primero** dentro de `ediciones`.
3. Cambia `slug` y `fecha` (la misma fecha, `AAAA-MM-DD`), `titulo` («Semana del … »), `intro`, el `destacado`, las `novedades` y las `guiasRelacionadas`. Los `slug` de las novedades no se pueden repetir con los de semanas anteriores.
4. Cada novedad lleva `fuente` oficial. Si algo solo lo confirma la prensa (no la fuente oficial), va en `aclaracion` con su propio enlace, y el texto lo dice.
5. `npm test`, `npx eslint src`, `npm run build`. Luego rama, commit, push y PR, como siempre.
6. Actualiza el mensaje del DM si cambias el resumen de la semana (ver abajo). El enlace no cambia.

## Palabra clave NOVEDADES en ManyChat (esto lo haces tú en ManyChat)
Mientras Meta aprueba la app, los DMs salen por **ManyChat**. La regla no se puede crear desde el código:
1. ManyChat → **Automation** → **New Automation** → disparador **Instagram → Post or Reel Comments**.
2. Publicaciones: el reel de Labs #35 («Anthropic tiene cursos gratis para aprender Claude»), o «cualquier publicación» si quieres que funcione en todos los videos que digan «Comenta NOVEDADES».
3. Palabra clave: `NOVEDADES` (agrega también `novedad`). Respuesta pública al comentario: activada.
4. Mensaje del DM:

```
¡Hola! 👋 Aquí tienes las novedades de IA de esta semana: https://mlabs.elmetacho.com/novedades

Esta semana: los cursos gratis de Anthropic para aprender Claude (con certificado) y el agente de Gemini para Gmail y Drive.

Cada semana hay edición nueva en ese mismo enlace 📬
```

5. Actívala y pruébala comentando NOVEDADES desde otra cuenta.

La misma regla quedó agregada en `D:\METACHO CLAUDE\metacho-dm\palabras.json` para cuando se despliegue ese worker. **No uses los dos a la vez** con la misma palabra: llegarían dos DMs.
