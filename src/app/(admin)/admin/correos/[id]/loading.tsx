import { SkeletonCard } from '@/components/ui/skeleton'

export default function LoadingCorreoDetalle() {
  return (
    <div className="p-6 md:p-10 w-full flex flex-col gap-4">
      <SkeletonCard lineas={3} />
      <SkeletonCard lineas={5} />
    </div>
  )
}
