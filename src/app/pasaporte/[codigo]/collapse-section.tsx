'use client'

import { useState } from 'react'
import { ChevronDown as CaretDown } from '@/components/ui/icons'

export function CollapseSection({
  titulo,
  children,
  defaultOpen = true,
}: {
  titulo: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: "'Open Sans', sans-serif",
        }}
      >
        {titulo}
        <CaretDown
          size={16}
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            color: 'var(--text-secondary)',
          }}
        />
      </button>
      {open && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  )
}

import { WhatsappLogo } from '@/components/ui/whatsapp-logo'

export function ShareWhatsApp({ codigo }: { codigo: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 20px' }}>
      <button
        onClick={() => {
          const url = `${window.location.origin}/pasaporte/${codigo}`
          window.open(
            'https://wa.me/?text=' +
              encodeURIComponent('Mira el pasaporte digital de este producto reutilizado: ' + url)
          )
        }}
        className="hover-pop hover-press"
        style={{
          background: '#25D366',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '12px 24px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: "'Open Sans', sans-serif",
        }}
      >
        <WhatsappLogo size={20} color="white" />
        Compartir este pasaporte
      </button>
    </div>
  )
}
