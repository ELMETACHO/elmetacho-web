// Guías gratis de MLABS (material de los videos de Metacho Labs). Forma y reglas: contenido/validar.js.
// Bloques: { p }, { lista: [] }, { prompt }, { tabla: [[mal, bien], …] }, { ojo }.
export const guias = [
  {
    slug: "editor",
    palabra: "EDITOR",
    titulo: "Cómo Claude edita mis videos",
    resumen: "Grabo a cámara, con errores y silencios, y en minutos tengo el video listo para publicar: limpio, con subtítulos, música y animaciones. Aquí te cuento qué hace y qué cambió en mi forma de trabajar.",
    tipo: "guia",
    publicos: ["creadores", "ia-y-developers"],
    tiempo: 3,
    actualizado: "2026-10-15",
    productoRelacionado: "editor-automatico",
    secciones: [
      { titulo: "Qué hace", bloques: [
        { p: "Antes me demoraba unas dos horas editando un video de un minuto. Ahora grabo y el video sale listo para publicar:" },
        { lista: [
          "Quita los errores, las repeticiones y los silencios.",
          "Pone subtítulos y música.",
          "Agrega textos en pantalla y animaciones.",
          "Lo entrega en vertical, listo para Reels, TikTok y Shorts.",
        ] },
        { ojo: "No reemplaza tu criterio: reviso cada video antes de publicarlo." },
      ] },
      { titulo: "Lo que más me cambió", bloques: [
        { p: "No fue solo ahorrar tiempo. Cada video sale igual de cuidado, aunque yo esté cansado, y el tiempo que antes se me iba editando ahora lo uso en grabar más." },
        { p: "También grabo más tranquilo: si me equivoco, no tengo que empezar de cero." },
      ] },
      { titulo: "Cómo grabar para que salga mejor", bloques: [
        { lista: [
          "Graba en un lugar sin eco ni ruido de fondo: el audio limpio es lo que más ayuda.",
          "Si te equivocas, no pares: haz una pausa y repite la frase completa.",
          "Una idea por frase. Las frases cortas se entienden y se subtitulan mejor.",
          "Busca luz de frente, por ejemplo mirando hacia una ventana.",
        ] },
      ] },
      { titulo: "¿Lo quieres en tu computador?", bloques: [
        { p: "Estamos preparando el editor para que lo instales en tu computador. La configuración y la instalación son parte del producto, y te acompañamos paso a paso." },
        { p: "Aparta tu cupo abajo y te avisamos primero cuando abra, con el precio de lanzamiento." },
      ] },
    ],
  },
  {
    slug: "claude",
    palabra: "CLAUDE",
    titulo: "Guía rápida: Claude Dashboards",
    resumen: "Le haces una pregunta a Claude sobre tu negocio y te arma un tablero con gráficas que se conecta a tus datos y se actualiza solo.",
    tipo: "guia",
    publicos: ["emprendedores", "marcas", "ia-y-developers"],
    tiempo: 4,
    actualizado: "2026-10-14",
    secciones: [
      { titulo: "Antes de empezar", bloques: [
        { lista: [
          "Necesitas un plan pago de Claude (Pro, Max, Team o Enterprise).",
          "Tus datos deben estar en una base de datos en la nube o en una app conectada a Claude (por ejemplo, tu CRM).",
          "En planes de empresa, el administrador debe activar «Ejecución de código y creación de archivos» y la plantilla Dashboards.",
          "Conecta tu fuente de datos en la sección de conectores de Claude.",
        ] },
        { ojo: "Está en beta. Si todo lo tienes en una hoja de cálculo suelta, súbela al chat y pide un análisis con gráficas: funciona, pero no se actualiza solo." },
      ] },
      { titulo: "El truco que más cambia el resultado", bloques: [
        { p: "No le pidas una gráfica. Pídele la pregunta que quieres responder." },
        { tabla: [
          ["Hazme una gráfica de ventas", "¿Cómo van las ventas de esta semana comparadas con el mes pasado?"],
          ["Un gráfico de clientes", "¿Qué clientes compraron el mes pasado y este mes no han vuelto?"],
          ["Gráfica de inscripciones", "¿De qué canal vienen las inscripciones de este mes y cómo se comparan con el anterior?"],
        ] },
      ] },
      { titulo: "Preguntas listas para copiar", bloques: [
        { lista: [
          "¿Cuáles son mis 10 productos más vendidos este mes y cuánto dejó cada uno?",
          "¿Qué día de la semana y a qué hora vendo más?",
          "¿Qué productos se están quedando sin inventario al ritmo de venta actual?",
          "¿Cuántas oportunidades abiertas tengo, en qué etapa están y cuánto valen?",
          "¿Qué clientes no han vuelto a comprar en los últimos 90 días?",
          "¿Qué canal me trae más clientes y cuál me trae los que más compran?",
        ] },
      ] },
      { titulo: "Plantilla de pregunta", bloques: [
        { prompt: "Arma un tablero para responder esta pregunta: [tu pregunta].\nUsa los datos de [fuente].\nPeriodo: [este mes / últimas 8 semanas / este año].\nCompara contra: [mes pasado / mismo periodo del año pasado].\nDefine [métrica] como: [tu definición].\nArriba pon un número grande con [el total más importante].\nAgrega filtros por [ciudad / producto / canal]." },
        { ojo: "Revisa la consulta de cada gráfica: ahí ves qué está contando. Si un número se ve raro, haz clic y pídele a Claude que te lo explique." },
      ] },
    ],
  },

  {
    slug: "resena",
    palabra: "RESEÑA",
    titulo: "Cómo responder reseñas sin sonar a robot",
    resumen: "Usa la IA para el primer borrador de cada respuesta, con tres reglas que la hacen sonar humana. La respuesta final la decides tú.",
    tipo: "prompt",
    publicos: ["emprendedores", "marcas"],
    tiempo: 3,
    actualizado: "2026-10-14",
    secciones: [
      { titulo: "Las tres reglas", bloques: [
        { lista: [
          "Nombra lo que pasó con las palabras del cliente.",
          "Nada de «lamentamos los inconvenientes»: una disculpa concreta.",
          "Ofrece un siguiente paso con nombre y canal, no «escríbenos al interno».",
        ] },
      ] },
      { titulo: "Prompt para reseñas negativas", bloques: [
        { prompt: "Eres quien atiende a los clientes de [nombre del negocio], un [tipo de negocio] en [ciudad]. Escribe una respuesta pública a esta reseña.\n\nReglas:\n1. Menciona lo que pasó usando las mismas palabras del cliente.\n2. Pide disculpas por algo concreto. Prohibido: «lamentamos los inconvenientes», «tu opinión es muy importante».\n3. Ofrece un siguiente paso con nombre y canal: «escríbele a [nombre] al [WhatsApp]».\n4. Máximo 4 frases. Tono: [cercano / formal]. Habla de tú.\n5. No prometas reembolsos ni descuentos.\n\nReseña:\n«[pega aquí la reseña]»" },
      ] },
      { titulo: "Prompt para reseñas de cinco estrellas", bloques: [
        { prompt: "Escribe una respuesta corta (2 frases) a esta reseña de 5 estrellas de [nombre del negocio]. Menciona lo que el cliente elogió con sus palabras e invítalo a volver con algo concreto. Nada de «gracias por tu comentario».\n\nReseña:\n«[pega aquí la reseña]»" },
      ] },
      { titulo: "Ojo con esto", bloques: [
        { ojo: "Si la reseña trae datos personales, un problema legal o una acusación grave, esa la respondes tú, sin IA. Y lee siempre el borrador antes de publicarlo." },
      ] },
    ],
  },

  {
    slug: "recicla",
    palabra: "RECICLA",
    titulo: "Un video, siete piezas de contenido",
    resumen: "Grabas una vez y de ese video salen siete publicaciones distintas. La clave: una sola idea por pieza.",
    tipo: "prompt",
    publicos: ["creadores", "marcas"],
    tiempo: 5,
    actualizado: "2026-10-14",
    productoRelacionado: "creador-de-carruseles",
    howto: true,
    secciones: [
      { titulo: "Las siete piezas", bloques: [
        { lista: [
          "1 · El reel original.",
          "2 · Un carrusel de cinco láminas con la idea principal.",
          "3 · Un hilo para X o Threads.",
          "4 · Un correo para tu lista.",
          "5, 6 y 7 · Tres frases cortas para historias, cada una con una idea distinta.",
          "Bonus: la descripción del reel con palabras clave para que lo encuentren.",
        ] },
      ] },
      { titulo: "Paso 1 · Transcribe", bloques: [
        { p: "Pasa el video a texto. Puedes usar la transcripción automática de tu editor, o subir el audio a Claude o ChatGPT y pedirle «transcribe esto tal cual»." },
      ] },
      { titulo: "Paso 2 · El prompt", bloques: [
        { prompt: "Te paso la transcripción de un video mío. Con ella crea:\n\n1. Un carrusel de 5 láminas (máximo 15 palabras por lámina, la primera es un gancho).\n2. Un hilo de 5 publicaciones para X.\n3. Un correo corto para mi lista (asunto + 120 palabras + llamado a la acción).\n4. Tres frases para historias.\n5. La descripción del reel: primera línea con la palabra clave, 3 a 5 hashtags.\n\nReglas:\n- No resumas el video: toma UNA idea distinta para cada pieza.\n- Conserva mis frases y mis ejemplos. Habla como yo: [tú / usted], tono [cercano / experto].\n- Nada de emojis en exceso ni frases de vendedor.\n\nTranscripción:\n«[pega aquí]»" },
      ] },
      { titulo: "Ojo con esto", bloques: [
        { ojo: "Cada red tiene su tono. Lee el correo en voz alta: si suena a reel, pídele que lo reescriba como si le escribieras a una sola persona." },
      ] },
    ],
  },

  {
    slug: "competencia",
    palabra: "COMPETENCIA",
    titulo: "Analiza a tu competencia por sus comentarios",
    resumen: "Los comentarios de las publicaciones de tu competencia son investigación de mercado gratis. La IA los agrupa y te dice qué hacer con ellos.",
    tipo: "prompt",
    publicos: ["emprendedores", "marcas", "creadores"],
    tiempo: 5,
    actualizado: "2026-10-14",
    howto: true,
    secciones: [
      { titulo: "Paso 1 · Junta los comentarios", bloques: [
        { p: "Entra a las 3 a 5 publicaciones más vistas de tu competencia y copia los comentarios (con 100 a 300 basta). Pégalos en un documento, uno por línea." },
      ] },
      { titulo: "Paso 2 · El prompt", bloques: [
        { prompt: "Te paso comentarios públicos de publicaciones de una marca de [tu sector]. Agrúpalos en tres listas:\n\n1. QUEJAS: qué no les está resolviendo esa marca.\n2. PREGUNTAS: lo que la gente pregunta una y otra vez.\n3. ELOGIOS: lo que más valoran.\n\nPara cada grupo dame los 5 temas más repetidos, cuántas veces aparece cada uno y un ejemplo textual.\nAl final, propón:\n- 5 ideas de video que respondan las preguntas más repetidas.\n- 3 cosas que yo debería ofrecer para resolver las quejas.\n- 2 cosas que no puedo dejar de ofrecer (por los elogios).\n\nComentarios:\n«[pega aquí]»" },
      ] },
      { titulo: "Qué hacer con el resultado", bloques: [
        { lista: [
          "Las quejas te dicen qué no están resolviendo: ahí está tu diferencia.",
          "Las preguntas repetidas son tus próximos videos.",
          "Los elogios te dicen qué no puedes dejar de ofrecer.",
        ] },
        { ojo: "Son comentarios públicos, pero no copies su contenido ni uses nombres de usuarios. Usa lo que aprendes para crear lo tuyo." },
      ] },
    ],
  },

  {
    slug: "ficha",
    palabra: "FICHA",
    titulo: "Descripciones de producto que venden, en un minuto",
    resumen: "Le pasas a la IA la foto del producto y tres datos, y te devuelve un título con lo que la gente busca, un beneficio en una línea y la lista de detalles. Todo con el mismo tono de tu marca.",
    tipo: "prompt",
    publicos: ["emprendedores", "marcas"],
    tiempo: 3,
    actualizado: "2026-10-15",
    secciones: [
      { titulo: "La frase que lo cambia todo", bloques: [
        { p: "Pídele a la IA que escriba «para alguien que no puede tocar el producto». Con eso deja de decir «excelente calidad» y empieza a decir cosas que se pueden comprobar." },
        { tabla: [
          ["Excelente calidad", "Tela gruesa que no transparenta"],
          ["Diseño moderno", "Cierre metálico y bolsillo interno para el celular"],
          ["Cómodo", "Elástico en la cintura: no aprieta al sentarte"],
        ] },
      ] },
      { titulo: "El prompt para una ficha", bloques: [
        { prompt: "Te paso la foto de un producto de mi tienda [nombre de la tienda], que vende [qué vendes] a [a quién].\nDatos reales: material [material], medida [medida], precio [precio].\n\nEscribe para alguien que no puede tocar el producto:\n1. Un título de máximo 60 caracteres con las palabras que la gente buscaría.\n2. Un beneficio en una sola línea.\n3. Una lista de 4 a 6 detalles concretos que se puedan comprobar.\n\nReglas:\n- Usa solo los datos que te di y lo que se ve en la foto. Si te falta un dato, pregúntamelo en vez de inventarlo.\n- Nada de «excelente calidad», «el mejor» ni frases de vendedor.\n- Tono: [cercano / elegante / divertido]. Habla de tú." },
      ] },
      { titulo: "Para cincuenta productos de una vez", bloques: [
        { p: "Arma una tabla con una fila por producto (nombre, material, medida, precio) y pídele que te la devuelva con tres columnas nuevas: título, beneficio y detalles. Así todas las fichas quedan con el mismo tono." },
        { prompt: "Te paso una tabla con los productos de mi tienda. Devuélveme la misma tabla con tres columnas nuevas: «título» (máximo 60 caracteres), «beneficio» (una línea) y «detalles» (4 a 6, separados por punto y coma).\nEscribe para alguien que no puede tocar el producto. Usa solo los datos de la tabla: si falta algo, deja la celda con «FALTA DATO».\n\nTabla:\n[pega aquí]" },
        { ojo: "Revisa medidas y precios antes de publicar: la IA a veces inventa un dato que suena bien." },
      ] },
    ],
  },

  {
    slug: "calendario",
    palabra: "CALENDARIO",
    titulo: "Un mes de contenido en diez minutos",
    resumen: "Le das a la IA qué vendes, a quién y las preguntas que más te hacen, y te devuelve un mes de ideas en una tabla con fecha, tema, gancho y formato.",
    tipo: "prompt",
    publicos: ["creadores", "marcas"],
    tiempo: 4,
    actualizado: "2026-10-15",
    secciones: [
      { titulo: "Los cuatro tipos de publicación", bloques: [
        { lista: [
          "Enseñar: algo útil que la gente pueda aplicar hoy.",
          "Detrás de cámaras: cómo haces lo que vendes.",
          "Resolver una objeción: la duda que frena la compra.",
          "Vender: el producto, el precio y cómo comprarlo.",
        ] },
        { p: "La regla: nunca dos del mismo tipo seguidas. Así no cansas a nadie con ventas ni te quedas solo enseñando." },
      ] },
      { titulo: "El prompt del calendario", bloques: [
        { prompt: "Vendo [qué vendes] a [a quién]. Las cinco preguntas que más me hacen son:\n1. [pregunta]\n2. [pregunta]\n3. [pregunta]\n4. [pregunta]\n5. [pregunta]\n\nArma un calendario de contenido para [mes], con [número] publicaciones por semana.\nUsa cuatro tipos: enseñar, detrás de cámaras, resolver una objeción y vender. Nunca pongas dos del mismo tipo seguidas.\nDeja libres dos días por semana para tendencias del momento.\n\nDevuélvelo en una tabla con: fecha, tipo, tema, gancho (la primera frase del video) y formato (reel, carrusel o historia)." },
      ] },
      { titulo: "Cómo dejarlo a tu medida", bloques: [
        { lista: [
          "Tacha las ideas que no te suenan y pídele: «cambia la fila 3 y la 7 por otras del mismo tipo».",
          "Pídele que convierta cada pregunta de tus clientes en al menos un video.",
          "El lunes ya sabes qué grabas toda la semana.",
        ] },
        { ojo: "Un calendario no reemplaza las tendencias del día. Por eso deja los dos espacios libres por semana." },
      ] },
    ],
  },

  {
    slug: "cliente",
    palabra: "CLIENTE",
    titulo: "Descubre de qué se quejan tus clientes",
    resumen: "Tus chats de WhatsApp y tus DMs ya te dicen qué mejorar. La IA encuentra las dudas que más se repiten y en qué momento de la compra aparecen.",
    tipo: "prompt",
    publicos: ["emprendedores", "marcas"],
    tiempo: 4,
    actualizado: "2026-10-15",
    secciones: [
      { titulo: "Paso 1 · Junta los mensajes, sin datos personales", bloques: [
        { p: "Exporta los chats de WhatsApp (en las opciones del chat busca «Exportar chat» y elige sin archivos) o copia los DMs de un mes. Antes de pasárselos a la IA, borra nombres, teléfonos, direcciones y correos." },
        { ojo: "Nunca subas datos personales de tus clientes a una IA. Si no tienes tiempo de limpiarlos, copia solo el texto de las preguntas." },
      ] },
      { titulo: "Paso 2 · El prompt", bloques: [
        { prompt: "Te paso mensajes de clientes de mi negocio de [qué vendes], sin datos personales.\n\n1. ¿Cuáles son las cinco dudas o quejas que más se repiten? Dime cuántas veces aparece cada una y pon un ejemplo textual.\n2. ¿En qué momento de la compra aparece cada una: antes de comprar, al pagar, en el envío o después de recibir?\n3. Para cada una propón: un cambio en la descripción del producto, una idea de video que la responda y una respuesta rápida para WhatsApp (máximo 2 frases, de tú).\n\nMensajes:\n«[pega aquí]»" },
      ] },
      { titulo: "Qué hacer con el resultado", bloques: [
        { lista: [
          "Cambia la descripción del producto para responder la duda antes de que te la hagan.",
          "Graba un video corto con cada duda: es contenido que ya sabes que interesa.",
          "Guarda las respuestas rápidas en WhatsApp Business para contestar en segundos.",
        ] },
        { p: "Casi siempre sale algo que no esperabas, como el envío o la talla. Puedes vender más sin conseguir un solo seguidor nuevo." },
      ] },
    ],
  },

  {
    slug: "dicta",
    palabra: "DICTA",
    titulo: "Dicta tus ideas y conviértelas en publicaciones",
    resumen: "Graba una nota de voz desordenada, como te salga, y pídele a la IA que la convierta en una publicación que conserve tus frases y tus ejemplos.",
    tipo: "guia",
    publicos: ["creadores", "emprendedores"],
    tiempo: 3,
    actualizado: "2026-10-15",
    secciones: [
      { titulo: "La regla que hace que suene a ti", bloques: [
        { p: "Si no se lo dices, la IA te devuelve un texto bonito que no suena a ti. La instrucción clave es: «conserva mis frases y mis ejemplos, y solo ordena»." },
      ] },
      { titulo: "Paso 1 · Graba y transcribe", bloques: [
        { lista: [
          "Graba una nota de voz cuando te llegue la idea: manejando, caminando, donde sea.",
          "Habla como le contarías la idea a un amigo. No importa que sea desordenado.",
          "Pásala a texto con el dictado del teclado de tu celular o con la transcripción automática de tu app de notas de voz.",
        ] },
      ] },
      { titulo: "Paso 2 · El prompt", bloques: [
        { prompt: "Te paso la transcripción de una nota de voz mía. Conviértela en una publicación para [Instagram / LinkedIn / mi lista de correo].\n\nReglas:\n- Conserva mis frases y mis ejemplos. Solo ordena, quita repeticiones y corrige lo que se entienda mal.\n- No agregues datos ni ejemplos que yo no dije.\n- Máximo [número] palabras.\n\nAdemás dame tres ganchos distintos para la primera línea, para que yo escoja.\n\nTranscripción:\n«[pega aquí]»" },
        { ojo: "Revisa los datos: cuando hablas rápido, la transcripción confunde números y nombres." },
      ] },
    ],
  },

  {
    slug: "formula",
    palabra: "FORMULA",
    titulo: "Fórmulas de Excel sin saber Excel",
    resumen: "Le explicas a la IA qué hay en cada columna y qué quieres ver, y te devuelve la fórmula explicada. Aquí están el prompt y las diez fórmulas que más uso para ventas e inventario.",
    tipo: "prompt",
    publicos: ["emprendedores", "ia-y-developers"],
    tiempo: 5,
    actualizado: "2026-10-15",
    secciones: [
      { titulo: "El prompt", bloques: [
        { prompt: "Tengo una hoja de Excel [en español / en inglés]. En la columna A está [qué hay], en la B [qué hay] y en la C [qué hay]. Los datos van de la fila 2 a la [última fila].\n\nQuiero ver: [qué quieres calcular, por ejemplo «el total por mes de cada producto»].\n\nDame la fórmula lista para pegar, dime en qué celda va y explícame qué hace cada parte, en palabras sencillas." },
        { p: "Si la fórmula da error, pégale el error tal cual y pídele que la corrija." },
      ] },
      { titulo: "Las diez que más uso", bloques: [
        { p: "Están con los nombres de Excel en español y punto y coma como separador. Si tu Excel está en inglés, pídele a la IA que te las traduzca." },
        { lista: [
          "Total de ventas: =SUMA(C2:C500)",
          "Total de un producto: =SUMAR.SI(B2:B500;\"Camiseta\";C2:C500)",
          "Total de un producto en un mes: =SUMAR.SI.CONJUNTO(C2:C500;B2:B500;\"Camiseta\";A2:A500;\">=\"&FECHA(2026;10;1);A2:A500;\"<\"&FECHA(2026;11;1))",
          "Cuántas ventas tuvo un producto: =CONTAR.SI(B2:B500;\"Camiseta\")",
          "Venta promedio: =PROMEDIO(C2:C500)",
          "Traer el precio desde otra hoja: =BUSCARX(B2;Precios!A:A;Precios!B:B;\"No existe\")",
          "Avisar cuando hay que pedir inventario: =SI(D2<5;\"Pedir\";\"OK\")",
          "Evitar errores en una división: =SI.ERROR(C2/D2;0)",
          "Nombre del mes de una fecha: =TEXTO(A2;\"mmmm\")",
          "Lista de productos sin repetir: =UNICOS(B2:B500)",
        ] },
        { ojo: "BUSCARX y UNICOS solo existen en Excel 365 y Excel 2021 o más nuevo. Si tienes una versión anterior, pídele a la IA la alternativa." },
      ] },
      { titulo: "Antes de confiar en el total", bloques: [
        { ojo: "Prueba cada fórmula con tres filas cuyo resultado ya conozcas. Si da lo que esperabas, ahí sí cópiala a toda la columna." },
      ] },
    ],
  },

  {
    slug: "precio",
    palabra: "PRECIO",
    titulo: "Usa la IA para pensar tu precio, no para decidirlo",
    resumen: "Le pasas a la IA tus costos, tu tiempo y lo que cobra la competencia, y te ayuda a armar tres opciones de precio y a responder las objeciones. El número final lo pones tú.",
    tipo: "guia",
    publicos: ["emprendedores"],
    tiempo: 4,
    actualizado: "2026-10-15",
    secciones: [
      { titulo: "Por qué no dejarle la decisión a la IA", bloques: [
        { p: "La IA no conoce tu ciudad, a tu cliente ni lo que vale tu trabajo para él. Úsala para ordenar números y pensar opciones, no para que te diga cuánto cobrar." },
        { p: "Cobrar barato no es una estrategia: es un miedo. Tener tus números claros es lo que te deja sostener el precio." },
      ] },
      { titulo: "Paso 1 · Tres precios", bloques: [
        { prompt: "Vendo [qué vendes] a [a quién] en [ciudad o país].\nMis costos por unidad o por proyecto son: [lista de costos].\nMe toma [tiempo] hacerlo.\nLa competencia cobra entre [precio] y [precio].\n\n1. Calcula mi costo total, incluyendo mi tiempo a [lo que quieres ganar por hora].\n2. Propón tres opciones: básica, completa y premium. Para cada una dime qué incluye, qué no incluye y un precio sugerido con su margen.\n3. Explícame tus supuestos para que yo los corrija." },
      ] },
      { titulo: "Paso 2 · Las objeciones", bloques: [
        { prompt: "Con estas tres opciones de precio, dime las cinco objeciones más probables de un cliente (por ejemplo «está caro») y cómo responder cada una en máximo dos frases, sin bajar el precio. Habla de tú y con tono [cercano / profesional]." },
        { p: "Tener las respuestas listas es lo que evita que bajes el precio apenas alguien dice «está caro»." },
        { ojo: "Revisa cada cálculo con tu calculadora. El número final, y si lo bajas o no, lo decides tú." },
      ] },
    ],
  },
];
