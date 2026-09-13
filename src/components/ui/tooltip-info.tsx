'use client'

import { useState, useRef, useEffect } from 'react'
import { Question } from '@/components/ui/icons'

interface Props {
  texto: string
  className?: string
  posicion?: 'arriba' | 'abajo'
  centrado?: boolean
}

/**
 * Ícono de información con tooltip flotante interactivo (hover y click/tap).
 * Incluye fallback accesible por atributo title y control de estado para
 * dispositivos táctiles y vistas de tablas con desbordamiento.
 */
export function TooltipInfo({ texto, className, posicion = 'arriba', centrado = false }: Props) {
  const [activo, setActivo] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!activo) return
    function handleClickAfuera(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivo(false)
      }
    }
    document.addEventListener('mousedown', handleClickAfuera)
    document.addEventListener('touchstart', handleClickAfuera)
    return () => {
      document.removeEventListener('mousedown', handleClickAfuera)
      document.removeEventListener('touchstart', handleClickAfuera)
    }
  }, [activo])

  if (!texto) return null

  const posClasses = posicion === 'abajo'
    ? 'top-full mt-1.5'
    : 'bottom-full mb-1.5'

  const alineacionHoriz = centrado
    ? 'left-1/2 -translate-x-1/2 text-center'
    : 'left-0 sm:left-1/2 sm:-translate-x-1/2 text-left'

  return (
    <span
      ref={containerRef}
      className={`group/tt relative inline-flex flex-shrink-0 cursor-pointer ${className ?? ''}`}
      onClick={(e) => {
        e.stopPropagation()
        setActivo(prev => !prev)
      }}
      onMouseEnter={() => setActivo(true)}
      onMouseLeave={() => setActivo(false)}
      title={texto}
      aria-label={texto}
    >
      <Question size={13} className="cursor-help opacity-70 hover:opacity-100 transition-opacity" sinAnimacion />
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${alineacionHoriz} ${posClasses} z-[100] w-48 sm:w-56 rounded-lg bg-[var(--text-primary)] px-2.5 py-1.5 text-[11px] font-normal leading-snug text-[var(--bg-primary)] shadow-xl transition-all duration-150 ${
          activo ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
        }`}
      >
        {texto}
      </span>
    </span>
  )
}
