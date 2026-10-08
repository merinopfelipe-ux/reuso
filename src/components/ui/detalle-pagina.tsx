'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SkeletonLista } from '@/components/ui/skeleton'
import { ArrowLeft } from '@/components/ui/icons'

/**
 * Sistema de páginas de detalle — Calculadora de Reúso
 *
 * Tres piezas independientes que se combinan para armar cualquier
 * página de detalle (leads, clientes, empresa, DPP, etc.):
 *
 *   <DetallePagina cargando={cargando}>
 *     <EncabezadoDetalle titulo="Nombre" subtitulo="Tipo" href="/lista" />
 *     <SeccionDetalle titulo="Datos" acciones={<button>...</button>}>
 *       ...campos...
 *     </SeccionDetalle>
 *     <PieDetalle onGuardar={guardar} guardando={guardando} hrefVolver="/lista" />
 *   </DetallePagina>
 *
 * Cambiar cualquier pieza aquí afecta todas las páginas que la usen.
 */

// ── DetallePagina ─────────────────────────────────────────────────

interface DetallePaginaProps {
  children?: ReactNode
  /** Si es true, muestra el esqueleto en lugar del contenido. */
  cargando?: boolean
  /** Si hay un mensaje de error y no se puede mostrar nada más. */
  errorFatal?: string | null
  /** Ancho máximo: 'ancho' (max-w-6xl, default para 2 columnas en tablet/desktop) o 'normal' (max-w-3xl). */
  ancho?: 'normal' | 'ancho'
  className?: string
}

export function DetallePagina({
  children,
  cargando,
  errorFatal,
  ancho = 'ancho',
  className = '',
}: DetallePaginaProps) {
  const maxW = ancho === 'normal' ? 'max-w-3xl' : 'max-w-6xl'
  if (cargando) {
    return (
      <div className={`${maxW} mx-auto px-4 sm:px-6 py-6`}>
        <SkeletonLista filas={3} />
      </div>
    )
  }
  if (errorFatal) {
    return (
      <div className={`${maxW} mx-auto px-4 sm:px-6 py-10 flex items-center justify-center`}>
        <p className="text-sm text-(--text-secondary)">{errorFatal}</p>
      </div>
    )
  }
  return (
    <div className={`${maxW} mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 ${className}`}>
      {children}
    </div>
  )
}

/**
 * Cuadrícula canónica a dos columnas para tablet (md:) y computador (lg:/xl:).
 * En móvil (<768px) apila automáticamente en una sola columna vertical.
 */
export function DetalleGrid({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 items-start ${className}`}>
      {children}
    </div>
  )
}

/**
 * Columna vertical para agrupar tarjetas dentro de DetalleGrid sin desfases de altura entre filas.
 */
export function DetalleColumna({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {children}
    </div>
  )
}

// ── SeccionDetalle ────────────────────────────────────────────────

interface SeccionDetalleProps {
  titulo?: string
  /** Elemento en el extremo derecho del encabezado: botón, link, badge. */
  acciones?: ReactNode
  children: ReactNode
  className?: string
  ancho?: 'normal' | 'completo'
}

export function SeccionDetalle({
  titulo,
  acciones,
  children,
  className = '',
  ancho = 'normal',
}: SeccionDetalleProps) {
  const tieneEncabezado = titulo || acciones
  const colSpan = ancho === 'completo' ? 'md:col-span-2' : ''
  return (
    <section className={`rounded-2xl border border-(--border) bg-(--bg-card) p-4 sm:p-5 flex flex-col gap-4 ${colSpan} ${className}`}>
      {tieneEncabezado && (
        <div className="flex items-center justify-between gap-3">
          {titulo && <h2 className="text-base font-semibold text-(--text-primary) m-0">{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  )
}

// ── EncabezadoDetalle ─────────────────────────────────────────────

interface EncabezadoDetalleProps {
  titulo: string
  /** Línea secundaria bajo el título (empresa, tipo, etc.). */
  subtitulo?: string | null
  /** Meta en el extremo derecho (fecha, código, etc.). */
  meta?: string
  /** Href estático para Volver. */
  hrefVolver?: string
  /** Callback para Volver cuando la ruta tiene params dinámicos. */
  onVolver?: () => void
  textoVolver?: string
}

/**
 * Encabezado canónico de páginas de detalle: flecha volver + título + meta.
 *
 * Uso:
 *   <EncabezadoDetalle
 *     titulo="Felipe Merino"
 *     subtitulo="Restauradora"
 *     hrefVolver="/admin/leads"
 *     textoVolver="Volver a contactos"
 *     meta="Registrado el 7 de octubre de 2026"
 *   />
 */
export function EncabezadoDetalle({ titulo, subtitulo, meta, hrefVolver, onVolver, textoVolver = 'Volver' }: EncabezadoDetalleProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {hrefVolver && !onVolver ? (
          <Link href={hrefVolver} className="inline-flex items-center gap-1.5 text-sm text-(--text-secondary) hover:text-brand">
            <ArrowLeft size={16} sinAnimacion /> {textoVolver}
          </Link>
        ) : onVolver ? (
          <button type="button" onClick={onVolver} className="inline-flex items-center gap-1.5 text-sm text-(--text-secondary) hover:text-brand">
            <ArrowLeft size={16} sinAnimacion /> {textoVolver}
          </button>
        ) : null}
        {meta && <span className="text-xs text-(--text-placeholder)">{meta}</span>}
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-(--text-primary) m-0">{titulo}</h1>
        {subtitulo && <p className="text-sm text-(--text-secondary) mt-1 mb-0">{subtitulo}</p>}
      </div>
    </>
  )
}

// ── PieDetalle ────────────────────────────────────────────────────

interface PieDetalleProps {
  onGuardar: () => void
  guardando?: boolean
  /** Callback para Volver. Se usa cuando el href necesita params dinámicos. */
  onVolver?: () => void
  /** Href estático para Volver (cuando no hay params). */
  hrefVolver?: string
  textoGuardar?: string
  /** Nodo adicional entre los botones (ej. mensaje de error). */
  extra?: ReactNode
}

export function PieDetalle({
  onGuardar,
  guardando,
  onVolver,
  hrefVolver,
  textoGuardar = 'Guardar cambios',
  extra,
}: PieDetalleProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap pt-2">
      <Button onClick={onGuardar} loading={guardando}>
        {textoGuardar}
      </Button>
      {onVolver && (
        <Button variant="secondary" onClick={onVolver}>
          Volver
        </Button>
      )}
      {hrefVolver && !onVolver && (
        <Button href={hrefVolver} variant="secondary">
          Volver
        </Button>
      )}
      {extra}
    </div>
  )
}
