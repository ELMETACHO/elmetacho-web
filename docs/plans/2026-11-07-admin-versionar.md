# Plan: Versionar un cantado (2026-11-07)

Spec: `docs/superpowers/specs/2026-11-07-admin-versionar-design.md`. Cada tarea va con TDD: primero la prueba que falla, luego el código y por último la prueba en verde.

## PC (D:/METACHO CLAUDE/PREMIERE-CLAUDE/cantados)

1. **`herramientas/biblioteca.py` o un módulo nuevo `catalogo.py`:** `catalogo(raiz) -> [{clave, titulo, fecha, n}]`. Prueba en `tests/test_catalogo.py`.
2. **`herramientas/web.py`:** `publicar_catalogo(lista)` → `PUT /admin/api/pc/catalogo`. En `pasada.leer()`, después de `leer_web`, va en su propio try.
3. **`pasada.leer_web`:** `tipo == "version"` → `datos.update(modo="version", base=ped["base"]["clave"])`. Prueba en `tests/test_web.py`.
4. **`remix.py`:**
   - `anonimizar(comentarios, semilla)`: usuario inventado, `avatar=None`, `fecha=""` y `anonimo=True`.
   - `poner_avatares` también cubre `anonimo`.
   - Prueba en `tests/test_remix.py`.
5. **`pasada._nuevo_version`** y despacho en la línea ~859 (`modo == "version"`):
   - Si falta la base: fallido, `web.fallido` y aviso por Telegram.
   - Si la base existe: aprobado con `version_de`.
   - Prueba en `tests/test_web_version.py`.
6. **Pruebas:** la suite completa con `pytest -q`.

## Web (C:/Users/delga/Documents/elmetacho-web)

7. **`lib/pedido.js`:**
   - `TIPOS` y `TIPOS_DISPONIBLES` incluyen `version`.
   - `base` válida.
   - `propios` en `pantallazos` y en `version`.
   - `erroresParaEnviar` y `nombreTipo` / `nombreVisible` cubren `version`.
   - Pruebas en `pedido.test.js`.
8. **`lib/catalogo.js`:** `validarCatalogo(lista)` y `filtrar(lista, texto, max = 8)`. Pruebas.
9. **Almacén:** `leerValor` / `guardarValor` en Redis y en memoria.
   - API: `pcCatalogo` (PUT, con token) y `catalogo` (GET, con sesión).
   - Rutas `api/pc/catalogo/route.js` y `api/catalogo/route.js`.
   - `pcPedidos` entrega `base`.
   - Pruebas en `api.test.js`.
10. **`NuevoPedido.jsx`:**
    - opción «Versionar», con la sección «Cantado a versionar» (buscador con sugerencias);
    - la sección «Tus comentarios» se vuelve un componente reutilizado;
    - el texto de LISTO y la nota del estilo.
11. **Pruebas y compilación:** `npm test` y `next build`. Después PR, checks de Vercel y fusión a main.

## Verificación

12. Correr una pasada `leer` con el catálogo y ver en la web que aparece la moto. Eso lo comprueba Oscar en /admin, porque yo no entro con su clave.
13. Primer pedido real: la moto con el video nuevo. Se revisa la hoja de contacto antes de entregar.
