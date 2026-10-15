# Brief · elmetacho-web / MLABS

## Qué es
- **elmetacho.com:** web personal de El Metacho (creador de contenido) con portada partida hacia MLABS.
- **mlabs.elmetacho.com:** agencia + "Platzi propio" para emprendedores, creadores, agencias, developers e independientes. Guías gratis (a cambio de correo), novedades de IA y productos instalables de pago.

## Hoja de ruta (cada parte con spec → plan → pruebas)
- **A.** Catálogo con buscador, guías gratis con desbloqueo por correo, novedades, preventas. Spec: `docs/superpowers/specs/2026-10-15-mlabs-parte-a-catalogo-design.md`.
- **B.** Venta y entrega automática: webhook de Bold → correo con descarga y licencia (Resend), términos de venta, derecho de retracto, factura electrónica.
- **C.** Producto: Creador de carruseles con Claude (plugin de Claude Code + beta de 3–5 personas).
- **D.** Producto: Editor automático de video con Claude (plugin + "doctor" de instalación + beta).

## Decisiones tomadas
- Sin login por ahora: la entrega de productos será por correo.
- DMs de Instagram con ManyChat (plan Essential) mientras Meta revisa la app M LABS (solo tiene caso de uso de WhatsApp; la verificación de acceso de El Metacho S.A.S. está en revisión desde el 28 de septiembre de 2026).
- Pagos con Bold (Cuenta Bold, persona natural); varios negocios con la misma cédula.

## Resumen de sesiones
- **2026-10-14:** portada partida, nuevo look (rojo de los videos), MLABS en subdominio, guías CLAUDE/RESEÑA/RECICLA/COMPETENCIA, leads en Redis + Telegram, SEO (JSON-LD, sitemap, robots, llms.txt), pagos con Bold en `/pagar` (compra de prueba aprobada).
- **2026-10-15:** investigación (viabilidad de productos instalables, conversión, SEO, retención). Spec de la Parte A aprobado tal cual. Plan escrito en `docs/plans/2026-10-15-mlabs-parte-a-catalogo.md` (11 tareas; el flujo de punta a punta queda listo en la tarea 4). Pendientes del dueño: precios y fechas de los dos productos, decidir si Sellame es producto (los guiones de RESEÑA lo nombran), guion 36 sin fuente (no entra como novedad), activar Web Analytics en Vercel.
- **2026-10-15 (implementación):** Parte A construida en la rama `feat/mlabs-parte-a` (12 commits, 40 pruebas con `node:test`, lint y build en verde, revisión final hecha y sus 2 puntos importantes corregidos). Incluye: contenido validado al compilar, desbloqueo por correo, preventas (`/productos/editor-automatico`, `/productos/creador-de-carruseles`), buscador, catálogo con filtros, `/novedades`, páginas `/para/*`, inicio nuevo, 404 de MLABS, SEO y Vercel Analytics. Guías nuevas: EDITOR, FICHA, CALENDARIO, CLIENTE, DICTA, FORMULA, PRECIO.
  - Pendiente del dueño: push y PR; precios y fechas de las preventas; activar Web Analytics en Vercel; clip real del editor (sin él la preventa va sin video); revisar textos de guías y productos; decidir Sellame.
  - Avisos para la sesión de VIDEOS: el guion `lab-2026-10-15-27` dice que el editor detecta cuando miras a otro lado (no lo hace: solo texto y audio); el `lab-2026-10-15-34` sugiere que el agente de Gemini ya está en el Gmail de todos (está en vista previa privada para Business/Enterprise).
  - Rendimiento: CLS 0. LCP móvil: RESEÑA 2,42 s; EDITOR 2,71 s e inicio 3,70 s pasan la meta de 2,5 s. La causa es la fuente Archivo y ya ocurría en `main`; arreglarlo es una decisión de diseño.
  - Seguridad: `npm audit` marca `next` 16.2.12 con alertas críticas (incluida `next/og`, que usa `apple-icon.js`); se arregla subiendo a 16.4.1, en una rama aparte.
- **2026-10-15 (novedades semanales):** rama `feat/novedades-semanales`. `/novedades` pasa a ediciones semanales: muestra siempre la más reciente (URL fija para el DM de NOVEDADES), destacado libre y el resto con el desbloqueo por correo de las guías (lead `novedades-AAAA-MM-DD`), archivo en `/novedades/AAAA-MM-DD`, guías relacionadas al final. Primera edición (15 de octubre): Anthropic Academy (con «¿por cuál empiezo?» por curso) y el agente de Gemini con la aclaración de vista previa privada atribuida a 9to5Google (el anuncio oficial de Google no da planes ni fecha). 56 pruebas, `eslint src` y build en verde; probado en vista de teléfono. Cómo agregar ediciones y la regla de ManyChat: `docs/novedades-semanales.md`.
  - Pendiente del dueño: push, PR y merge (publica); crear la regla NOVEDADES en ManyChat con el texto del doc; volver a verificar con Google si publica planes y fecha del agente de Gemini.
  - Aviso: `npm run lint` marca 34 errores que vienen de `.claude/worktrees/priceless-hellman-4dca31/.next` (build viejo de otra sesión), no del código; borrar esa carpeta o ignorarla en ESLint.
