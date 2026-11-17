# Recursos de MLABS como datos (desde el 2026-11-16)

Las guías de mlabs.elmetacho.com viven en Redis (hash `mlabs:recursos`, slug → JSON), no en el código. Publicar una guía **no requiere deploy**. La página aparece en `/recursos/<slug>` en segundos: la API revalida MLABS al guardar, y el resto lo hace el ISR de 5 minutos.

## Crear un recurso y su palabra en un solo paso
```bash
ADMIN_PC_TOKEN=… node scripts/mlabs-recurso.mjs recurso.json
```
- Ese comando guarda la guía y crea o actualiza la regla de @metacholabs: quien comente **PALABRA** recibe por DM `https://mlabs.elmetacho.com/recursos/<slug>`.
- `--sin-regla` guarda solo la guía.
- `--lista` muestra qué hay y de dónde sale cada recurso (`redis` o `codigo`).
- El token es el mismo `ADMIN_PC_TOKEN` del PC (vive en el `.env` de PREMIERE-CLAUDE; lo lee `telegram_envio`). No se imprime ni se pega en el chat.

### Formato de `recurso.json`
```json
{
  "recurso": {
    "slug": "skills", "palabra": "SKILLS", "titulo": "…", "resumen": "…",
    "tipo": "guia", "publicos": ["creadores"], "tiempo": 4, "actualizado": "2026-11-16",
    "seccionesLibres": 1, "portada": "rojo",
    "productoRelacionado": "edita-con-claude",
    "secciones": [ { "titulo": "…", "bloques": [ { "p": "…" }, { "lista": ["…"] }, { "prompt": "…" }, { "ojo": "…" }, { "tabla": [["mal", "bien"]] } ] } ]
  },
  "regla": { "mensaje_dm": "Aquí tienes la guía. Ábrela aquí:", "respuesta_publica": "¡Te la mandé por DM! 📩", "pedir_seguir": true }
}
```
- **`tipo`:** `guia`, `prompt` o `mini-curso`.
- **`portada`** (opcional): `rojo`, `tinta`, `amarillo`, `azul` o `claro`.
- **`publicos`:** usa los slugs de `contenido/publicos.js`.
- **`productoRelacionado`** (opcional): el slug de `contenido/productos.js`.
- **`regla`** (opcional): si no viene, se usan textos por defecto. Si la palabra ya tenía una regla, se conservan su id, sus textos y su estado, y solo cambia el link.

## Qué valida la API (`PUT /admin/api/pc/recursos`)
- Usa la misma forma que el build: slug, tipo, públicos, fecha y secciones con bloques no vacíos.
- La palabra no puede ser de otro recurso ni ser `NOVEDADES`.
- Aplica **lo gratis no revela el método**: rechaza ffmpeg, whisper, python, node.js, hyperframes, nvidia, «claude code», «tarjeta de video» y las marcas del guion. Es la misma regla que la prueba del build. Si esa regla se debe relajar para las guías nuevas de LABS, lo decide Oscar.
- **Candado:** solo crea reglas para @metacholabs (`17841480070378472`).
- Revisa el límite de 50 reglas y de 1000 bytes por DM (validación de `palabras.js`).

## Transición
- `contenido/guias.js` sigue en el repo como **respaldo**: si Redis no responde, se muestran esas guías. Cuando un slug existe en Redis, gana la versión de Redis.
- Las 11 guías heredadas se subieron a Redis con `--sin-regla`, porque sus reglas ya existen.
- En el PR siguiente se borra `guias.js` (las ediciones de novedades se validan contra Redis) y así el texto bloqueado deja de estar en el repo. El historial de git conserva las versiones viejas, que ya eran públicas.
