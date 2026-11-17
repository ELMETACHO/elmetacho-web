import Copiar from "../recursos/[slug]/Copiar";

// Un bloque de contenido de una guía: { p }, { lista }, { prompt }, { tabla } u { ojo }.
export default function Bloque({ b }) {
  if (b.p) return <p>{b.p}</p>;
  if (b.lista)
    return (
      <ul>
        {b.lista.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    );
  if (b.prompt)
    return (
      <div className="m-prompt">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <b style={{ fontSize: 14, color: "var(--m-gris)" }}>Prompt</b>
          <Copiar texto={b.prompt} />
        </div>
        {b.prompt}
      </div>
    );
  if (b.tabla)
    return (
      <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
        {b.tabla.map(([mal, bien]) => (
          <div key={mal} style={{ border: "1px solid var(--m-borde)", borderRadius: 16, padding: "12px 14px", fontSize: 16.5 }}>
            <p style={{ color: "var(--m-gris)", textDecoration: "line-through", margin: 0 }}>✕ {mal}</p>
            <p style={{ fontWeight: 650, color: "var(--m-tinta)", margin: "6px 0 0" }}>✓ {bien}</p>
          </div>
        ))}
      </div>
    );
  if (b.ojo)
    return (
      <p className="m-ojo">
        <strong>Ojo: </strong>
        {b.ojo}
      </p>
    );
  return null;
}
