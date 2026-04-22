import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'var(--bg-primary)',
        textAlign: 'center',
        gap: 16,
      }}
    >
      <Image src="/logo-icono.svg" alt="Calculadora de Reúso" width={72} height={72} priority />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        Página no encontrada
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0, maxWidth: 320, lineHeight: 1.6 }}>
        La dirección que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        style={{
          marginTop: 8,
          padding: '10px 24px',
          background: 'var(--color-brand)',
          color: '#fff',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Ir al inicio
      </Link>
    </div>
  )
}
