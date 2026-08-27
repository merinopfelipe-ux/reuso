export default function EmpresaLoading() {
  return (
    <div className="flex flex-col items-center justify-center bg-[var(--bg-primary)]" style={{ minHeight: '60vh' }}>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="skeleton-shimmer w-full sm:max-w-[400px] h-11 md:h-12 rounded-full" />
        <div className="skeleton-shimmer w-full sm:w-[150px] h-10 rounded-full" />
      </div>

      {/* Banner de impacto */}
      <div className="skeleton-shimmer w-full h-48 md:h-[260px] rounded-2xl" />

      {/* Contenido en dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 md:gap-8">
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-shimmer h-20 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton-shimmer h-64 lg:h-[400px] rounded-2xl" />
      </div>
      </div>
    </div>
  )
}
