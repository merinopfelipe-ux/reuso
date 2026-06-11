'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Calculator, Medal, FileText } from '@phosphor-icons/react'
import { PlanBadge } from '@/components/admin/plan-badge'
import type { Empresa } from '@/types'

interface HistorialPlanEntry {
  created_at: string
  admin: string
  cambios: Record<string, unknown>
}

interface Props {
  empresa: Empresa
  totalEmpleados: number
  limiteEmpleados: number
  calculosMes: number
  limiteCalculosMes: number
  historialPlan: HistorialPlanEntry[]
}

function BarraProgreso({ actual, limite, color }: { actual: number; limite: number; color: string }) {
  if (!isFinite(limite)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 100, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Sin límite</span>
      </div>
    )
  }
  const pct = Math.min(100, Math.round((actual / limite) * 100))
  const barColor = pct >= 90 ? '#CC3C2A' : pct >= 70 ? '#F0A500' : color
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 6, borderRadius: 100, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 100, transition: 'width 0.4s ease' }} />
      </div>
      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>{pct}% del límite</p>
    </div>
  )
}

function KpiCard({
  titulo,
  valor,
  limite,
  icono: Icono,
  color,
}: {
  titulo: string
  valor: number
  limite: number
  icono: React.ElementType
  color: string
}) {
  const limiteStr = isFinite(limite) ? String(limite) : '∞'
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ padding: 8, borderRadius: 8, background: `${color}18` }}>
          <Icono size={16} style={{ color }} />
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {titulo}
        </p>
      </div>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
        {valor}
        <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>/ {limiteStr}</span>
      </p>
      <BarraProgreso actual={valor} limite={limite} color={color} />
    </div>
  )
}

export function EstadoCuentaClient({
  empresa,
  totalEmpleados,
  limiteEmpleados,
  calculosMes,
  limiteCalculosMes,
  historialPlan,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [notas, setNotas] = useState(empresa.notas_admin ?? '')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  async function guardarNotas() {
    setGuardando(true)
    await fetch(`/api/admin/empresas/${empresa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas_admin: notas }),
    })
    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
    startTransition(() => router.refresh())
  }

  const fechaActivacion = new Date(empresa.created_at).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header con ← integrado en el título */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1
            onClick={() => router.back()}
            style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
            {empresa.nombre}
          </h1>
          <PlanBadge plan={empresa.plan} />
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 28 }}>
          Activa desde {fechaActivacion} · {empresa.sector ?? 'Sin sector'}
        </p>
      </div>

      {/* KPIs de uso */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard titulo="Empleados" valor={totalEmpleados} limite={limiteEmpleados} icono={Users} color="#00827C" />
        <KpiCard titulo="Cálculos este mes" valor={calculosMes} limite={limiteCalculosMes} icono={Calculator} color="#59A6E4" />
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ padding: 8, borderRadius: 8, background: 'rgba(160,130,200,0.12)' }}>
              <Medal size={16} style={{ color: '#9B6DD6' }} />
            </div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plan actual</p>
          </div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{empresa.plan}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Notas admin */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={15} style={{ color: 'var(--color-brand)' }} />
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Notas de pago / admin</h2>
          </div>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={6}
            placeholder={'Pagó $29 USD el 15 de abril\nPlan ampliado por solicitud...'}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 13,
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={guardarNotas}
            disabled={guardando}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '9px 0',
              borderRadius: 8,
              background: guardado ? '#1F8C65' : 'var(--color-brand)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {guardando ? 'Guardando...' : guardado ? '✓ Guardado' : 'Guardar notas'}
          </button>
        </div>

        {/* Historial de plan */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow)' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Historial de cambios de plan</h2>
          {historialPlan.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Sin cambios de plan registrados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {historialPlan.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-hover)',
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-brand)', textTransform: 'capitalize' }}>
                      → {String(entry.cambios.plan ?? '')}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {new Date(entry.created_at).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                    por {entry.admin}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
