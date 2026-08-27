'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft as CaretLeft, ChevronRight as CaretRight, ChevronDown as CaretDown } from '@/components/ui/icons'

// Paginado único y canónico de la plataforma — mismo look en todas partes
// (antes cada tabla tenía su propio "Anterior/Siguiente" con estilos
// distintos). Números de página siempre visibles (no solo Anterior/
// Siguiente), la actual resaltada con recuadro, más un selector de "N por
// página". Directriz explícita del usuario, 2026-08-17.

const OPCIONES_POR_PAGINA = [25, 50, 100]

export interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  porPagina?: number
  onPorPaginaChange?: (n: number) => void
}

function paginasAMostrar(page: number, total: number): (number | '...')[] {
  if (total <= 11) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set<number>([1, 2, total - 1, total, page - 1, page, page + 1])
  const ordenadas = Array.from(set).filter(p => p >= 1 && p <= total).sort((a, b) => a - b)
  const resultado: (number | '...')[] = []
  let anterior = 0
  for (const p of ordenadas) {
    if (anterior && p - anterior > 1) resultado.push('...')
    resultado.push(p)
    anterior = p
  }
  return resultado
}

export function Pagination({ page, totalPages, onPageChange, porPagina, onPorPaginaChange }: PaginationProps) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (totalPages <= 1 && !onPorPaginaChange) return null

  return (
    <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-2 py-1.5 rounded-[8px] text-sm font-semibold hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:hover:bg-transparent"
        style={{ color: page <= 1 ? 'var(--text-placeholder)' : 'var(--color-brand)' }}
      >
        <CaretLeft size={16} sinAnimacion /> Anterior
      </button>

      {paginasAMostrar(page, totalPages).map((p, i) => p === '...' ? (
        <span key={`e${i}`} className="px-1 text-sm" style={{ color: 'var(--text-placeholder)' }}>…</span>
      ) : (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className="min-w-[30px] h-[30px] px-1.5 rounded-[8px] text-sm font-bold hover:bg-[var(--bg-hover)]"
          style={p === page
            ? { color: 'var(--color-brand)', border: '1.5px solid var(--color-brand)', background: 'var(--color-brand-light)' }
            : { color: 'var(--color-brand)' }}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-2 py-1.5 rounded-[8px] text-sm font-semibold hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:hover:bg-transparent"
        style={{ color: page >= totalPages ? 'var(--text-placeholder)' : 'var(--color-brand)' }}
      >
        Siguiente <CaretRight size={16} sinAnimacion />
      </button>

      {onPorPaginaChange && porPagina && (
        <div className="relative ml-1" ref={ref}>
          <button
            type="button"
            onClick={() => setAbierto(v => !v)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-[8px] text-sm font-bold hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--color-brand)' }}
          >
            {porPagina} por página <CaretDown size={14} sinAnimacion />
          </button>
          {abierto && (
            <div className="absolute right-0 top-full mt-1 rounded-[10px] border p-1 z-30 bg-[var(--bg-card)] border-[var(--border)] shadow-lg">
              {/* Solo se muestran las opciones a las que SÍ se puede cambiar
                  — la que ya está activa no aparece en su propia lista,
                  directriz explícita del usuario. */}
              {OPCIONES_POR_PAGINA.filter(n => n !== porPagina).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { onPorPaginaChange(n); setAbierto(false) }}
                  className="block w-full text-left px-3 py-1.5 rounded-[6px] text-sm text-[var(--text-primary)]"
                >
                  {n} por página
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
