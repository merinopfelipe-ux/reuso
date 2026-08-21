import { Skeleton, SkeletonCard, SkeletonLista } from '@/components/ui/skeleton'

export default function LoadingCotizador() {
  return (
    <div className="pb-6 bg-[var(--bg-primary)]">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1.5fr_2fr] gap-6 mb-6">
          <SkeletonCard lineas={5} className="h-[280px]" />
          <SkeletonCard lineas={5} className="h-[280px]" />
          <SkeletonCard lineas={5} className="h-[280px]" />
        </div>
        <Skeleton className="max-w-[280px] mb-4" style={{ height: 40 }} />
        <SkeletonLista filas={3} />
      </div>
    </div>
  )
}
