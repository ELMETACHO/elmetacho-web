# MLABS · rediseño C + recursos como datos (PR 1 de LABS)

Fecha: 2026-11-16. Oscar eligió la maqueta C («Me quedo con la C. Despliega y publica»).

## Objetivo
1. Que mlabs.elmetacho.com se lea como la maqueta C: portada oscura con promesa y cifras verificadas, franja de confianza, catálogo con buscador y filtros, tarjetas con la palabra gigante y página de producto con recuadro de compra. Es para el celular primero, con letra del sistema y alto contraste.
2. Que publicar una guía no exija deploy y que el texto bloqueado deje de vivir en el repo público.

## Recursos como datos
- **Redis:** hash `mlabs:recursos` (slug → JSON de la guía). La forma es la misma de `contenido/guias.js` y la valida `lib/recursos/esquema.js`, la misma regla que usa el build.
- **Lectura** (`contenido/recursos.js`, solo en el servidor):
  - La lectura une Redis con las guías heredadas de `guias.js`; si un slug está en los dos, gana Redis. Si Redis falla, se usan las heredadas y no se rompe nada.
  - Las páginas usan ISR (`revalidate = 300`) y la API de guardado llama `revalidatePath("/mlabs", "layout")`.
- **API protegida:** `PUT /admin/api/pc/recursos`, con `Authorization: Bearer ADMIN_PC_TOKEN`, el mismo token del PC.
  - **Entrada:** `{ recurso, regla? }`.
  - **Validación:** revisa el esquema, que el público exista, que el producto relacionado exista y que la palabra no la use otro recurso.
  - **Guardado:** guarda el recurso y, si viene `regla`, hace el upsert del disparador `palabra → https://mlabs.elmetacho.com/recursos/<slug>` en `ig:<cuenta>:disparadores`. Con la regla en `false`, solo guarda el recurso.
  - **Candado:** la cuenta es siempre la de @metacholabs (`17841480070378472`). Cualquier otra se rechaza.
  - `GET` devuelve la lista de slugs y palabras.
- **Herramienta:** `scripts/mlabs-recurso.mjs <archivo.json>` crea el recurso y su regla en un solo paso.
- **Migración:** las 10 guías se suben con la herramienta, sin regla. Una vez verificado en vivo que salen de Redis, un PR siguiente borra `guias.js`. El historial de git conserva las 10 viejas, que ya eran públicas; las guías nuevas no entran nunca al repo.

## Productos (sin precios todavía)
- Los productos reales son: Kit Edita con Claude (`edita-con-claude`), que reemplaza a `editor-automatico` y lleva una redirección 301; PC en piloto automático (`pc-piloto-automatico`); y Creador de carruseles.
- Todos van en estado `preventa` sin precio: «Muy pronto · Apártalo» deja un lead con `origen` `preventa-<slug>`. No hay botón de pago.

## Cifras
- Se escribe «+4 M seguidores entre Facebook e Instagram», que salen de FB 2.436.835 + IG 2.054.638 (sonda del 4-nov).
- También «10 años creando contenido» y el número de guías, que es dinámico.

## Tokens
- `src/app/mlabs/mlabs.css` define los colores y las fuentes como variables en `.mlabs`. Pasar al ESTILO-LABS-v2 será cambiar solo esas variables.

## Lo que no cambia
- El webhook de Instagram, `/api/lead`, el desbloqueo por correo (script en el `<head>` y `.contenido-bloqueado`), el panel, `/automatizar` (App Review), `/pagar`, la privacidad, los términos y la eliminación de datos.
