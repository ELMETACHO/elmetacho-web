"use client";
export default function Barra({ t }) {
  if (!t) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-3 rounded bg-black/15">
        <div className={`h-3 rounded ${t.error ? "bg-red-700" : "bg-[#E10600]"}`} style={{ width: `${t.error ? 100 : t.pct}%` }} />
      </div>
      {t.error && (
        <div className="flex items-center justify-between gap-2 text-[#E10600]">
          <span>{t.error}</span>
          <button onClick={t.reintentar} className="rounded border border-[#E10600] px-3 py-2">
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
