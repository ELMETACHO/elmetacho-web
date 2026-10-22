"use client";
export default function Barra({ t }) {
  if (!t) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="adm-pista">
        <div className={`adm-relleno ${t.error ? "error" : ""}`} style={{ width: `${t.error ? 100 : t.pct}%` }} />
      </div>
      {t.error && (
        <div className="adm-error flex items-center justify-between gap-2">
          <span>{t.error}</span>
          <button onClick={t.reintentar} className="adm-btn peligro chico">
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
