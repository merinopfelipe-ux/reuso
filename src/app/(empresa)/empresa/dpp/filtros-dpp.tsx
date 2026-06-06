'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export function FiltrosDpp({ estadoActual, q }: { estadoActual?: string; q?: string }) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState(q ?? '')
  const [, startTransition] = useTransition()

  function aplicarFiltros(nuevoEstado?: string, nuevaBusqueda?: string) {
    const params = new URLSearchParams()
    const est = nuevoEstado !== undefined ? nuevoEstado : estadoActual
    const bus = nuevaBusqueda !== undefined ? nuevaBusqueda : busqueda
    if (est) params.set('estado', est)
    if (bus) params.set('q', bus)
    startTransition(() => {
      router.push('/empresa/dpp' + (params.toString() ? '?' + params.toString() : ''))
    })
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="Busca por nombre..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros(undefined, busqueda)}
        style={{
          flex: '1 1 200px', padding: '9px 12px', borderRadius: 8, fontSize: 14,
          border: '1px solid var(--border)', background: 'var(--bg-secondary)',
          color: 'var(--text-primary)', fontFamily: "'Open Sans', sans-serif", outline: 'none',
        }}
      />
      <select
        value={estadoActual ?? ''}
        onChange={(e) => aplicarFiltros(e.target.value || undefined, undefined)}
        style={{
          padding: '9px 12px', borderRadius: 8, fontSize: 14,
          border: '1px solid var(--border)', background: 'var(--bg-secondary)',
          color: 'var(--text-primary)', fontFamily: "'Open Sans', sans-serif", cursor: 'pointer',
        }}
      >
        <option value="">Todos los estados</option>
        <option value="activo">Activo</option>
        <option value="en_reuso">En reúso</option>
        <option value="disposicion_final">Disposición final</option>
        <option value="archivado">Archivado</option>
      </select>
      {(estadoActual || q) && (
        <button
          onClick={() => { setBusqueda(''); aplicarFiltros('', '') }}
          style={{
            padding: '9px 14px', borderRadius: 8, fontSize: 13,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: "'Open Sans', sans-serif",
          }}
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
