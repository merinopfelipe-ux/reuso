import { SkeletonCard } from '@/components/ui/skeleton'

export default function LoadingClienteDetalle() {
  return (
    <div className="pb-6 bg-[var(--bg-primary)]">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <SkeletonCard lineas={4} />
        <SkeletonCard lineas={5} />
      </div>
    </div>
  )
}
