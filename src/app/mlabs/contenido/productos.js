// Productos de MLABS. En la Parte A solo se apartan (preventa); el cobro y la entrega llegan en la Parte B.
// Regla de verdad: precio, precioLanzamiento y fechaEstimada los define el dueño. Mientras sean null, la página lo dice.
export const productos = [
  {
    slug: "editor-automatico",
    nombre: "Editor automático con Claude",
    promesa: "Grabas tu video a cámara, con errores y silencios, y Claude te lo entrega editado: cortes, subtítulos, música y ritmo, listo para publicar.",
    paraQuien: [
      "Creadores y marcas que graban a cámara varias veces por semana.",
      "Quien pasa más tiempo editando que grabando.",
    ],
    noEsPara: [
      "Quien busca efectos de cine o edición creativa a mano.",
      "Quien no tiene, o no quiere pagar, una suscripción de Claude.",
    ],
    queIncluye: [
      "El sistema de edición que usamos en Metacho Labs, instalable en tu computador.",
      "Guía de instalación paso a paso y revisión de que todo quedó funcionando.",
      "Acceso a la beta y a las mejoras de la primera versión.",
    ],
    requisitos: [
      "Suscripción de Claude Pro o superior.",
      "Computador con Windows. En Mac todavía lo estamos probando.",
      "Nosotros te guiamos en la instalación, paso a paso.",
    ],
    estado: "preventa",
    precioLanzamiento: null,
    precio: null,
    moneda: "COP",
    fechaEstimada: null,
    faq: [
      { q: "¿Ya lo puedo comprar?", a: "Todavía no. Estamos en preventa: apartas tu cupo gratis y te avisamos primero cuando abra, con el precio de lanzamiento." },
      { q: "¿Apartar el cupo me obliga a comprar?", a: "No. Solo te avisamos. Decides cuando veas el precio y la fecha." },
    ],
  },
  {
    slug: "creador-de-carruseles",
    nombre: "Creador de carruseles con Claude",
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
    moneda: "COP",
    fechaEstimada: null,
    faq: [
      { q: "¿Ya lo puedo comprar?", a: "Todavía no. Estamos en preventa: apartas tu cupo gratis y te avisamos primero cuando abra, con el precio de lanzamiento." },
      { q: "¿Apartar el cupo me obliga a comprar?", a: "No. Solo te avisamos. Decides cuando veas el precio y la fecha." },
    ],
  },
];
