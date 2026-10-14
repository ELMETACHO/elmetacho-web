// Envía un lead a /api/lead (Redis + aviso a Telegram). Lanza un Error con un mensaje para mostrarle al usuario.
// `f` se puede reemplazar en las pruebas.
export async function enviarLead(datos, f = fetch) {
  const r = await f("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "No pudimos guardar tus datos.");
  return true;
}
