// Campos compartidos para editar límites y precios de un plan — usados en
// la pestaña "Precios" de /admin/contenido (planes globales) y en la
// negociación por empresa de /admin/empresas/[id] (mismo diseño visual a
// pedido del usuario 2026-09-04, con referente concreto: número grande con
// spinner nativo visible + checkbox "Ilimitado" debajo, y cada moneda como
// su propia tarjeta con bandera + Mensual + Anual apilados).
'use client'

import { Square, SquareCheck } from '@/components/ui/icons'

export const MONEDAS = [
  { codigo: 'cop' as const, bandera: '🇨🇴', label: 'COP', nombre: 'Peso colombiano', simbolo: '$' },
  { codigo: 'usd' as const, bandera: '🇺🇸', label: 'USD', nombre: 'Dólar estadounidense', simbolo: '$' },
  { codigo: 'eur' as const, bandera: '🇪🇺', label: 'EUR', nombre: 'Euros', simbolo: '€' },
]

export function equivalenteMensual(anual: number): number {
  return Math.round((anual / 12) * 100) / 100
}

// Número grande, sin suprimir el spinner nativo — a pedido explícito del
// usuario: "los números no solo funcionan con las teclas arriba y abajo,
// sino que también se puede parar encima y escribir" (un <input
// type="number"> normal ya hace ambas cosas, nunca ocultar su apariencia
// nativa con appearance:none como hacen algunos steppers custom).
export function CampoLimiteGrande({ icono: Icono, label, valor, onChange }: {
  icono: React.ElementType; label: string; valor: number | null; onChange: (v: number | null) => void
}) {
  const ilimitado = valor === null
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icono size={15} style={{ color: 'var(--text-secondary)' }} />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      {ilimitado ? (
        <div style={{ fontSize: 30, fontWeight: 300, color: 'var(--text-secondary)' }}>∞</div>
      ) : (
        <input
          type="number"
          min={0}
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%', fontSize: 30, fontWeight: 300, color: 'var(--text-primary)',
            border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent',
            padding: '2px 0', outline: 'none',
          }}
        />
      )}
      <button
        type="button"
        onClick={() => onChange(ilimitado ? 0 : null)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {ilimitado ? <SquareCheck size={13} sinAnimacion /> : <Square size={13} sinAnimacion />} Ilimitado
      </button>
    </div>
  )
}

// Una tarjeta por moneda: bandera + código + nombre, luego Mensual y Anual
// apilados. Editar el mensual recalcula el anual sugerido (x10, "2 meses
// gratis") — el padre decide esa lógica en su propio onChange, este
// componente es solo presentación.
export function BloqueMoneda({ moneda, mensual, anual, onMensualChange, onAnualChange }: {
  moneda: typeof MONEDAS[number]
  mensual: number
  anual: number
  onMensualChange: (v: number) => void
  onAnualChange: (v: number) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>{moneda.bandera}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{moneda.label}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{moneda.nombre}</span>
      </div>
      <div style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Mensual</span>
        <input
          type="number" min={0} value={mensual}
          onChange={(e) => onMensualChange(Number(e.target.value))}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
      </div>
      <div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Anual</span>
        <input
          type="number" min={0} value={anual}
          onChange={(e) => onAnualChange(Number(e.target.value))}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
          ≈ {equivalenteMensual(anual).toLocaleString('es-CO')} {moneda.label}/mes
        </span>
      </div>
    </div>
  )
}
