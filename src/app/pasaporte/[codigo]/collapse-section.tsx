'use client'

import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'

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
        <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor">
          <path d="M187.58,144.84l-32-16a8,8,0,0,0-8,.5l-14.69,9.8a40.55,40.55,0,0,1-16-16l9.8-14.69a8,8,0,0,0,.5-8l-16-32A8,8,0,0,0,104,64a40,40,0,0,0-40,40,88.1,88.1,0,0,0,88,88,40,40,0,0,0,40-40A8,8,0,0,0,187.58,144.84ZM152,176a72.08,72.08,0,0,1-72-72,24,24,0,0,1,19.29-23.54l11.48,22.95L101,117.11a8,8,0,0,0-.73,7.65,56.45,56.45,0,0,0,31,31,8,8,0,0,0,7.65-.73l13.7-9.19,22.95,11.48A24,24,0,0,1,152,176ZM128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216l12.47-37.4a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Z" />
        </svg>
        Compartir este pasaporte
      </button>
    </div>
  )
}
