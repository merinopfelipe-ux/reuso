'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

// Popover genérico botón+panel — renderiza el panel vía portal a document.body
// con posición fija calculada del botón, en vez de absolute dentro del elemento
// (queda atrapado dentro del `overflow-x-auto` de la tabla, obligando a hacer
// scroll adentro de la tabla para verlo completo — bug real reportado). Se cierra
// con clic fuera, Escape o al elegir una acción. Scrollear la página o un
// contenedor NUNCA lo cierra: lo reposiciona.
//
// `children` puede ser un nodo o una función `(cerrar) => nodo`, para que un
// menú cierre el panel al elegir una opción.
export function Popover({
  trigger,
  children,
  ancho = 260,
  alinear = 'right',
}: {
  trigger: (abrir: () => void, abierto: boolean) => React.ReactNode
  children: React.ReactNode | ((cerrar: () => void) => React.ReactNode)
  ancho?: number
  alinear?: 'left' | 'right'
}) {
  const [abierto, setAbierto] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [montado, setMontado] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMontado(true), [])

  // Recalcula la posición del panel a partir del botón que lo abrió — se usa al
  // abrir Y de nuevo en cada scroll (nunca para cerrarlo).
  function posicionar() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const left = alinear === 'right' ? rect.right - ancho : rect.left
    setCoords({ top: rect.bottom + 6, left: Math.max(8, Math.min(left, window.innerWidth - ancho - 8)) })
  }

  function alternar() {
    if (!abierto) posicionar()
    setAbierto(v => !v)
  }

  function cerrar() {
    setAbierto(false)
  }

  useEffect(() => {
    if (!abierto) return
    function onClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (panelRef.current?.contains(e.target as Node)) return
      setAbierto(false)
    }
    function onScroll(e: Event) {
      if (panelRef.current?.contains(e.target as Node)) return
      posicionar()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const contenido = typeof children === 'function' ? children(cerrar) : children

  return (
    <div className="relative inline-block" ref={triggerRef}>
      {trigger(alternar, abierto)}
      {abierto && montado && coords && createPortal(
        <div
          ref={panelRef}
          className="fixed rounded-btn border p-3 z-9999 bg-(--bg-card) border-(--border) shadow-lg"
          style={{ width: ancho, top: coords.top, left: coords.left }}
        >
          {contenido}
        </div>,
        document.body
      )}
    </div>
  )
}
