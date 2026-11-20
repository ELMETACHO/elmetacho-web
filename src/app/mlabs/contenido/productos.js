// Productos de MLABS. En la Parte A solo se apartan (preventa); el cobro y la entrega llegan en la Parte B.
// Regla de verdad: precio, precioLanzamiento y fechaEstimada los define el dueño. Mientras sean null, la página lo dice.
export const productos = [
  {
    slug: "edita-con-claude",
    nombre: "Kit Edita con Claude",
    etiqueta: "Kit",
    palabraPortada: "EDITA",
    portada: "rojo",
    promesa: "Grabas una toma y Claude te devuelve el Reel editado con tu estilo: sin silencios, con subtítulos palabra por palabra, tu look de color y en vertical.",
    paraQuien: [
      "Emprendedores y marcas que graban con el celular y no tienen editor.",
      "Editores que quieren el corte básico en minutos para dedicarle tiempo a lo creativo.",
      "Creadores que publican todos los días y se cansaron de cortar silencios a mano.",
    ],
    noEsPara: [
      "Quien busca que la IA elija sus mejores tomas o ponga la música por él.",
      "Quien no tiene, o no quiere pagar, un plan de Claude.",
    ],
    queIncluye: [
      "Las herramientas de edición que usamos en Metacho LABS, listas para tu computador.",
      "3 looks de color propios y soporte para los tuyos.",
      "Un reto de 5 días: el quinto día ya editas con una frase.",
      "30 prompts probados para editar, subtitular y escribir ganchos.",
      "Instalador de doble clic para Windows y Mac: Claude prepara tu computador solo.",
      "3 guías PDF: tu primer video, el reto de 5 días y los 30 prompts.",
    ],
    requisitos: ["Plan Pro de Claude o superior.", "Computador con Windows 10/11 o Mac.", "Te guiamos si algo no arranca."],
    planes: [{ nombre: "Kit completo", detalle: "7 habilidades + 3 guías PDF", COP: 69000, lanzamiento: 55000 }],
    estado: "preventa",
    precioLanzamiento: null,
    precio: null,
    precios: { COP: null, USD: null },   // los pone Oscar; con los dos y el archivo, estado: "disponible"
    archivo: null,                        // pathname en Vercel Blob privado, p. ej. "mlabs/productos/<slug>/<archivo>.zip"
    moneda: "COP",
    fechaEstimada: null,
    faq: [
      { q: "¿Ya lo puedo comprar?", a: "Todavía no. Apártalo gratis y te avisamos primero cuando abra, con el precio de lanzamiento." },
      { q: "¿Necesito saber programar?", a: "No. Le escribes a Claude lo que quieres, en español." },
      { q: "¿Mis videos se suben a internet?", a: "No. Todo se procesa en tu computador." },
      { q: "¿Apartarlo me obliga a comprar?", a: "No. Solo te avisamos. Decides cuando veas el precio." },
    ],
  },
  {
    // Fábrica de Videos (aprobada por Oscar el 2026-11-19): pago único por estilo. Preventa hasta que el kit saneado esté en Blob.
    slug: "fabrica-de-videos",
    nombre: "Fábrica de Videos",
    etiqueta: "Kit",
    palabraPortada: "FÁBRICA",
    portada: "negro",
    promesa: "Tu cuenta de datos curiosos animados, con voz y subtítulos, sin grabarte y sin saber editar. Escribes el tema y sale el video.",
    paraQuien: [
      "Quien quiere una cuenta de curiosidades, mitos, fútbol o mapas que publique todos los días.",
      "Creadores que no quieren salir a cámara.",
      "Emprendedores que quieren una página que crezca sola y monetice.",
    ],
    noEsPara: [
      "Quien busca videos con su cara: esto es animación con voz.",
      "Quien no quiere pagar una IA ni un plan de voz.",
    ],
    queIncluye: [
      "Empieza aquí: cómo piensa un video viral de datos.",
      "Tus dos cuentas: la IA y la voz (guía PDF paso a paso).",
      "Instala tu fábrica en 20 minutos con un solo video.",
      "Tu marca: nombre, color y voz en 8 preguntas.",
      "El juez viral: no se produce nada que no vaya a funcionar.",
      "Produce en masa: 10 videos con una frase, incluso de noche.",
      "El semáforo del domingo: qué repetir y qué cambiar.",
      "5 guías PDF y 9 prompts listos para copiar.",
    ],
    requisitos: [
      "Claude Pro o ChatGPT con Codex.",
      "Una cuenta de voz de ElevenLabs (te enseñamos a sacar la llave).",
      "Computador con Windows o Mac.",
    ],
    planes: [
      { nombre: "1 estilo", detalle: "Explora, Tips, Sports o Mapas", COP: 119000, lanzamiento: 89000 },
      { nombre: "2 estilos", detalle: "los que elijas", COP: 189000, lanzamiento: null },
      { nombre: "Los 4 estilos", detalle: "Explora + Tips + Sports + Mapas", COP: 279000, lanzamiento: 219000 },
    ],
    estado: "preventa",
    precioLanzamiento: null,
    precio: null,
    precios: { COP: null, USD: null },
    archivo: null,
    moneda: "COP",
    fechaEstimada: null,
    faq: [
      { q: "¿Es pago único?", a: "Sí. Pagas una vez y es tuyo. La IA y la voz las pagas tú directo a cada una, con el plan que quieras." },
      { q: "¿Necesito saber programar o editar?", a: "No. Pegas un texto, respondes 8 preguntas y le escribes el tema del video." },
      { q: "¿Cuál estilo elijo?", a: "Explora: el porqué de tu cuerpo y tus mascotas. Tips: mitos de la casa. Sports: fútbol que une. Mapas: historia y geografía sobre mapas reales." },
      { q: "¿Y si no me funciona?", a: "Tienes 7 días de garantía de instalación: te ayudamos por WhatsApp o te devolvemos el dinero." },
    ],
  },
  {
    slug: "pc-piloto-automatico",
    nombre: "PC en piloto automático",
    etiqueta: "Guía + herramientas",
    palabraPortada: "PILOTO",
    portada: "tinta",
    promesa: "Tu computador se despierta a la hora que digas, Claude hace su trabajo y el computador se vuelve a dormir. Sin dejarlo prendido toda la noche.",
    paraQuien: [
      "Quien ya usa las tareas programadas de Claude y quiere que corran solas.",
      "Quien cuida la luz y no quiere el computador prendido toda la noche.",
    ],
    noEsPara: ["Quien no usa Claude en su computador.", "Quien busca automatizar su celular."],
    queIncluye: [
      "Lo montas pegando un texto en Claude: 3 preguntas y listo.",
      "Las herramientas con las que corre la fábrica de videos de Metacho todos los días.",
      "Una revisión automática que te dice qué le falta a tu computador antes de empezar.",
      "2 guías PDF: cómo montarlo y 5 recetas de tareas nocturnas.",
    ],
    requisitos: ["App de escritorio de Claude con tareas programadas.", "Computador con Windows 10/11 (probado) o Mac."],
    planes: [{ nombre: "Kit completo", detalle: "Windows y Mac + 2 guías PDF", COP: 45000, lanzamiento: null }],
    estado: "preventa",
    precioLanzamiento: null,
    precio: null,
    precios: { COP: null, USD: null },   // los pone Oscar; con los dos y el archivo, estado: "disponible"
    archivo: null,                        // pathname en Vercel Blob privado, p. ej. "mlabs/productos/<slug>/<archivo>.zip"
    moneda: "COP",
    fechaEstimada: null,
    faq: [
      { q: "¿Ya lo puedo comprar?", a: "Todavía no. Apártalo gratis y te avisamos primero cuando abra, con el precio de lanzamiento." },
      { q: "¿Apartarlo me obliga a comprar?", a: "No. Solo te avisamos. Decides cuando veas el precio." },
    ],
  },
  {
    // PC Liviano (Oscar lo aprobó el 2026-11-19): la IA mide el disco, muestra un mapa por bloques y limpia solo lo aprobado.
    slug: "pc-liviano",
    nombre: "PC Liviano",
    etiqueta: "Guía + herramientas",
    palabraPortada: "LIVIANO",
    portada: "rojo",
    promesa: "La IA mide tu disco, te muestra por bloques lo que más pesa y libera gigas en minutos. Solo borra lo que tú apruebas.",
    paraQuien: [
      "Quien tiene el disco lleno y no sabe qué se lo está comiendo.",
      "Quien quiere limpiar sin miedo a borrar algo importante.",
      "Creadores con muchos videos, descargas y programas.",
    ],
    noEsPara: ["Quien busca recuperar archivos borrados.", "Quien no usa Claude en su computador."],
    queIncluye: [
      "Un mapa por bloques de tu disco: verde se limpia, amarillo se revisa, rojo es tuyo.",
      "Limpieza de temporales, cachés de navegador y basura que se vuelve a crear sola.",
      "Buscador de archivos repetidos por contenido, no por nombre.",
      "Mover a otro disco lo pesado sin que nada deje de funcionar.",
      "Todo lo tuyo va a la Papelera: te puedes arrepentir.",
      "2 guías PDF: libera espacio hoy y mantenlo liviano cada mes.",
    ],
    requisitos: ["Plan Pro de Claude o superior.", "Computador con Windows 10/11 (probado) o Mac."],
    planes: [{ nombre: "Kit completo", detalle: "Herramientas + 2 guías PDF", COP: 29900, lanzamiento: null }],
    estado: "preventa",
    precioLanzamiento: null,
    precio: null,
    precios: { COP: null, USD: null },
    archivo: null,
    moneda: "COP",
    fechaEstimada: null,
    faq: [
      { q: "¿Me puede borrar algo importante?", a: "No sin tu permiso. Te muestra una lista numerada y solo limpia lo que apruebas. Tus archivos van a la Papelera." },
      { q: "¿Hace mi computador más rápido?", a: "Libera espacio, y con el disco casi lleno todo va lento. También te dice qué programas se abren solos al prender. No prometemos velocidad: lo que se mide es el espacio." },
      { q: "¿Cuánto espacio voy a recuperar?", a: "Depende de tu PC. En un computador de uso diario es normal encontrar decenas de gigas en temporales y cachés." },
    ],
  },
  // Productos 4–13 del catálogo (Oscar pidió el 20-nov que salgan todos con los precios sugeridos). Preventa hasta tener kit probado.
  {
    "slug": "talking-head-pro",
    "nombre": "Studio · Talking Head Pro",
    "etiqueta": "Kit",
    "palabraPortada": "STUDIO",
    "portada": "negro",
    "promesa": "Tú hablas y el estudio edita: quita silencios y tropiezos, se queda con la toma buena, subtítulos con tu texto exacto, zoom a tu cara y tu look de color.",
    "paraQuien": [
      "Quien graba a cámara y se equivoca, repite y hace pausas.",
      "Creadores y negocios que publican todos los días."
    ],
    "noEsPara": [
      "Quien busca videos animados sin su cara (para eso está la Fábrica de Videos)."
    ],
    "queIncluye": [
      "Corte limpio: silencios y respiraciones fuera, sin comerse palabras.",
      "Detector de tropiezos: si repites una frase, se queda la buena.",
      "Subtítulos con tu texto exacto, sin errores de transcripción.",
      "Zoom a tu cara en lo importante.",
      "Looks de color propios.",
      "Incluye el Pack Subtítulos y Tipos (12 estilos y más de 25 tipografías).",
      "Reto de 5 días y guías PDF."
    ],
    "requisitos": [
      "Plan Pro de Claude o superior.",
      "Computador con Windows 10/11 o Mac."
    ],
    "planes": [
      {
        "nombre": "Kit completo",
        "detalle": "Incluye el Pack Subtítulos y Tipos",
        "COP": 149000,
        "lanzamiento": null
      }
    ],
    "estado": "preventa",
    "precioLanzamiento": null,
    "precio": null,
    "precios": {
      "COP": null,
      "USD": null
    },
    "archivo": null,
    "moneda": "COP",
    "fechaEstimada": null,
    "faq": [
      {
        "q": "¿Es pago único?",
        "a": "Sí. Pagas una vez y es tuyo. Tienes 7 días de garantía."
      },
      {
        "q": "¿Necesito saber programar?",
        "a": "No. Pegas un texto en Claude y él hace el trabajo contigo, en español."
      }
    ]
  },
  {
    "slug": "pack-subtitulos",
    "nombre": "Pack Subtítulos y Tipos",
    "etiqueta": "Pack",
    "palabraPortada": "SUBS",
    "portada": "rojo",
    "promesa": "12 estilos de subtítulos y más de 25 tipografías libres para uso comercial. Le dices a Claude el estilo y listo.",
    "paraQuien": [
      "Quien quiere que sus videos no se vean todos iguales.",
      "Quien ya edita con Claude y quiere más estilos."
    ],
    "noEsPara": [
      "Quien busca editar en una app del celular."
    ],
    "queIncluye": [
      "Caja negra, rebote, palabra clave gigante, máquina de escribir, resaltador y karaoke.",
      "Neón, sticker, serif de revista, texto detrás de ti, arco y documental.",
      "Más de 25 tipografías libres para uso comercial, probadas en vertical.",
      "Guía PDF con ejemplos de cada estilo."
    ],
    "requisitos": [
      "Plan Pro de Claude o superior.",
      "Computador con Windows 10/11 o Mac."
    ],
    "planes": [
      {
        "nombre": "Pack completo",
        "detalle": "12 estilos + 25 tipografías",
        "COP": 49000,
        "lanzamiento": null
      }
    ],
    "estado": "preventa",
    "precioLanzamiento": null,
    "precio": null,
    "precios": {
      "COP": null,
      "USD": null
    },
    "archivo": null,
    "moneda": "COP",
    "fechaEstimada": null,
    "faq": [
      {
        "q": "¿Viene en Talking Head Pro?",
        "a": "Sí. Si compras Talking Head Pro, este pack ya va incluido."
      },
      {
        "q": "¿Es pago único?",
        "a": "Sí. Pagas una vez y es tuyo. Tienes 7 días de garantía."
      },
      {
        "q": "¿Necesito saber programar?",
        "a": "No. Pegas un texto en Claude y él hace el trabajo contigo, en español."
      }
    ]
  },
  {
    "slug": "studio-estilos",
    "nombre": "Studio · Estilos",
    "etiqueta": "Kit",
    "palabraPortada": "ESTILOS",
    "portada": "rojo",
    "promesa": "La misma toma, cinco estilos: Pop Sky, Trailer Mode, Street Collage, Zoom Pack y Cabezón. Le dices el nombre del estilo y Claude arma el video.",
    "paraQuien": [
      "Creadores que quieren un estilo propio y reconocible.",
      "Quien vende por palabra clave en los comentarios."
    ],
    "noEsPara": [
      "Quien busca plantillas para una app del celular."
    ],
    "queIncluye": [
      "Pop Sky: textos que saltan sobre color y un celular que escribe tu palabra clave.",
      "Trailer Mode: como el tráiler de una película.",
      "Street Collage: recortes de papel animados cuadro a cuadro.",
      "Zoom Pack: cortes y acercamientos al ritmo de tu voz.",
      "Cabezón: un muñeco con tu cara que explica contigo.",
      "Sonido de cine, música libre de derechos y tipografías en cada estilo."
    ],
    "requisitos": [
      "Plan Pro de Claude o superior.",
      "Computador con Windows 10/11 o Mac."
    ],
    "planes": [
      {
        "nombre": "1 estilo",
        "detalle": "el que elijas",
        "COP": 99000,
        "lanzamiento": null
      },
      {
        "nombre": "Los 5 estilos",
        "detalle": "Pop Sky + Trailer + Collage + Zoom + Cabezón",
        "COP": 299000,
        "lanzamiento": null
      }
    ],
    "estado": "preventa",
    "precioLanzamiento": null,
    "precio": null,
    "precios": {
      "COP": null,
      "USD": null
    },
    "archivo": null,
    "moneda": "COP",
    "fechaEstimada": null,
    "faq": [
      {
        "q": "¿Es pago único?",
        "a": "Sí. Pagas una vez y es tuyo. Tienes 7 días de garantía."
      },
      {
        "q": "¿Necesito saber programar?",
        "a": "No. Pegas un texto en Claude y él hace el trabajo contigo, en español."
      }
    ]
  },
  {
    "slug": "radar-viral",
    "nombre": "Radar Viral",
    "etiqueta": "Herramienta",
    "palabraPortada": "RADAR",
    "portada": "negro",
    "promesa": "Cada semana te trae las ideas que ya funcionaron en tu nicho, las reescribe con tu estilo y un juez las califica antes de que grabes.",
    "paraQuien": [
      "Creadores que no saben qué publicar.",
      "Quien ya tiene la Fábrica de Videos y quiere temas probados."
    ],
    "noEsPara": [
      "Quien busca una promesa de viral: esto te ayuda a dejar de adivinar."
    ],
    "queIncluye": [
      "Busca los videos que sacaron muchas más vistas de lo normal en su cuenta.",
      "Reescribe cada idea con tu forma de hablar.",
      "El juez viral: retención, compartidos y monetización antes de grabar.",
      "Tu estilo aprendido de 3 de tus videos.",
      "Guías PDF y prompts listos."
    ],
    "requisitos": [
      "Plan Pro de Claude o superior.",
      "Una cuenta del servicio de búsqueda de videos (te enseñamos a crearla; tiene plan gratis)."
    ],
    "planes": [
      {
        "nombre": "Kit completo",
        "detalle": "Radar + juez + guías",
        "COP": 69000,
        "lanzamiento": null
      }
    ],
    "estado": "preventa",
    "precioLanzamiento": null,
    "precio": null,
    "precios": {
      "COP": null,
      "USD": null
    },
    "archivo": null,
    "moneda": "COP",
    "fechaEstimada": null,
    "faq": [
      {
        "q": "¿Es pago único?",
        "a": "Sí. Pagas una vez y es tuyo. Tienes 7 días de garantía."
      },
      {
        "q": "¿Necesito saber programar?",
        "a": "No. Pegas un texto en Claude y él hace el trabajo contigo, en español."
      }
    ]
  },
  {
    "slug": "seo-piloto-automatico",
    "nombre": "SEO en Piloto Automático",
    "etiqueta": "Herramienta",
    "palabraPortada": "SEO",
    "portada": "negro",
    "promesa": "Cada día Claude le hace un chequeo a tu página web, te deja el informe en español y el arreglo listo para que lo apruebes.",
    "paraQuien": [
      "Negocios con página web propia.",
      "Quien no tiene tiempo de revisar su sitio."
    ],
    "noEsPara": [
      "Quien busca el primer lugar en Google garantizado: nadie lo puede prometer."
    ],
    "queIncluye": [
      "Revisión diaria: que cada página abra y tenga título, descripción y textos en las imágenes.",
      "Avisa a los buscadores cuando cambias algo.",
      "Arreglos listos para que tú los apruebes: nada se cambia sin ti.",
      "Una idea de guía nueva cada semana para atraer gente.",
      "Historial de informes en español."
    ],
    "requisitos": [
      "Plan Pro de Claude o superior.",
      "Una tienda o página web propia (con su código)."
    ],
    "planes": [
      {
        "nombre": "Kit completo",
        "detalle": "Revisión diaria + informes + guías",
        "COP": 79000,
        "lanzamiento": null
      }
    ],
    "estado": "preventa",
    "precioLanzamiento": null,
    "precio": null,
    "precios": {
      "COP": null,
      "USD": null
    },
    "archivo": null,
    "moneda": "COP",
    "fechaEstimada": null,
    "faq": [
      {
        "q": "¿Es pago único?",
        "a": "Sí. Pagas una vez y es tuyo. Tienes 7 días de garantía."
      },
      {
        "q": "¿Necesito saber programar?",
        "a": "No. Pegas un texto en Claude y él hace el trabajo contigo, en español."
      }
    ]
  },
  {
    "slug": "tienda-segura",
    "nombre": "Tienda Segura",
    "etiqueta": "Guía + herramientas",
    "palabraPortada": "SEGURA",
    "portada": "rojo",
    "promesa": "Las cinco bases de seguridad que tu tienda en línea tiene que tener. Claude revisa tu proyecto y las monta contigo, una por una.",
    "paraQuien": [
      "Quien vende por internet con su propia tienda.",
      "Quien no sabe si su tienda es segura."
    ],
    "noEsPara": [
      "Quien vende solo por redes o por una plataforma que no deja tocar el código."
    ],
    "queIncluye": [
      "Límite de intentos: que nadie pruebe mil contraseñas.",
      "Pagos que no se cobran dos veces con el doble clic.",
      "El precio lo confirma tu servidor, no el navegador.",
      "Enlaces firmados que no se pueden falsificar.",
      "Cabeceras de seguridad.",
      "Guía PDF y checklist."
    ],
    "requisitos": [
      "Plan Pro de Claude o superior.",
      "Una tienda o página web propia (con su código)."
    ],
    "planes": [
      {
        "nombre": "Tienda Segura",
        "detalle": "las 5 bases",
        "COP": 69000,
        "lanzamiento": null
      },
      {
        "nombre": "Segura + Rápida",
        "detalle": "con Tienda Rápida",
        "COP": 99000,
        "lanzamiento": null
      }
    ],
    "estado": "preventa",
    "precioLanzamiento": null,
    "precio": null,
    "precios": {
      "COP": null,
      "USD": null
    },
    "archivo": null,
    "moneda": "COP",
    "fechaEstimada": null,
    "faq": [
      {
        "q": "¿Es pago único?",
        "a": "Sí. Pagas una vez y es tuyo. Tienes 7 días de garantía."
      },
      {
        "q": "¿Necesito saber programar?",
        "a": "No. Pegas un texto en Claude y él hace el trabajo contigo, en español."
      }
    ]
  },
  {
    "slug": "tienda-rapida",
    "nombre": "Tienda Rápida",
    "etiqueta": "Guía + herramientas",
    "palabraPortada": "RÁPIDA",
    "portada": "negro",
    "promesa": "Tu tienda abre rápido en el celular: imágenes livianas, del tamaño justo y solo lo que se ve. Medido antes y después.",
    "paraQuien": [
      "Quien tiene una tienda que tarda en abrir.",
      "Quien vende con muchas fotos."
    ],
    "noEsPara": [
      "Quien vende solo por redes."
    ],
    "queIncluye": [
      "Imágenes en formato liviano y del tamaño exacto de cada pantalla.",
      "Carga solo lo que se ve.",
      "Medición antes y después, con números.",
      "Guía PDF."
    ],
    "requisitos": [
      "Plan Pro de Claude o superior.",
      "Una tienda o página web propia (con su código)."
    ],
    "planes": [
      {
        "nombre": "Tienda Rápida",
        "detalle": "imágenes y carga",
        "COP": 49000,
        "lanzamiento": null
      },
      {
        "nombre": "Segura + Rápida",
        "detalle": "con Tienda Segura",
        "COP": 99000,
        "lanzamiento": null
      }
    ],
    "estado": "preventa",
    "precioLanzamiento": null,
    "precio": null,
    "precios": {
      "COP": null,
      "USD": null
    },
    "archivo": null,
    "moneda": "COP",
    "fechaEstimada": null,
    "faq": [
      {
        "q": "¿Es pago único?",
        "a": "Sí. Pagas una vez y es tuyo. Tienes 7 días de garantía."
      },
      {
        "q": "¿Necesito saber programar?",
        "a": "No. Pegas un texto en Claude y él hace el trabajo contigo, en español."
      }
    ]
  },
  {
    "slug": "equipo-de-agentes",
    "nombre": "Tu Equipo de Agentes",
    "etiqueta": "Kit",
    "palabraPortada": "EQUIPO",
    "portada": "negro",
    "promesa": "Un director, una de finanzas y uno de marketing que te dejan un informe cada mañana. Agentes de Claude con reglas duras: nada se gasta ni se publica sin ti.",
    "paraQuien": [
      "Dueños de negocio que no tienen tiempo de mirar todo.",
      "Quien ya usa Claude y quiere orden."
    ],
    "noEsPara": [
      "Quien busca que los agentes vendan solos: te dejan todo pensado, tú decides."
    ],
    "queIncluye": [
      "Plantillas y textos de cada agente.",
      "Bandeja de mensajes entre agentes y tablero semanal.",
      "Reglas duras: no gastan, no publican y no tocan tus datos sin permiso.",
      "Cómo programarlos para que corran solos.",
      "Guías PDF."
    ],
    "requisitos": [
      "Plan Pro de Claude o superior.",
      "Computador con Windows 10/11 o Mac."
    ],
    "planes": [
      {
        "nombre": "Kit completo",
        "detalle": "3 agentes + tablero + guías",
        "COP": 119000,
        "lanzamiento": null
      }
    ],
    "estado": "preventa",
    "precioLanzamiento": null,
    "precio": null,
    "precios": {
      "COP": null,
      "USD": null
    },
    "archivo": null,
    "moneda": "COP",
    "fechaEstimada": null,
    "faq": [
      {
        "q": "¿Es pago único?",
        "a": "Sí. Pagas una vez y es tuyo. Tienes 7 días de garantía."
      },
      {
        "q": "¿Necesito saber programar?",
        "a": "No. Pegas un texto en Claude y él hace el trabajo contigo, en español."
      }
    ]
  },
  {
    "slug": "embajadores-con-comision",
    "nombre": "Embajadores con Comisión",
    "etiqueta": "Guía + herramientas",
    "palabraPortada": "EMBAJADORES",
    "portada": "rojo",
    "promesa": "Tus clientes te venden con su propio enlace y ganan una comisión. Todo queda anotado: quién trajo qué, cuánto se pagó y cuándo.",
    "paraQuien": [
      "Tiendas en línea con clientes felices.",
      "Quien quiere vender más sin pagar publicidad."
    ],
    "noEsPara": [
      "Quien vende solo por redes o por una plataforma que no deja tocar el código."
    ],
    "queIncluye": [
      "Enlace propio para cada embajador.",
      "Comisión que se suma sola en cada venta.",
      "Panel del embajador y libro de comisiones.",
      "Cómo fijar una comisión que no se coma tu ganancia.",
      "Guía PDF."
    ],
    "requisitos": [
      "Plan Pro de Claude o superior.",
      "Una tienda o página web propia (con su código)."
    ],
    "planes": [
      {
        "nombre": "Kit completo",
        "detalle": "Programa de embajadores + guías",
        "COP": 99000,
        "lanzamiento": null
      }
    ],
    "estado": "preventa",
    "precioLanzamiento": null,
    "precio": null,
    "precios": {
      "COP": null,
      "USD": null
    },
    "archivo": null,
    "moneda": "COP",
    "fechaEstimada": null,
    "faq": [
      {
        "q": "¿Es pago único?",
        "a": "Sí. Pagas una vez y es tuyo. Tienes 7 días de garantía."
      },
      {
        "q": "¿Necesito saber programar?",
        "a": "No. Pegas un texto en Claude y él hace el trabajo contigo, en español."
      }
    ]
  },
  {
    "slug": "pack-collage",
    "nombre": "Pack Collage",
    "etiqueta": "Pack",
    "palabraPortada": "COLLAGE",
    "portada": "rojo",
    "promesa": "Cientos de recortes con borde blanco para tus collages, de uso libre también en videos con los que ganas plata.",
    "paraQuien": [
      "Creadores que hacen collage o motion graphics.",
      "Quien usa Street Collage."
    ],
    "noEsPara": [
      "Quien busca fotos de personas famosas o marcas."
    ],
    "queIncluye": [
      "Entre 200 y 300 recortes: cielos, manos, ojos, celulares, plantas, animales, edificios y objetos vintage.",
      "Una carpeta por tipo, en alta calidad y en un solo .zip.",
      "De uso libre, también comercial.",
      "Claude los anima cuadro a cuadro con Street Collage."
    ],
    "requisitos": [
      "Ninguno para usarlos.",
      "Para animarlos: Studio · Estilos (Street Collage)."
    ],
    "planes": [
      {
        "nombre": "Pack completo",
        "detalle": "200–300 recortes",
        "COP": 59000,
        "lanzamiento": null
      }
    ],
    "estado": "preventa",
    "precioLanzamiento": null,
    "precio": null,
    "precios": {
      "COP": null,
      "USD": null
    },
    "archivo": null,
    "moneda": "COP",
    "fechaEstimada": null,
    "faq": [
      {
        "q": "¿Es pago único?",
        "a": "Sí. Pagas una vez y es tuyo. Tienes 7 días de garantía."
      },
      {
        "q": "¿Necesito saber programar?",
        "a": "No. Pegas un texto en Claude y él hace el trabajo contigo, en español."
      }
    ]
  },
  {
    slug: "creador-de-carruseles",
    nombre: "Creador de carruseles con Claude",
    etiqueta: "Plugin",
    palabraPortada: "CARRUSELES",
    portada: "amarillo",
    promesa: "Le das una idea o la transcripción de tu video y Claude te arma el carrusel con tu marca, listo para subir.",
    paraQuien: [
      "Creadores y marcas que publican carruseles en Instagram o LinkedIn.",
      "Quien quiere sacar varias piezas de cada video que graba.",
    ],
    noEsPara: [
      "Quien necesita diseño hecho a mano pieza por pieza.",
      "Quien no tiene, o no quiere pagar, una suscripción de Claude.",
    ],
    queIncluye: [
      "El sistema de carruseles que usamos en Metacho Labs, instalable en tu computador.",
      "Plantillas con tu logo, tus colores y tus tipografías.",
      "Acceso a la beta y a las mejoras de la primera versión.",
    ],
    requisitos: ["Claude Pro o superior.", "Computador con Windows o Mac."],
    estado: "preventa",
    precioLanzamiento: null,
    precio: null,
    precios: { COP: null, USD: null },   // los pone Oscar; con los dos y el archivo, estado: "disponible"
    archivo: null,                        // pathname en Vercel Blob privado, p. ej. "mlabs/productos/<slug>/<archivo>.zip"
    moneda: "COP",
    fechaEstimada: null,
    faq: [
      { q: "¿Ya lo puedo comprar?", a: "Todavía no. Apártalo gratis y te avisamos primero cuando abra, con el precio de lanzamiento." },
      { q: "¿Apartar el cupo me obliga a comprar?", a: "No. Solo te avisamos. Decides cuando veas el precio y la fecha." },
    ],
  },
  {
    // Solo existe con MLABS_TIENDA = "pruebas" (vista previa con llaves de prueba de Bold): sirve para probar el flujo
    // completo (checkout, webhook, entrega). En producción no aparece en ningún lado y su página da 404.
    slug: "prueba-tienda",
    nombre: "Producto de prueba",
    etiqueta: "Prueba",
    palabraPortada: "PRUEBA",
    portada: "claro",
    soloPruebas: true,
    promesa: "Producto para probar la tienda en modo de pruebas de Bold. No se cobra nada.",
    paraQuien: ["El equipo de MLABS, para probar la compra."],
    noEsPara: ["Clientes reales."],
    queIncluye: ["Un archivo de texto de prueba."],
    requisitos: ["Las llaves de prueba de Bold en la vista previa."],
    estado: "disponible",
    precioLanzamiento: null,
    precio: null,
    precios: { COP: 1000, USD: 1 },
    archivo: "mlabs/productos/prueba-tienda/prueba.txt",
    moneda: "COP",
    fechaEstimada: null,
    faq: [],
  },
  {
    // Paquete de Ahorra (precio aprobado por Oscar el 2026-11-18). Oculto del catálogo: se compra desde /ahorra.
    slug: "ahorra-50",
    nombre: "Ahorra · 50 archivos",
    etiqueta: "Paquete",
    palabraPortada: "AHORRA",
    portada: "rojo",
    oculto: true,
    creditos: 50,
    promesa: "50 conversiones más en Ahorra: tus archivos a texto limpio para Claude, ChatGPT, Gemini y más. Pago único, no vence.",
    paraQuien: ["Quien ya usó sus 3 archivos gratis y quiere seguir convirtiendo."],
    noEsPara: ["PDF escaneados: sin texto no hay nada que convertir (y no se cobran)."],
    queIncluye: ["50 archivos de hasta 20 MB y 300 páginas cada uno.", "Sin vencimiento.", "Se suman al correo con el que compras."],
    requisitos: ["El mismo correo con el que usas Ahorra."],
    estado: "disponible",
    precioLanzamiento: null,
    precio: null,
    precios: { COP: 14900, USD: 4 },
    archivo: null,
    moneda: "COP",
    fechaEstimada: null,
    faq: [],
  },
];
