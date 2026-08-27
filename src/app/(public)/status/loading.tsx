import { LogoSpinner } from '@/components/ui/logo-spinner'

export default function StatusLoading() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      zIndex: 9999,
    }}>
      <LogoSpinner />
    </div>
  )
}
