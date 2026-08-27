export default function AdminLoading() {
  return (
    <div className="p-6 md:p-10 w-full flex flex-col gap-6 md:gap-8">
      {/* Título y acciones */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="skeleton-shimmer w-full max-w-[300px] h-10 md:h-12 rounded-xl" />
        <div className="flex gap-3">
          <div className="skeleton-shimmer w-10 h-10 rounded-full" />
          <div className="skeleton-shimmer w-10 h-10 rounded-full" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-shimmer h-28 md:h-36 rounded-2xl" />
        ))}
      </div>

      {/* Tabla principal */}
      <div className="skeleton-shimmer flex-1 min-h-[320px] md:min-h-[400px] rounded-2xl" />
    </div>
  )
}
