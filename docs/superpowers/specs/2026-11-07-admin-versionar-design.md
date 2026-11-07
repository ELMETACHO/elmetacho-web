# Versionar un cantado (spec, 2026-11-07)

## 1. Para qué

Una tendencia se vuelve viral y otros la replican. Sus videos son buenos, pero los comentarios no. Oscar quiere rehacer un cantado que ya existe (p. ej. «su novia cuida la moto», `2026-10-22-v-wc_20261022_ac94`) con:

- otro video de la tendencia,
- otra canción,
- los mismos comentarios del cantado anterior,
- y, si quiere, comentarios escritos por él.

Como esa gente no comentó en el video nuevo, **todos** los comentarios salen con nombres y fotos inventados, para no suplantar a nadie.

**Éxito:** Oscar escoge «Versionar» en /admin y escribe unas letras del título. Del buscador escoge el cantado. Sube el video y marca el bucle. Sube un gancho nuevo y, si quiere, agrega comentarios. En la franja de las 5 p. m. le llega por Telegram el video nuevo, sin pasar por revisión.

## 2. Lo que dijo Oscar (7 nov)

- Sube el video descargado y define él el bucle. No se usa link.
- Graba un gancho nuevo cada vez.
- Las imágenes y memes de los comentarios se reutilizan: son de dominio público.
- Quiere una lista con buscador que vaya sugiriendo a medida que escribe, a partir de los cantados guardados.
- Quiere la sección de comentarios propios, la misma que ya existe en «con pantallazos».

## 3. Web (elmetacho-web, /admin)

- **Opción nueva** en «Nuevo video»: **Versionar** (`tipo: "version"`, siempre reel).
- **Secciones del formulario:**
  1. **Cantado a versionar:** campo de texto. Mientras Oscar escribe, aparecen hasta 8 sugerencias del catálogo. La búsqueda no distingue tildes ni mayúsculas y toda palabra escrita debe aparecer en el título. Al tocar una sugerencia, queda elegida y se muestra con su fecha y su número de comentarios.
  2. Video original con bucle (el mismo editor de hoy).
  3. Gancho.
  4. Tus comentarios (opcional, el mismo bloque de «con pantallazos»).
  5. Título.

  Sobre el estilo no se escoge nada: sale al contrario del cantado anterior, como en el remix, y lo dice el formulario.
- **Pedido:** guarda `base: { clave, titulo }`.
  - `clave` es el nombre de la carpeta del proyecto, validado con `^[A-Za-z0-9._-]{1,120}$`.
  - Que la carpeta exista lo comprueba el PC.
  - `propios` se permite en `pantallazos` y en `version`.
  - Un pedido `version` no lleva link, ni pantallazos, ni video publicado.
- **Para enviar** hacen falta original, bucle, gancho y `base`.
- **Catálogo:**
  - `PUT /admin/api/pc/catalogo` (token del PC): recibe `{ lista: [{ clave, titulo, fecha, n }] }`, con máximo 3000 entradas validadas, y lo guarda en Redis (clave `cantados:catalogo`).
  - `GET /admin/api/catalogo` (sesión de Oscar): devuelve la lista. El filtrado se hace en el navegador porque la lista es pequeña (unos 330 proyectos).
- **API del PC:** `/admin/api/pc/pedidos` entrega también `base`.
- **Nombres en la lista de pedidos:** «Versionar». Si el pedido no tiene título, se usa el título del cantado base.

## 4. PC (cantados)

- **Catálogo:**
  - Se arma desde `PROYECTOS/*/proyecto.json` con los proyectos que tienen `salida.mp4`, título y al menos un comentario cantado.
  - `clave` es la carpeta; `fecha` sale de los primeros 10 caracteres de la carpeta; `n` es el número de comentarios cantados.
  - Va ordenado del más nuevo al más viejo.
  - La fase `leer` lo publica en cada pasada. Si falla, solo queda en el informe y no frena la pasada.
- **leer_web:** `tipo == "version"` → `modo="version"`, `base=<clave>`.
- **`_nuevo_version`:**
  1. Si la carpeta base no existe, el pedido queda fallido: se avisa a la web con `fallido` y a Oscar por Telegram.
  2. Crea la carpeta `…-version-…` con el original.
  3. Toma todos los comentarios cantados de la base con `remix.comentarios_de_previo` (copia los GIF y las imágenes).
  4. Los vuelve anónimos:
     - usuario inventado al azar (semilla: la carpeta nueva), nunca uno de los reales de la base;
     - el avatar se quita y luego `poner_avatares` pone uno de la galería (se marca `anonimo: true`);
     - la fecha se vacía y los likes se conservan.
  5. Añade los propios con `pantallazos.propios`.
  6. Arma con `remix.armar_proyecto(previo=base)`: otro orden, y estilo y color contrarios.
  7. Agrega `version_de=<clave>`, deja el proyecto en `estado="listo_suno"` y el pedido en `aprobado`, sin revisión, igual que el remix con proyecto previo.
- **Lo demás no cambia:** Suno, alineación, render y entrega por Telegram siguen el mismo camino del remix.

## 5. Errores

- **Base inexistente** (la borraron o la escribieron a mano): el pedido queda fallido con el motivo «no encontré el cantado X».
- **Catálogo vacío o caído:** el buscador dice «No hay cantados para versionar todavía» y no se puede enviar.
- **Bucle que no cabe:** se usa la misma regla de hoy (`_bucle_cabe`).

## 6. Pruebas

- **Web (node --test):**
  - validación de `base` y de `propios` por tipo;
  - `erroresParaEnviar` del tipo `version`;
  - catálogo: PUT con token y validación; GET solo con sesión;
  - filtro del buscador como función pura (tildes, varias palabras, máximo 8).
- **PC (pytest):**
  - catálogo desde carpetas falsas;
  - `leer_web` con `version`;
  - `_nuevo_version`: todos los usuarios inventados y distintos de los reales, imágenes copiadas, propios al final, estilo contrario, pedido aprobado; y fallido cuando la base no existe.
- **De punta a punta:** un pedido real de Oscar (la moto con el video nuevo) en la siguiente pasada. Se revisa la hoja de contacto antes de entregar.

## 7. Fuera de alcance

- Versionar desde el link (sin subir video).
- Reutilizar el gancho anterior.
- Escoger qué comentarios de la base entran: van todos los cantados de la base (sale sin revisión, como el remix).
