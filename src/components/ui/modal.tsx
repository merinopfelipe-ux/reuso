'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X as IconoX, TriangleAlert } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

export interface UnifiedModalProps {
  abierto: boolean
  onClose: () => void
  titulo: string
  descripcion?: React.ReactNode
  icono?: React.ReactNode
  colorIcono?: string
  textoConfirmar?: string
  textoCancelar?: string
  varianteConfirmar?: 'error' | 'brand'
  onConfirmar?: () => void
  onCancelar?: () => void
  children?: React.ReactNode
  // 'xs' (max-w-xs) para popups muy compactos, 'sm' (default, max-w-sm) para confirmaciones simples.
  // 'lg' (max-w-2xl) para formularios con más de un campo o layout de dos columnas, 'xl' (max-w-3xl) para modales amplios.
  ancho?: 'xs' | 'sm' | 'lg' | 'xl'
  tituloCentrado?: boolean
  // Excepción deliberada a "siempre dos acciones": solo para contenido puramente
  // informativo (ej. un catálogo para explorar), sin ninguna decisión que confirmar
  // o cancelar. El cierre sigue disponible por la X, Escape o clic afuera.
  sinPie?: boolean
}

/**
 * Componente Único y Unificado de Modal / Popup (Sistema de Diseño Reúso)
 * - Renderiza vía Portal en document.body para GARANTIZAR cobertura 100% de la pantalla (header, sidebar y menú).
 * - Ícono personalizable.
 * - Botón de cierre "X" arriba a la derecha.
 * - Siempre dos botones de acción claros abajo.
 */
export function Modal({
  abierto,
  onClose,
  titulo,
  descripcion,
  icono = <TriangleAlert size={24} />,
  colorIcono,
  textoConfirmar = 'Aceptar',
  textoCancelar = 'Cancelar',
  varianteConfirmar = 'brand',
  onConfirmar,
  onCancelar,
  children,
  ancho = 'sm',
  tituloCentrado = false,
  sinPie = false,
}: UnifiedModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Bug real reportado 2026-09-05: con el modal abierto, la página de atrás
  // seguía scrolleando con la rueda del mouse — el usuario terminaba
  // moviendo el fondo en vez del contenido del popup. Bloqueamos el scroll
  // del body mientras el modal está abierto, y restauramos el valor
  // original (no un '' a ciegas, por si algo más ya lo había tocado) al
  // cerrar o desmontar.
  useEffect(() => {
    if (!abierto) return
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflowPrevio }
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [abierto, onClose])

  if (!abierto || !mounted) return null

  const contenidoModal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[#474747]/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <div
        className={`relative w-full ${ancho === 'xl' ? 'max-w-3xl' : ancho === 'lg' ? 'max-w-2xl' : ancho === 'xs' ? 'max-w-xs' : 'max-w-sm'} max-h-[90vh] flex flex-col rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl animate-in zoom-in-95 duration-150`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Fijo */}
        <div className="flex-shrink-0 p-5 sm:p-6 pb-2">
          {/* Botón X de cierre arriba a la derecha */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover-pop transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <IconoX size={18} />
          </button>

          {/* Encabezado con Ícono y Descripción — SIN descripción, el título
              va centrado con el ícono (items-center), NUNCA pegado arriba.
              CON descripción (título + subtítulo apilados, más alto que el
              ícono), se alinea arriba (items-start). Nunca al revés. */}
          <div className={`flex ${descripcion ? 'items-start' : 'items-center'} gap-3 pr-8 ${tituloCentrado ? 'justify-center w-full' : ''}`}>
            {icono && !tituloCentrado && (
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={colorIcono ? {
                  color: colorIcono,
                  backgroundColor: `color-mix(in srgb, ${colorIcono} 10%, transparent)`,
                } : {
                  color: 'var(--color-brand)',
                  backgroundColor: 'color-mix(in srgb, currentColor 10%, transparent)',
                }}
              >
                {icono}
              </div>
            )}
            <div className={`flex flex-col gap-0.5 ${tituloCentrado ? 'w-full items-center text-center' : ''}`}>
              <h3 className={`${tituloCentrado ? 'text-lg sm:text-xl' : 'text-base'} font-bold text-[var(--text-primary)] leading-snug`}>{titulo}</h3>
              {descripcion && (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {descripcion}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cuerpo Scrolleable */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 sm:px-6 pb-2">
          <div className="flex flex-col gap-4">
            {children}
          </div>
        </div>

        {/* Footer Fijo con Botones — omitido a propósito cuando sinPie=true
            (contenido puramente informativo, sin ninguna acción que confirmar
            o cancelar; cerrar sigue disponible por la X, Escape o clic afuera) */}
        {!sinPie && (
          <div className="flex-shrink-0 p-5 sm:p-6 pt-3 mt-1">
            <div className="flex items-center justify-end gap-2.5">
              <Button variant="secondary" size="sm" onClick={onCancelar || onClose}>
                {textoCancelar}
              </Button>
              <Button
                variant={varianteConfirmar === 'error' ? 'danger' : 'primary'}
                size="sm"
                onClick={onConfirmar}
              >
                {textoConfirmar}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(contenidoModal, document.body)
}

/**
 * Modal unificado preconfigurado para advertencias de Salir Sin Guardar
 */
export function ModalConfirmarSalida({
  abierto,
  onConfirmar,
  onCancelar,
}: {
  abierto: boolean
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <Modal
      abierto={abierto}
      onClose={onCancelar}
      icono={<TriangleAlert size={22} />}
      colorIcono="var(--color-error)"
      titulo="¿Estás seguro de salir sin guardar?"
      descripcion="Si sales o cancelas ahora, los cambios que hayas realizado se perderán permanentemente."
      textoCancelar="Continuar editando"
      textoConfirmar="Sí, salir sin guardar"
      varianteConfirmar="error"
      onCancelar={onCancelar}
      onConfirmar={onConfirmar}
    />
  )
}
