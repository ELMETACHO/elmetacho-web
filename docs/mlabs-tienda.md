# Tienda de MLABS con Bold (PR 2, 2026-11-16) · APAGADA hasta el OK de Oscar

**Flujo:**
1. Página del producto con precio fijo en COP y USD. La moneda sale del país (`x-vercel-ip-country`: Colombia ve COP y el resto USD) y se puede cambiar a mano (cookie `mlabs_moneda`).
2. «Comprar»: nombre, correo y aceptación de términos y datos.
3. `POST /api/tienda/checkout` crea el pedido en Redis con el **precio del servidor** y devuelve los datos firmados del botón de Bold.
4. Se abre el checkout de Bold (embebido).
5. Bold redirige a `/compra?pedido=…`, que confirma el pago con la API de Bold desde el servidor.
6. Bold también avisa a `POST /api/bold/webhook`, con la firma verificada y cada evento procesado una sola vez.
7. Con el pago aprobado, **el monto y la moneda tienen que coincidir con el pedido**: si no, queda en «revisar» y no se entrega.
8. Se registra el comprador (`mlabs:tienda:compradores`) y llega un aviso por Telegram.
9. Se muestra el link de descarga `/descargar/<token>`, firmado y válido 7 días. Lleva a un link de Vercel Blob privado de 15 minutos.

**Interruptor:** `MLABS_TIENDA`.
- Sin él (hoy, en producción) todo sigue en «Muy pronto · Apártalo» y el checkout responde 503.
- `pruebas`: se cobra con las llaves de prueba y aparece el «Producto de prueba» ($1.000 COP / US$1).
- `real`: se cobra de verdad. **Solo con el OK de Oscar.**

## Lo que pone Oscar en Vercel (solo los nombres; los valores nunca van por el chat)
| Variable | Preview | Production | Para qué |
|---|---|---|---|
| `BOLD_IDENTITY_KEY` | llave de identidad **de pruebas** | la de producción | Botón de Bold y consulta de pagos |
| `BOLD_SECRET_KEY` | llave secreta **de pruebas** | la de producción | Firma de integridad y del webhook |
| `MLABS_TIENDA` | `pruebas` | `real` (solo cuando dé el OK) | Interruptor de la tienda |
| `MLABS_ENTREGA_SECRETO` | un texto largo al azar | otro distinto | Firma de los links de descarga |
| `BLOB_READ_WRITE_TOKEN` | ya existe | ya existe | Links de descarga del Blob privado |

En el panel de Bold, en Integraciones › Webhooks, se agrega la URL `https://mlabs.elmetacho.com/api/bold/webhook`. En pruebas, Bold solo manda el webhook con el botón «Probar el webhook»; aun así, la página `/compra` confirma el pago consultando a Bold.

## Pasos de Oscar para probar (modo pruebas)
1. Poner las 4 variables de **Preview** de la tabla.
2. Subir al Blob privado el archivo de prueba, con pathname `mlabs/productos/prueba-tienda/prueba.txt`. Desde el PC lo puede subir Claude.
3. Abrir la vista previa de un PR, en `/mlabs/productos/prueba-tienda`, y comprar con la tarjeta de prueba de Bold `4111111111111111` (aprobada). La `4970110000000062` es la rechazada.
4. Se debe ver la página «¡Listo!» con el link de descarga, más el aviso «(PRUEBA)» en Telegram.

## Para vender de verdad
1. **Precios:** en `src/app/mlabs/contenido/productos.js` va `precios: { COP, USD }` (enteros), el `archivo` (pathname en el Blob privado) y `estado: "disponible"`. Las fichas proponen Kit COP 69.000 / US$19 y PC COP 45.000 / US$12, que Oscar **todavía no aprueba**.
2. **Archivo:** subir el ZIP de cada producto al Blob privado (`MLABS-PRODUCTOS/dist/*.zip`).
3. **Retracto:** revisar el texto de `/retracto` con la Ley 1480 de 2011 (arts. 47 y 51). No se pudo leer la fuente oficial al escribirlo.
4. **Factura electrónica:** sigue pendiente (DIAN); se hace por fuera.
5. **Encender:** `MLABS_TIENDA=real` en Production.

## Lo que no se hizo (a propósito)
- **Correo de entrega:** no hay proveedor (Resend) configurado. La entrega es en la página de resultado y por el aviso de Telegram a Oscar. Si se quiere correo, la variable sería `RESEND_API_KEY`.
- **Moneda del pago en la consulta a Bold:** si la API no la trae, se usa la del pedido. El monto se valida igual.
