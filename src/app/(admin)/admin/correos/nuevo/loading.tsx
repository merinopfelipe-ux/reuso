import { SkeletonCard } from '@/components/ui/skeleton'

export default function LoadingNuevoCorreo() {
  return (
    <div className="p-6 md:p-10 w-full">
      <SkeletonCard lineas={6} />
    </div>
  )
}
