// almacen-memoria.js — misma forma que almacen.js, para pruebas.
export function almacenMemoria() {
  const pedidos = new Map(), contadores = new Map();
  const copia = (x) => (x ? JSON.parse(JSON.stringify(x)) : null);
  return {
    leer: async (id) => copia(pedidos.get(id)),
    guardar: async (p) => void pedidos.set(p.id, copia(p)),
    borrar: async (id) => void pedidos.delete(id),
    listar: async () => [...pedidos.values()].map(copia).sort((x, y) => y.creado.localeCompare(x.creado)),
    contador: async (k) => contadores.get(k) || 0,
    sumar: async (k) => { const n = (contadores.get(k) || 0) + 1; contadores.set(k, n); return n; },
    borrarClave: async (k) => void contadores.delete(k),
  };
}
