# elmetacho-web (elmetacho.com + mlabs.elmetacho.com)

Web de El Metacho y de MLABS (su agencia y "Platzi propio"). Next.js 16 (App Router), React 19, Tailwind v4. Despliega Vercel al hacer push a `main`.
Habla de tú al dueño (colombiano), nunca de vos.

## Reglas de trabajo
1. **La verdad pesa más que la validación.** Si algo está endeble, dilo.
2. **Verifica antes de afirmar** precios, políticas, APIs, versiones o límites (busca información actual). Si no pudiste verificar algo, dilo. Si el pedido choca con una buena práctica, dilo; no lo cambies en silencio.
3. **Anti-perfeccionismo:** primero el flujo completo de punta a punta, aunque sea feo. Rebanadas verticales (pantalla → lógica → datos → integración) antes de pulir. Si el dueño pide estética antes de tiempo, recuérdaselo.
4. **Método:** brainstorming → spec escrito (`docs/superpowers/specs/`) → plan por tareas (`docs/plans/`) → pruebas primero → verificación con evidencia antes de decir "listo".
5. **Cambios:** rama nueva desde `main` → pruebas → commits pequeños en español → el dueño hace el push → PR → el dueño aprueba el merge (merge = publicación).
6. **Seguridad:** nunca abras ni leas archivos de credenciales (`.env*`). Si hace falta una llave, dale al dueño el nombre de la variable y dónde pegarla (Vercel o `.env.local`).
7. **Antes de cada /clear**, actualiza `docs/BRIEF.md` (sección "Resumen de sesiones") con lo decidido, lo hecho y lo pendiente.
8. **Una sola pregunta a la vez** cuando haga falta decidir algo, con tu recomendación.

## Datos clave
- MLABS = subdominio, reescrito por host en `next.config.mjs` hacia `src/app/mlabs`. Las rutas internas de MLABS son relativas a la raíz del subdominio (`/recursos`, `/pagar`).
- Leads: `/api/lead` → Redis de Vercel (lista `mlabs:leads`) + aviso al bot de Telegram. Pagos: Bold (`/api/bold/firma`, `/api/bold/estado`; llaves `BOLD_IDENTITY_KEY` / `BOLD_SECRET_KEY`).
- Diseño: rojo #E10600, Anton (El Metacho), Archivo ancho (MLABS), papel cuadriculado. Prioridad a la vista de teléfono.
- Antes de publicar: `npm run lint` y `npm run build` sin errores; comprobar la URL en vivo.
