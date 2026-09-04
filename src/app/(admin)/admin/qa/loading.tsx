// Skeleton a la medida de /admin/qa (a pedido del usuario 2026-09-04,
// reemplaza el genérico compartido): header con título+progreso circular,
// sidebar de categorías (grid-cols-12, col-span-4) y lista de pruebas
// (col-span-8) — misma proporción real de page.tsx.
export default function QaLoading() {
  return (
    <div className="h-full relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-10">
        {/* Header: título + progreso circular */}
        <div className="mb-8 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-[var(--border)]">
          <div className="flex flex-col gap-3">
            <div className="skeleton-shimmer w-40 h-5 rounded-full" />
            <div className="skeleton-shimmer w-64 h-8 rounded-xl" />
            <div className="skeleton-shimmer w-80 h-4 rounded-lg" />
          </div>
          <div className="skeleton-shimmer w-[240px] h-20 rounded-xl" />
        </div>

        {/* Sidebar de categorías + lista de pruebas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 flex flex-col gap-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-16 rounded-xl" />
            ))}
          </div>
          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="skeleton-shimmer w-64 h-9 rounded-lg mb-2" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
