'use client'

import { useEffect, useRef } from 'react'

/**
 * Pad de firma digital a trazo — reutilizable en cualquier documento
 * firmable (Confidencialidad hoy, otros documentos legales después).
 * Extraído del flujo público abierto original sin cambios de comportamiento.
 */
export function FirmaCanvas({ onChange, disabled = false }: { onChange: (v: string | null) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width || 480
    canvas.height = rect.height || 150
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    let drawing = false

    const rel = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect()
      return { x: clientX - r.left, y: clientY - r.top }
    }

    const md = (e: MouseEvent) => {
      if (disabledRef.current) return
      drawing = true
      const { x, y } = rel(e.clientX, e.clientY)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
    const mm = (e: MouseEvent) => {
      if (disabledRef.current) return
      if (!drawing) return
      const { x, y } = rel(e.clientX, e.clientY)
      ctx.lineTo(x, y)
      ctx.stroke()
      onChangeRef.current(canvas.toDataURL('image/png'))
    }
    const mu = () => { drawing = false }

    const ts = (e: TouchEvent) => {
      if (disabledRef.current) return
      e.preventDefault()
      drawing = true
      const { x, y } = rel(e.touches[0].clientX, e.touches[0].clientY)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
    const tm = (e: TouchEvent) => {
      if (disabledRef.current) return
      e.preventDefault()
      if (!drawing) return
      const { x, y } = rel(e.touches[0].clientX, e.touches[0].clientY)
      ctx.lineTo(x, y)
      ctx.stroke()
      onChangeRef.current(canvas.toDataURL('image/png'))
    }
    const te = () => { drawing = false }

    canvas.addEventListener('mousedown', md)
    canvas.addEventListener('mousemove', mm)
    canvas.addEventListener('mouseup', mu)
    canvas.addEventListener('mouseleave', mu)
    canvas.addEventListener('touchstart', ts, { passive: false })
    canvas.addEventListener('touchmove', tm, { passive: false })
    canvas.addEventListener('touchend', te)

    return () => {
      canvas.removeEventListener('mousedown', md)
      canvas.removeEventListener('mousemove', mm)
      canvas.removeEventListener('mouseup', mu)
      canvas.removeEventListener('mouseleave', mu)
      canvas.removeEventListener('touchstart', ts)
      canvas.removeEventListener('touchmove', tm)
      canvas.removeEventListener('touchend', te)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const clear = () => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChangeRef.current(null)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: 150,
          borderRadius: 10,
          border: disabled ? '1.5px solid rgba(0,0,0,0.10)' : '1.5px solid rgba(0,130,124,0.30)',
          cursor: disabled ? 'not-allowed' : 'crosshair',
          touchAction: 'none',
          background: disabled ? 'rgba(0,0,0,0.02)' : 'rgba(0,130,124,0.02)',
          opacity: disabled ? 0.6 : 1,
        }}
      />
      <button
        type="button"
        onClick={clear}
        disabled={disabled}
        style={{
          marginTop: 8,
          fontSize: 12,
          color: 'var(--text-secondary)',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        Borrar
      </button>
    </div>
  )
}
