'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Question } from '@/components/ui/icons'

interface Props {
  texto: string
  className?: string
  posicion?: 'arriba' | 'abajo'
  centrado?: boolean
}

interface Coords {
  top?: number
  bottom?: number
  left: number
}

/**
 * Ícono de información con tooltip flotante interactivo (hover en desktop y tap en móvil).
 * Se renderiza mediante Portal directamente en document.body con position: fixed para
 * garantizar que NUNCA quede recortado por tablas scrolleables, desbordamientos o modales.
 */
export function TooltipInfo({ texto, className, posicion = 'arriba', centrado = true }: Props) {
  const [activo, setActivo] = useState(false)
  const [montado, setMontado] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(null)
  const containerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const abiertoPorTeclado = useRef(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  const actualizarCoords = useCallback(() => {
    if (!containerRef.current || typeof window === 'undefined') return
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      setActivo(false)
      return
    }

    const vw = window.innerWidth
    const vh = window.innerHeight
    const tooltipWidth = Math.min(260, vw - 32)
    const margin = 16

    let left = rect.left + rect.width / 2 - tooltipWidth / 2
    if (left < margin) left = margin
    if (left + tooltipWidth > vw - margin) left = vw - tooltipWidth - margin

    const espacioArriba = rect.top
    const preferirAbajo = posicion === 'abajo' || espacioArriba < 90

    if (preferirAbajo) {
      setCoords({ top: rect.bottom + 6, left })
    } else {
      setCoords({ bottom: vh - rect.top + 6, left })
    }
  }, [posicion])

  useEffect(() => {
    if (!activo) return
    actualizarCoords()

    function handleScrollOResize() {
      actualizarCoords()
    }

    function handleClickAfuera(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(target)
      ) {
        setActivo(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // En captura y deteniendo la propagación: con un tooltip abierto dentro de un Modal,
        // Escape cierra solo el tooltip y un segundo Escape cierra el Modal.
        e.stopPropagation()
        setActivo(false)
      }
    }

    window.addEventListener('scroll', handleScrollOResize, true)
    window.addEventListener('resize', handleScrollOResize)
    document.addEventListener('mousedown', handleClickAfuera)
    document.addEventListener('touchstart', handleClickAfuera)
    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('scroll', handleScrollOResize, true)
      window.removeEventListener('resize', handleScrollOResize)
      document.removeEventListener('mousedown', handleClickAfuera)
      document.removeEventListener('touchstart', handleClickAfuera)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [activo, actualizarCoords])

  if (!texto) return null

  // Fondo del tooltip: en día --text-primary es Negro Lurdes (#474747), porque check-backgrounds
  // prohíbe el hex fijo como fondo. En noche sube a nivel 2 (--bg-input), nunca más oscuro que la página.
  return (
    <span
      ref={containerRef}
      className={`group/tt relative inline-flex shrink-0 cursor-pointer ${className ?? ''}`}
      onClick={(e) => {
        e.stopPropagation()
        setActivo(prev => {
          const proximo = !prev
          if (proximo) actualizarCoords()
          return proximo
        })
      }}
      onMouseEnter={() => {
        actualizarCoords()
        setActivo(true)
      }}
      onMouseLeave={() => setActivo(false)}
      role="button"
      tabIndex={0}
      aria-expanded={activo}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          abiertoPorTeclado.current = true
          const proximo = !activo
          if (proximo) actualizarCoords()
          setActivo(proximo)
        }
      }}
      onFocus={(e) => {
        if (e.currentTarget.matches(':focus-visible')) {
          abiertoPorTeclado.current = true
          actualizarCoords()
          setActivo(true)
        }
      }}
      onBlur={() => {
        // Solo cierra si se abrió con teclado: con mouse, perder el foco al hacer clic en el propio tooltip no debe cerrarlo.
        if (abiertoPorTeclado.current) {
          abiertoPorTeclado.current = false
          setActivo(false)
        }
      }}
      aria-label={texto}
    >
      <Question size={13} className="cursor-help opacity-70 hover:opacity-100 transition-opacity" sinAnimacion />

      {activo && montado && coords && createPortal(
        <span
          ref={tooltipRef}
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: coords.top !== undefined ? `${coords.top}px` : undefined,
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            left: `${coords.left}px`,
            zIndex: 99999,
            width: 'min(260px, calc(100vw - 32px))',
          }}
          className={`pointer-events-auto rounded-xl bg-(--text-primary) dark:bg-(--bg-input) border border-white/20 text-white px-3 py-2 text-[12px] font-medium leading-snug shadow-[0_12px_32px_rgba(71,71,71,0.5)] backdrop-blur-md transition-all duration-150 ${
            centrado ? 'text-center' : 'text-left'
          }`}
        >
          {texto}
        </span>,
        document.body
      )}
    </span>
  )
}
