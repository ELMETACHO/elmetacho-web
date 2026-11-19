# Ahorra · archivo → Markdown para Claude, ChatGPT, Gemini y más (mlabs.elmetacho.com/ahorra, 2026-11-18)

Es la versión «sin instalar nada» del reel L01 («Comenta AHORRA»). La persona sube un PDF, DOCX, XLSX, PPTX o HTML y recibe el Markdown limpio para copiar o descargar como .md, con un contador de tokens antes y después, marcado como estimado.

## Motor: librerías de Node
- `unpdf` (pdf.js), `mammoth` + `turndown` (DOCX), `exceljs` (XLSX), `jszip` (PPTX) y `turndown` (HTML). Ninguna exige aviso de licencia en la página, porque corren en el servidor y no se distribuyen.
- Se descartó una herramienta de conversión en Python porque pesaba 298 MB instalada, más que el límite de 250 MB de las funciones de Vercel.
- **Regla de Oscar (2026-11-18):** en la web no se nombra ninguna herramienta de terceros ni a su fabricante. Las IA van siempre en lista («Claude, ChatGPT, Gemini y más»), nunca «otras IA». Si algo legal obliga a mencionar algo, va solo dentro de un desplegable.
- Velocidad: 74 páginas en 0,3 s, con ≈125 MB de memoria.

## Contador de tokens (estimado)
- **Después:** caracteres del Markdown ÷ 3,5.
- **Antes, en PDF:** tokens del texto + **1.568 tokens por página** por su imagen. Fuente: Anthropic, «PDF support › Estimate your costs», leída el 2026-11-18. Ahí dice que la imagen de cada página usa como máximo 1.568 tokens visuales y que el texto suele ir de 1.500 a 3.000 por página.
- **Antes, en HTML:** el código completo ÷ 3,5.
- **Word, Excel y PowerPoint:** solo se muestra el «después», porque Claude no los recibe tal cual.

## Créditos y abuso
- 3 archivos gratis por correo (`mlabs:creditos:<correo>`, SET NX una sola vez). El lead queda en `mlabs:leads` con `origen: "ahorra"` y avisa por Telegram.
- **Sesión:** cookie `mlabs_ahorra` firmada con HMAC (`MLABS_AHORRA_SECRETO` o, si no existe, `MLABS_SESION_SECRETO`).
- **Límites por IP** (24 h): 3 correos nuevos y 12 conversiones.
- **Enlace mágico:** **no hay**, porque no hay proveedor de correo (Resend) configurado. Con los límites por IP, un abusador saca como mucho unas 9 conversiones gratis por IP al día. Si hace falta más, el siguiente paso es validar el correo con un link (requiere `RESEND_API_KEY`).
- Si la conversión falla, el crédito se devuelve.

## Privacidad
- La subida va directo del navegador a **Vercel Blob privado** (`ahorra/<hash del correo>/…`, hasta 20 MB y 300 páginas), sin pasar por el límite de 4,5 MB de las funciones.
- `/api/ahorra/convertir` baja el archivo, lo convierte y **lo borra siempre**, en el `finally`.
- Un cron diario (`/api/ahorra/limpiar`) borra lo que quedó subido hace más de 1 hora sin convertir.
- No se guarda el contenido.

## Paquete de pago único (precio aprobado el 2026-11-18; cobro APAGADO)
- **Nombre y frase:** «Ahorra» y «Convierte tus archivos para Claude y cualquier IA, y gasta menos», en `src/app/mlabs/contenido/ahorra.js`. Se cambian ahí, sin tocar el resto.
- **Paquete:** **50 archivos por COP 14.900 / US$4**, pago único y sin vencimiento (Oscar: «Sí. con 50 archivos por 14.900»).
- **Producto:** `ahorra-50` en `productos.js`, con `creditos: 50`, oculto del catálogo. Cada archivo cuenta 1; cada uno de hasta 20 MB y 300 páginas. Los escaneados no se cobran.
- **Mientras la tienda esté apagada:** al acabarse los gratis se ve «50 archivos por $14.900 COP (US$4)», con un lead `la herramienta del reel-paquete`.
- **Con la tienda encendida** (`MLABS_TIENDA` + llaves de Bold):
  - Aparece «Comprar» con el correo de la sesión.
  - Al confirmarse el pago, `confirmarPago` suma 50 archivos a ese correo. Si nunca usó los gratis, primero se le dan sus 3.
  - `/compra` muestra «Se sumaron 50 archivos» y, debajo, el **Kit Edita con Claude**.
- **Sin IA:** la conversión no usa ningún modelo de IA ni OCR.

## Costo real en Vercel (medido en producción el 2026-11-18, región iad1)
- **Cómo se midió:** con la cabecera `Server-Timing` de `/api/ahorra/convertir`, que da la CPU de la función, la memoria del proceso y los tiempos.
- **Precios Pro** (docs de Vercel, 2026-11-18):
  - Active CPU: $0,128 por hora.
  - Memoria aprovisionada: $0,0106 por GB-hora.
  - Invocaciones: $0,60 por millón.
  - Blob: subida (operación avanzada) ≈$4,50–5,00 por millón; lectura (simple) ≈$0,35–0,40 por millón; **borrar es gratis**.
  - El plan Pro trae $20 de crédito al mes.

| PDF | Función (bajar + convertir) | CPU activa | Memoria del proceso | Costo aprox. por archivo |
|---|---|---|---|---|
| 20 págs., 370 KB | 0,93 s | 0,97 s | 187 MB | ≈ US$0,000046 |
| 100 págs., 3,9 MB | 1,12 s | 1,19 s | 247 MB | ≈ US$0,000055 |

- **De dónde sale el costo por archivo:** CPU ≈$0,00004 + memoria ≈$0,000006, calculada con la memoria por defecto de 2 GB (no verificada: revisarla en Settings › Functions) + 2 invocaciones (token de subida y conversión) ≈$0,0000012 + 1 subida a Blob ≈$0,000005 + 1 lectura ≈$0,0000004.
- **A escala:** **≈US$0,05 por cada 1.000 archivos**. Un paquete de 50 cuesta ≈US$0,003 (unos COP 11), contra COP 14.900 de precio, sin contar la comisión de Bold.
- **Sin IA:** la conversión no usa ningún modelo de IA ni OCR. Es lo que la mantiene así de barata.
- **Fuera de la cuenta:** el Redis (llamadas mínimas por archivo) y la página `/ahorra` misma (una invocación por visita).

