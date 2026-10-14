// Texto comparable: sin tildes (ñ → n), en minúsculas y sin espacios en los extremos. "RESEÑA" = "resena".
export const normalizar = (s) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
