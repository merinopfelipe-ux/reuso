'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Stack } from '@phosphor-icons/react'
import type { ModuloConActivo } from '@/types'

const C = {
  brand: '#00827C',
  dark: '#1A3A38',
  mid: '#4D7C79',
  border: 'rgba(0,130,124,0.12)',
  light: 'rgba(0,130,124,0.06)',
}

export function ModulosEmpresaClient({
  empresaId,
  modulos,
}: {
  empresaId: string
  modulos: ModuloConActivo[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggle(moduloId: string, activoActual: boolean) {
    setToggling(moduloId)
    await fetch(`/api/admin/empresas/${empresaId}/modulos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modulo_id: moduloId, activo: !activoActual }),
    })
    setToggling(null)
    startTransition(() => router.refresh())
  }

  if (modulos.length === 0) {
    return (
      <p style={{ fontSize: 13, color: C.mid }}>
        No hay módulos disponibles. Crea módulos desde{' '}
        <a href="/admin/modulos" style={{ color: C.brand, fontWeight: 600 }}>Módulos</a>.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {modulos.map((m) => (
        <div key={m.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', borderRadius: 10,
          border: `1px solid ${m.activo_en_empresa ? 'rgba(0,130,124,0.25)' : C.border}`,
          background: m.activo_en_empresa ? C.light : '#fff',
          transition: 'all 0.2s',
        }}>
          <Stack size={16} color={m.activo_en_empresa ? C.brand : C.mid} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.dark }}>{m.nombre}</span>
          {m.descripcion && (
            <span style={{ fontSize: 12, color: C.mid, flex: 2 }}>{m.descripcion}</span>
          )}
          <button
            disabled={toggling === m.id}
            onClick={() => toggle(m.id, m.activo_en_empresa)}
            style={{
              padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: toggling === m.id ? 'wait' : 'pointer',
              border: 'none',
              background: m.activo_en_empresa ? C.brand : 'rgba(0,130,124,0.10)',
              color: m.activo_en_empresa ? '#fff' : C.brand,
              transition: 'all 0.2s',
              opacity: toggling === m.id ? 0.6 : 1,
            }}
          >
            {toggling === m.id ? '...' : m.activo_en_empresa ? 'Activo' : 'Inactivo'}
          </button>
        </div>
      ))}
    </div>
  )
}
