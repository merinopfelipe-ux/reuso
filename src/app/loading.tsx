import Image from 'next/image'

export default function Loading() {
  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--bg-primary)', 
      zIndex: 9999 
    }}>
      <Image 
        src="/logo-icono.svg" 
        alt="Cargando..." 
        width={80} 
        height={80} 
        priority
        className="pulse-logo logo-dark-invert"
        style={{ objectFit: 'contain' }}
      />
    </div>
  )
}
