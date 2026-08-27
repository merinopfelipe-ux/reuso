'use client'

import { useState, useRef, useEffect } from 'react'
import { Download } from '@/components/ui/icons'
import { descargarCSV } from '@/lib/csv/descargar-csv'
import { descargarExcel } from '@/lib/csv/descargar-excel'
import { descargarPDFTabla } from '@/lib/csv/descargar-pdf-tabla'
import { createPortal } from 'react-dom'

type Formato = 'csv' | 'xlsx' | 'pdf'

interface Opcion {
  formato: Formato
  label: string
}

const OPCIONES: Opcion[] = [
  { formato: 'xlsx', label: 'Excel (.xlsx)' },
  { formato: 'csv', label: 'CSV (.csv)' },
  { formato: 'pdf', label: 'PDF (.pdf)' },
]

interface Props {
  data: unknown[]
  nombre: string
  tituloPdf?: string
  label?: string
  disabled?: boolean
  onDescargarPdf?: () => void
  onGenerarData?: () => Promise<unknown[]>
  icon?: React.ReactNode
}

export function BotonDescargarCliente({ data, nombre, tituloPdf, label, disabled, onDescargarPdf, onGenerarData, icon }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [montado, setMontado] = useState(false)

  useEffect(() => setMontado(true), [])

  function posicionar() {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    // width is at least 160
    const left = rect.right - 160
    setCoords({ top: rect.bottom + 4, left: Math.max(8, left) })
  }

  function alternar() {
    if (!abierto) posicionar()
    setAbierto(v => !v)
  }

  useEffect(() => {
    if (!abierto) return
    function onClick(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return
      if (menuRef.current?.contains(e.target as Node)) return
      setAbierto(false)
    }
    function onScroll(e: Event) {
      if (menuRef.current?.contains(e.target as Node)) return
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
  }, [abierto])

  async function descargar(formato: Formato) {
    setAbierto(false)
    if (cargando) return

    let dataToExport = data
    if (onGenerarData) {
      setCargando(true)
      try {
        dataToExport = await onGenerarData()
      } catch (err) {
        console.error('Error al generar datos:', err)
        setCargando(false)
        return
      }
      setCargando(false)
    }

    if (!dataToExport || dataToExport.length === 0) return

    if (formato === 'csv') {
      descargarCSV(dataToExport, nombre)
    } else if (formato === 'xlsx') {
      descargarExcel(dataToExport, nombre)
    } else if (formato === 'pdf') {
      if (onDescargarPdf) onDescargarPdf()
      else descargarPDFTabla(dataToExport, nombre, tituloPdf ?? nombre)
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={alternar}
        disabled={disabled || cargando || (!onGenerarData && (!data || data.length === 0))}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 8,
          border: '1.5px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 600,
          cursor: disabled || cargando || (!onGenerarData && (!data || data.length === 0)) ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          opacity: disabled || cargando || (!onGenerarData && (!data || data.length === 0)) ? 0.5 : 1,
        }}
        className={disabled || cargando || (!onGenerarData && (!data || data.length === 0)) ? '' : 'hover:bg-[var(--bg-hover)]'}
      >
        {cargando ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> : (icon ?? <Download size={14} />)}
        {cargando ? 'Generando...' : label}
      </button>

      {abierto && montado && coords && !disabled && (onGenerarData || (data && data.length > 0)) && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            zIndex: 9999,
            minWidth: 160,
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
          }}
        >
          {OPCIONES.map(({ formato, label: opLabel }) => (
            <button
              key={formato}
              onClick={() => descargar(formato)}
              style={{
                display: 'block',
                width: '100%',
                padding: '9px 16px',
                textAlign: 'left',
                fontSize: 13,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              {opLabel}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
