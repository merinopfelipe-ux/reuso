export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-[420px] flex flex-col items-center gap-6">
        <div className="skeleton-shimmer w-32 h-9 rounded-lg" />
        <div className="w-full flex flex-col gap-4">
          <div className="skeleton-shimmer w-full h-12 rounded-xl" />
          <div className="skeleton-shimmer w-full h-12 rounded-xl" />
          <div className="skeleton-shimmer w-full h-12 rounded-full mt-2" />
        </div>
      </div>
    </div>
  )
}
