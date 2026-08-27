'use client'

import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

function esCampoDeFormulario(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

/**
 * Envoltorio obligatorio de TODA página pública (sin sesión) — bloquea
 * copiar, cortar, pegar, seleccionar texto y arrastrar imágenes. Decisión de
 * seguridad a propósito (no un accidente de UX), confirmada explícitamente
 * por el usuario el 2026-08-11 para proteger el know-how expuesto en
 * páginas sin autenticación (landing, legales, cotización pública, DPP,
 * verificación, login/registro, firma digital).
 *
 * Única excepción, también confirmada explícitamente: dentro de una casilla
 * de formulario real (input/textarea/contentEditable) SÍ se permite copiar,
 * cortar y pegar con normalidad — si no, se rompe pegar una contraseña desde
 * un gestor, o el correo en un formulario de contacto. Por eso onCopy/onCut/
 * onPaste revisan el target antes de bloquear. onContextMenu y onDragStart
 * SÍ se bloquean siempre, incluso dentro de una casilla — no hacen falta
 * para escribir/pegar (Ctrl+V sigue funcionando sin el menú contextual).
 * Seleccionar texto (`select-none`) ya respeta esta misma excepción de forma
 * nativa: los navegadores nunca deshabilitan la selección DENTRO del valor
 * de un input/textarea por un `user-select: none` en un ancestro.
 *
 * Regla: cualquier página nueva bajo una ruta sin sesión debe envolver su
 * contenido en este componente sin que el usuario tenga que pedirlo cada
 * vez (ver CLAUDE.md, directriz de páginas públicas).
 */
export function ProteccionPublica({ children, className = '' }: Props) {
  return (
    <div
      className={`select-none ${className}`}
      onCopy={(e) => { if (!esCampoDeFormulario(e.target)) e.preventDefault() }}
      onCut={(e) => { if (!esCampoDeFormulario(e.target)) e.preventDefault() }}
      onPaste={(e) => { if (!esCampoDeFormulario(e.target)) e.preventDefault() }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ WebkitUserSelect: 'none' }}
    >
      {children}
    </div>
  )
}
