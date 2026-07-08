'use client'

import { DownloadIcon as Download, LeafIcon as Leaf, XIcon as X } from '@animateicons/react/lucide'

interface Props {
  url: string
  onClose: () => void
}

const BRAND = '#00827C'
const TEXT_DARK = '#1A3A38'
const TEXT_MED = '#4D7C79'

export function PopupAmbiental({ url, onClose }: Props) {
  const handleDescargar = () => {
    // Abrir URL directamente
    window.open(url, '_blank')
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(71,71,71,0.4)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'relative', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 20,
        padding: '36px 32px', width: '100%', maxWidth: 440, zIndex: 1000,
        boxShadow: '0 20px 40px rgba(0,130,124,0.15)',
        textAlign: 'center'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-hover)', border: 'none', borderRadius: 8,
            cursor: 'pointer', color: 'var(--text-secondary)', transition: 'background 0.2s'
          }}
          className="hover-rotate-90 hover-press"
        >
          <X size={16} />
        </button>

        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(56,185,142,0.15)', color: '#38B98E',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <Leaf size={28} />
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 700, color: TEXT_DARK, margin: '0 0 12px', lineHeight: 1.3 }}>
          Cuidar el planeta es un compromiso de todos
        </h3>
        
        <p style={{ fontSize: 14, color: TEXT_MED, margin: '0 0 28px', lineHeight: 1.6 }}>
          Este documento cuenta con un <strong>Sello de Seguridad Digital y verificación QR</strong> que nosotros usamos para proteger tus datos y garantizar que nunca sean alterados.
          <br /><br />
          No es necesario imprimirlo. Úsalo y compártelo de forma 100% digital.
        </p>

        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          <button
            onClick={handleDescargar}
            style={{
              padding: '14px 20px', background: BRAND, color: '#FFFFFF',
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'transform 0.1s, opacity 0.2s', boxShadow: '0 4px 12px rgba(0,130,124,0.2)'
            }}
            className="hover-download"
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Download size={18} /> Descargar PDF
          </button>
          
          <button
             onClick={onClose}
             style={{ padding: '10px', background: 'transparent', border: 'none', color: TEXT_MED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
             Prefiero no descargarlo
          </button>
        </div>
      </div>
    </div>
  )
}
