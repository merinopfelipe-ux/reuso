import { LogoSpinner } from '@/components/ui/logo-spinner'

export default function LoadingCotizacionDetalle() {
  return (
    <div className="flex items-center justify-center bg-[var(--bg-primary)]" style={{ minHeight: '60vh' }}>
      <LogoSpinner size={96} />
    </div>
  )
}
