'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@/components/ui/icons'

interface Props {
  imagenUrl: string | null
  onClose: () => void
}

// Visor de imagen ampliada, reutilizable en cualquier pantalla — antes vivía
// solo como función local en propuesta-client.tsx. Nunca usar bg-black/NN
// puro (regla CLAUDE.md): el overlay usa Negro Lurdes #474747 con opacidad.
export function ModalImagenZoom({ imagenUrl, onClose }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!imagenUrl) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imagenUrl, onClose])

  if (!imagenUrl || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 bg-[#474747]/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[85vh] inline-flex items-center justify-center animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-[#474747]/75 hover:bg-[#474747]/95 text-white flex items-center justify-center border border-white/25 shadow-xl transition-all duration-150 hover:scale-105 active:scale-95 flex-shrink-0 cursor-pointer"
          aria-label="Cerrar imagen"
        >
          <X size={18} className="text-white flex-shrink-0" sinAnimacion />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          draggable={false}
          src={imagenUrl}
          alt="Vista ampliada"
          className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl select-none"
        />
      </div>
    </div>,
    document.body
  )
}
