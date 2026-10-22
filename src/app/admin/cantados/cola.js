// Cola de PATCH en serie para las pantallas del admin: el servidor lee y escribe el pedido
// completo, así que los guardados van de a uno. `ref` es un useRef(Promise.resolve()).
export function encolarPatch(ref, url, cuerpo) {
  const paso = ref.current.then(async () => {
    const r = await fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || "No se pudo guardar."), { status: r.status });
    return d;
  });
  ref.current = paso.catch(() => {});
  return paso;
}

// Guarda en fila y devuelve SIEMPRE un resultado { ok, error? } (nunca lanza); lo deja en `ultimoRef`
// para que quien cierre la pantalla decida por el resultado y no por una bandera que se pone después.
export function guardarEnFila(colaRef, ultimoRef, url, cuerpo, alFallar) {
  const p = encolarPatch(colaRef, url, cuerpo).then(
    () => ({ ok: true }),
    (error) => { alFallar?.(error); return { ok: false, error }; },
  );
  ultimoRef.current = p;
  return p;
}

// Espera a que no quede ningún guardado en vuelo y devuelve el resultado del último
// (el último guardado lleva el estado completo: si salió bien, los fallos anteriores ya no importan).
export async function esperarGuardado(ultimoRef) {
  let u, r = { ok: true };
  do {
    u = ultimoRef.current;
    if (u) r = await u;
  } while (u !== ultimoRef.current);
  return r;
}
