import { SkeletonLista } from '@/components/ui/skeleton'

export default function LoadingAdminCorreos() {
  return (
    <div className="p-6 md:p-10 w-full">
      <SkeletonLista filas={4} />
    </div>
  )
}
