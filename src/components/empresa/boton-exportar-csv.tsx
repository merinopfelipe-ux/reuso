'use client'

import { Download } from '@/components/ui/icons'
import type { Plan } from '@/types'

interface Props {
  plan: Plan
}

const BRAND = '#00827C'

export default function BotonExportarCSV({ plan }: Props) {
  const habilitado = plan === 'ilimitado'

  function handleClick() {
    if (!habilitado) return
    window.location.href = '/api/empresa/exportar-csv'
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleClick}
        disabled={!habilitado}
        title={habilitado ? 'Exportar cálculos a CSV' : 'Solo disponible en plan Impacto Ilimitado'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          borderRadius: 8,
          border: `1.5px solid ${habilitado ? BRAND : 'rgba(0,130,124,0.3)'}`,
          background: 'transparent',
          color: habilitado ? BRAND : 'rgba(0,130,124,0.4)',
          fontSize: 14,
          fontWeight: 600,
          cursor: habilitado ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
          userSelect: 'none',
        }}
        className={habilitado ? 'hover-download hover-press' : ''}
      >
        <Download size={16} />
        Exportar CSV
        {!habilitado && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            background: 'rgba(0,130,124,0.1)',
            color: 'rgba(0,130,124,0.5)',
            borderRadius: 4,
            padding: '1px 6px',
          }}>
            Ilimitado
          </span>
        )}
      </button>
    </div>
  )
}
