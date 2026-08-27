export default function CategoriasLoading() {
  return (
    <div className="p-6 md:p-10 w-full flex flex-col gap-6">
      <div className="skeleton-shimmer w-full max-w-[280px] h-10 rounded-xl" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-shimmer h-14 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
