'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft as CaretLeft, ChevronRight as CaretRight, ChevronDown as CaretDown } from '@/components/ui/icons'

// Paginado único y canónico de la plataforma — mismo look en todas partes
// (antes cada tabla tenía su propio "Anterior/Siguiente" con estilos
// distintos). Números de página siempre visibles (no solo Anterior/
// Siguiente), la actual resaltada con recuadro, más un selector de "N por
// página".
//
// El dropdown de "N por página" se monta mediante createPortal en document.body
// para evitar que contenedores con overflow-x-auto, overflow-hidden o apilamiento
// z-index de las tablas recorten o bloqueen los clics en las opciones.

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
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const [montado, setMontado] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMontado(true)
  }, [])

  function reposicionar() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const anchoMenu = 140
    // Alinear con el borde derecho del botón, asegurando que no se salga de la pantalla
    const left = Math.max(8, Math.min(window.innerWidth - anchoMenu - 8, rect.right - anchoMenu))

    // Si hay espacio arriba (al menos 90px), abrir hacia arriba (bottom-full)
    if (rect.top >= 90) {
      setCoords({ bottom: window.innerHeight - rect.top + 6, left })
    } else {
      setCoords({ top: rect.bottom + 6, left })
    }
  }

  function toggleAbierto() {
    if (!abierto) {
      reposicionar()
      setAbierto(true)
    } else {
      setAbierto(false)
    }
  }

  useEffect(() => {
    if (!abierto) return
    function onScrollResize() {
      reposicionar()
    }
    window.addEventListener('resize', onScrollResize)
    window.addEventListener('scroll', onScrollResize, true)
    return () => {
      window.removeEventListener('resize', onScrollResize)
      window.removeEventListener('scroll', onScrollResize, true)
    }
  }, [abierto])

  if (totalPages <= 1 && !onPorPaginaChange) return null

  const valorActual = porPagina ? Number(porPagina) : 25

  return (
    <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-2 py-1.5 rounded-input text-sm font-semibold hover:bg-(--bg-hover) disabled:cursor-not-allowed disabled:hover:bg-transparent"
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
          aria-label={`Página ${p}`}
          aria-current={p === page ? 'page' : undefined}
          className="min-w-[30px] h-[30px] px-1.5 rounded-input text-sm font-bold hover:bg-(--bg-hover)"
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
        className="flex items-center gap-1 px-2 py-1.5 rounded-input text-sm font-semibold hover:bg-(--bg-hover) disabled:cursor-not-allowed disabled:hover:bg-transparent"
        style={{ color: page >= totalPages ? 'var(--text-placeholder)' : 'var(--color-brand)' }}
      >
        Siguiente <CaretRight size={16} sinAnimacion />
      </button>

      {onPorPaginaChange && porPagina && (
        <div className="relative ml-1">
          <button
            ref={btnRef}
            type="button"
            onClick={toggleAbierto}
            className="flex items-center gap-1 px-2 py-1.5 rounded-input text-sm font-bold hover:bg-(--bg-hover)"
            style={{ color: 'var(--color-brand)' }}
          >
            {valorActual} por página <CaretDown size={14} sinAnimacion />
          </button>
          {abierto && montado && coords && typeof document !== 'undefined' && createPortal(
            <>
              {/* Backdrop transparente para cerrar al hacer clic afuera sin interferencias */}
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setAbierto(false)}
                aria-hidden="true"
              />
              <div
                role="listbox"
                aria-label="Opciones de elementos por página"
                style={{
                  position: 'fixed',
                  ...(coords.bottom !== undefined ? { bottom: coords.bottom } : { top: coords.top }),
                  left: coords.left,
                  width: 140,
                  zIndex: 9999,
                }}
                className="rounded-xl border p-1 bg-(--bg-card) border-(--border) shadow-xl"
              >
                {/* Solo se muestran las opciones a las que SÍ se puede cambiar
                    — la que ya está activa no aparece en su propia lista,
                    directriz explícita del usuario. */}
                {OPCIONES_POR_PAGINA.filter(n => Number(n) !== valorActual).map(n => (
                  <button
                    key={n}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onPorPaginaChange(n)
                      setAbierto(false)
                    }}
                    className="block w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-(--text-primary) hover:bg-(--bg-hover) cursor-pointer transition-colors"
                  >
                    {n} por página
                  </button>
                ))}
              </div>
            </>,
            document.body
          )}
        </div>
      )}
    </div>
  )
}
