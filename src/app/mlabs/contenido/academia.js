// academia.js — datos de presentación del rediseño «academia» (rama pruebas): foto, categoría, nivel y título de
// portada de cada curso y recurso. El contenido sigue en productos.js y en Redis; aquí solo va cómo se ve.
export const FOTOS = {
  heroe: "/images/labs/heroe.webp",
  gafas: "/images/labs/gafas.webp",
  marco: "/images/labs/marco.webp",
  espalda: "/images/labs/espalda.webp",
};
export const AUTOR = { nombre: "Oscar · El Metacho", foto: FOTOS.gafas };

// Cifras verificadas (regla de Oscar: «2,4 M en Facebook» o «+4 M entre Facebook e Instagram», nunca «2,4 M» solo).
export const CIFRAS = [
  { valor: "+4 M", texto: "seguidores entre Facebook e Instagram" },
  { valor: "10 años", texto: "creando contenido" },
];

// Cursos y herramientas de pago (orden de la portada).
export const CURSOS = {
  "fabrica-de-videos": { foto: FOTOS.heroe, tono: "rojo", tapa: "Videos *que se hacen solos*", categoria: "Contenido con IA", nivel: "Principiante" },
  "edita-con-claude": { foto: FOTOS.marco, tono: "negro", tapa: "Edita tus videos *con Claude*", categoria: "Edición de video", nivel: "Principiante" },
  "ahorra-50": { foto: FOTOS.gafas, tono: "rojo", tapa: "Gasta menos *tokens*", categoria: "Herramienta", nivel: "Principiante", slugPagina: "/ahorra", titulo: "Ahorra: tus archivos a texto para Claude, ChatGPT, Gemini y más" },
  "pc-piloto-automatico": { foto: FOTOS.heroe, tono: "negro", tapa: "Tu PC trabaja *mientras duermes*", categoria: "Automatización", nivel: "Intermedio" },
  "pc-liviano": { foto: FOTOS.gafas, tono: "negro", tapa: "Libera *gigas* en minutos", categoria: "Tu computador", nivel: "Principiante" },
  "talking-head-pro": { foto: FOTOS.marco, tono: "negro", tapa: "Tú hablas, *el estudio edita*", categoria: "Edición de video", nivel: "Intermedio" },
  "pack-subtitulos": { foto: FOTOS.gafas, tono: "rojo", tapa: "*13 estilos* de subtítulos", categoria: "Edición de video", nivel: "Principiante" },
  "studio-estilos": { foto: FOTOS.heroe, tono: "rojo", tapa: "Una toma, *5 estilos*", categoria: "Edición de video", nivel: "Intermedio" },
  "radar-viral": { foto: FOTOS.gafas, tono: "negro", tapa: "Ideas que *ya funcionaron*", categoria: "Contenido con IA", nivel: "Principiante" },
  "seo-piloto-automatico": { foto: FOTOS.marco, tono: "negro", tapa: "SEO en *piloto automático*", categoria: "Tu negocio", nivel: "Intermedio" },
  "tienda-segura": { foto: FOTOS.heroe, tono: "rojo", tapa: "Tu tienda *segura*", categoria: "Tu negocio", nivel: "Intermedio" },
  "tienda-rapida": { foto: FOTOS.gafas, tono: "negro", tapa: "Tu tienda *rápida*", categoria: "Tu negocio", nivel: "Intermedio" },
  "equipo-de-agentes": { foto: FOTOS.marco, tono: "negro", tapa: "Tu equipo *de agentes*", categoria: "Automatización", nivel: "Intermedio" },
  "embajadores-con-comision": { foto: FOTOS.heroe, tono: "rojo", tapa: "Clientes que *te venden*", categoria: "Tu negocio", nivel: "Intermedio" },
  "pack-collage": { foto: FOTOS.gafas, tono: "rojo", tapa: "Recortes *sin reclamos*", categoria: "Recursos", nivel: "Principiante" },
  "creador-de-carruseles": { foto: FOTOS.marco, tono: "rojo", tapa: "Carruseles *en minutos*", categoria: "Contenido", nivel: "Principiante" },
};
export const ORDEN_CURSOS = ["fabrica-de-videos", "edita-con-claude", "ahorra-50", "talking-head-pro", "studio-estilos", "radar-viral", "pc-piloto-automatico", "pc-liviano", "equipo-de-agentes", "seo-piloto-automatico", "tienda-segura", "tienda-rapida", "embajadores-con-comision", "pack-subtitulos", "pack-collage", "creador-de-carruseles"];

const CATEGORIA_TIPO = { guia: "Guía paso a paso", prompt: "Prompt listo", "mini-curso": "Mini curso" };
const ROTA = [
  { foto: FOTOS.gafas, tono: "negro" }, { foto: FOTOS.marco, tono: "rojo" }, { foto: FOTOS.heroe, tono: "negro" },
  { foto: FOTOS.marco, tono: "negro" }, { foto: FOTOS.gafas, tono: "rojo" }, { foto: FOTOS.heroe, tono: "rojo" },
];
// Recursos gratis: foto y tono rotan; el título de portada es el «gancho» de la guía (o su palabra).
export const vistaRecurso = (g, i) => ({
  ...ROTA[i % ROTA.length],
  tapa: g.gancho ?? g.palabra,
  categoria: CATEGORIA_TIPO[g.tipo] ?? "Guía",
  nivel: "Principiante",
});

// Tarjetas que rotan sobre la foto de la portada (temas de MetachoLABS). *Asteriscos* = color de acento.
export const TARJETAS_HEROE = [
  { foto: FOTOS.marco, tono: "negro", tapa: "Edita con *Claude*" },
  { foto: FOTOS.gafas, tono: "rojo", tapa: "Gasta menos *tokens*" },
  { foto: FOTOS.heroe, tono: "negro", tapa: "Tu PC trabaja *mientras duermes*" },
  { foto: FOTOS.marco, tono: "rojo", tapa: "Carruseles *en minutos*" },
  { foto: FOTOS.gafas, tono: "negro", tapa: "Guías *gratis*" },
  { foto: FOTOS.heroe, tono: "rojo", tapa: "Contenido *con IA*" },
  { foto: FOTOS.marco, tono: "negro", tapa: "Automatiza *tu negocio*" },
  { foto: FOTOS.gafas, tono: "rojo", tapa: "Videos *que se hacen solos*" },
  { foto: FOTOS.heroe, tono: "negro", tapa: "Prompts *listos*" },
];
