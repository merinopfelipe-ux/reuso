export default function LeadsLoading() {
  return (
    <div className="p-6 md:p-10 w-full flex flex-col gap-6">
      <div className="skeleton-shimmer w-full max-w-[220px] h-10 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-shimmer h-20 rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-shimmer h-20 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
