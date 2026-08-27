export default function EmpresasLoading() {
  return (
    <div className="p-6 md:p-10 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="skeleton-shimmer w-full max-w-[220px] h-10 rounded-xl" />
        <div className="skeleton-shimmer w-32 h-10 rounded-full" />
      </div>
      <div className="skeleton-shimmer flex-1 min-h-[400px] rounded-2xl" />
    </div>
  )
}
