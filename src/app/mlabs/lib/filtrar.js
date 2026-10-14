// Filtro del catálogo: null o vacío = sin filtrar por ese campo.
export const filtrar = (items, { publico, tipo } = {}) =>
  items.filter((x) => (!publico || x.publicos?.includes(publico)) && (!tipo || x.tipo === tipo));
