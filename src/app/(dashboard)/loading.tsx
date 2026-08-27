export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-10 w-full flex flex-col gap-6 md:gap-8">
      {/* Saludo */}
      <div className="skeleton-shimmer w-full max-w-[280px] h-9 rounded-xl" />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-shimmer h-24 md:h-32 rounded-2xl" />
        ))}
      </div>

      {/* Calculadora */}
      <div className="skeleton-shimmer w-full h-64 md:h-80 rounded-2xl" />

      {/* Historial */}
      <div className="skeleton-shimmer flex-1 min-h-[280px] rounded-2xl" />
    </div>
  )
}
