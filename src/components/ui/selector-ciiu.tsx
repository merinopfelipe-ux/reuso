'use client'

import { useState } from 'react'
import { ChevronDown as CaretDown } from '@/components/ui/icons'
import ciiuList from '@/lib/data/ciiu.json'

const CIIU_ACTIVIDADES = ciiuList as string[]

function normalizeStr(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

interface Props {
  value: string
  onChange: (actividad: string) => void
  className?: string
}

export function SelectorCiiu({ value, onChange, className }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const q = normalizeStr(busqueda)
  const resultados = q 
    ? CIIU_ACTIVIDADES.filter(c => normalizeStr(c).includes(q)) 
    : CIIU_ACTIVIDADES

  const hayMatchExacto = q !== '' && CIIU_ACTIVIDADES.some(c => normalizeStr(c) === q)

  function elegir(act: string) {
    onChange(act)
    setAbierto(false)
    setBusqueda('')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setAbierto(v => !v); setBusqueda('') }}
        className={className ?? 'w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] flex items-center justify-between gap-2'}
      >
        <span className="truncate">{value || 'Selecciona una actividad (CIIU)'}</span>
        <CaretDown size={14} className="text-[var(--text-secondary)] flex-shrink-0" />
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-50 w-full min-w-[280px] max-h-80 flex flex-col rounded-2xl border overflow-hidden"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <input
                autoFocus
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Busca por código o palabra clave..."
                className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="overflow-y-auto flex-1">
              {resultados.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => elegir(c)}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {c}
                </button>
              ))}
              {busqueda.trim() && !hayMatchExacto && (
                <button
                  type="button"
                  onClick={() => elegir(busqueda.trim())}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)] text-[var(--color-brand)]"
                >
                  Usar &quot;{busqueda.trim()}&quot;
                </button>
              )}
              {!busqueda.trim() && resultados.length === 0 && (
                <p className="px-3.5 py-2 text-xs text-[var(--text-secondary)]">Sin resultados</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
