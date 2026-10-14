// Material gratis de cada video de Metacho Labs. La clave es la palabra que la gente comenta (en minúsculas, sin tildes).
// Bloques: { p }, { lista: [] }, { prompt }, { tabla: [[mal, bien], …] }, { ojo }.
export const guias = {
  claude: {
    palabra: "CLAUDE",
    titulo: "Guía rápida: Claude Dashboards",
    resumen: "Le haces una pregunta a Claude sobre tu negocio y te arma un tablero con gráficas que se conecta a tus datos y se actualiza solo.",
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

  resena: {
    palabra: "RESEÑA",
    titulo: "Cómo responder reseñas sin sonar a robot",
    resumen: "Usa la IA para el primer borrador de cada respuesta, con tres reglas que la hacen sonar humana. La respuesta final la decides tú.",
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

  recicla: {
    palabra: "RECICLA",
    titulo: "Un video, siete piezas de contenido",
    resumen: "Grabas una vez y de ese video salen siete publicaciones distintas. La clave: una sola idea por pieza.",
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

  competencia: {
    palabra: "COMPETENCIA",
    titulo: "Analiza a tu competencia por sus comentarios",
    resumen: "Los comentarios de las publicaciones de tu competencia son investigación de mercado gratis. La IA los agrupa y te dice qué hacer con ellos.",
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
};

export const listaGuias = Object.entries(guias).map(([slug, g]) => ({ slug, ...g }));
