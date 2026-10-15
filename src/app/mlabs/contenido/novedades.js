// Novedades de IA de la semana (/novedades). Una edición por semana: la más nueva va ARRIBA de la lista.
// /novedades muestra siempre la edición más reciente; las anteriores quedan como archivo en /novedades/<fecha>.
// Cada novedad lleva fuente oficial con enlace https: sin fuente, el build falla (contenido/validar.js).
// Para la edición de la próxima semana: copia el bloque de abajo, ponlo de primero y cambia fecha, textos y fuentes.

// Palabra que la gente comenta en los videos para recibir el acceso por DM (ManyChat → https://mlabs.elmetacho.com/novedades).
export const PALABRA_NOVEDADES = "NOVEDADES";

export const ediciones = [
  {
    slug: "2026-10-15",
    fecha: "2026-10-15",
    titulo: "Semana del 15 de octubre de 2026",
    intro:
      "Esta semana: los cursos gratis de Anthropic para aprender Claude y el agente de Gemini que llega a Gmail, Drive y Calendar (todavía no para todos).",
    destacado: {
      slug: "anthropic-academy-cursos-gratis",
      titulo: "Anthropic tiene cursos gratis para aprender Claude",
      fecha: "2026-10-15",
      fuente: { nombre: "Anthropic Academy", url: "https://anthropic.skilljar.com/" },
      queEs:
        "La academia oficial de Anthropic, la empresa que hace Claude. Son cursos a tu ritmo que tomas con una cuenta gratis en Skilljar (la plataforma donde están alojados) y al terminarlos te dan certificado.",
      paraQueTeSirve:
        "Si estás empezando con Claude, es la forma más ordenada de aprender sin pagar. Ojo: la mayoría está en inglés. Truco: ten Claude abierto al lado y pídele «explícame esta lección en español, con un ejemplo de mi negocio» mientras avanzas.",
      cursos: [
        { nombre: "Claude 101", paraQuien: "Si nunca has usado Claude o lo usas poco. Es el punto de partida." },
        {
          nombre: "AI Fluency: Framework & Foundations",
          paraQuien: "Para cualquiera que quiera aprender a trabajar bien con la IA: es la base de todos los cursos «AI Fluency».",
        },
        { nombre: "AI Fluency for Small Businesses", paraQuien: "Emprendedores y dueños de negocios pequeños." },
        { nombre: "AI Fluency for Creative Work", paraQuien: "Creadores de contenido, diseñadores y quienes escriben." },
        {
          nombre: "Claude Code 101",
          paraQuien: "Si quieres que Claude trabaje en tu computador: crear archivos, automatizar tareas o programar. Es más técnico.",
        },
      ],
      guiaRelacionada: "claude",
    },
    novedades: [
      {
        slug: "gemini-agent-workspace",
        titulo: "Google presentó un agente de Gemini que trabaja dentro de Gmail, Drive, Docs y Calendar",
        fecha: "2026-10-08",
        fuente: { nombre: "Google Cloud Blog", url: "https://cloud.google.com/blog/products/ai-machine-learning/welcome-to-gemini-at-work-2026" },
        queEs:
          "Un agente al que le describes lo que necesitas y lo hace dentro de tus herramientas de Google. Por ejemplo, le dices «cuadra una reunión con el equipo la otra semana» y él busca a las personas, revisa los calendarios y arranca el correo. También te muestra primero los correos que más importan y entiende cómo se relacionan tus documentos.",
        paraQueTeSirve:
          "Si tu negocio ya trabaja en Google Workspace, es la IA metida donde ya están tu correo y tus documentos. Si usas el Gmail gratis, todavía no te llega.",
        aclaracion: {
          texto:
            "Por ahora está en vista previa privada para algunos planes Business y Enterprise de Google Workspace: no está disponible para todos. El anuncio oficial de Google no da la fecha ni los planes; esto lo reporta la prensa especializada.",
          fuente: { nombre: "9to5Google", url: "https://9to5google.com/2026/10/08/gemini-agent-google-cloud/" },
        },
      },
    ],
    guiasRelacionadas: ["claude", "dicta", "formula"],
  },
];
