'use client'

import { useRef, type PointerEvent } from 'react'

/**
 * Pad de firma digital a trazo — reutilizable en cualquier documento
 * firmable (Confidencialidad hoy, otros documentos legales después).
 * Usa Pointer Events para que el mismo trazado funcione con mouse, touch y
 * lápiz. El flujo anterior mezclaba listeners de mouse y touch; en algunos
 * navegadores táctiles nunca llegaba a guardar la imagen resultante.
 */
export function FirmaCanvas({ onChange, disabled = false }: { onChange: (v: string | null) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const dibujandoRef = useRef(false)

  const punto = (canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const configurarTrazo = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#1a1a1a'
    ctx.fillStyle = '#1a1a1a'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const iniciar = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    const canvas = event.currentTarget
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    event.preventDefault()
    canvas.setPointerCapture(event.pointerId)
    const { x, y } = punto(canvas, event)
    configurarTrazo(ctx)
    // Deja una marca incluso con un toque corto, y hace que la firma se
    // conserve cuando el usuario levanta el dedo sin generar pointermove.
    ctx.beginPath()
    ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x, y)
    dibujandoRef.current = true
  }

  const trazar = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !dibujandoRef.current) return
    const canvas = event.currentTarget
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    event.preventDefault()
    const { x, y } = punto(canvas, event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const finalizar = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!dibujandoRef.current) return
    const canvas = event.currentTarget
    dibujandoRef.current = false
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    onChangeRef.current(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    dibujandoRef.current = false
    onChangeRef.current(null)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={960}
        height={300}
        aria-label="Área para dibujar la firma"
        onPointerDown={iniciar}
        onPointerMove={trazar}
        onPointerUp={finalizar}
        onPointerCancel={finalizar}
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
