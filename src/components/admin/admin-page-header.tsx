'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
} from 'lucide-react'

interface AdminPageHeaderProps {
  titulo: string
  subtitulo?: string
  accion?: React.ReactNode
  showBack?: boolean
}

export function AdminPageHeader({ titulo, subtitulo, accion, showBack = false }: AdminPageHeaderProps) {
  const router = useRouter()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div>
        {showBack ? (
          <h1
            onClick={() => router.back()}
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={22} />
            {titulo}
          </h1>
        ) : (
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
            {titulo}
          </h1>
        )}
        {subtitulo && (
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            {subtitulo}
          </p>
        )}
      </div>
      {accion && <div>{accion}</div>}
    </div>
  )
}
