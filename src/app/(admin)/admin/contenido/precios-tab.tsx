'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, Calculator, FileText, ClipboardList } from '@/components/ui/icons'
import { useToast } from '@/components/toast-provider'
import { PLAN_CONFIG } from '@/components/admin/plan-badge'
import { CampoLimiteGrande, BloqueMoneda, MONEDAS } from '@/components/admin/plan-campos'

// Pestaña "Precios" de /admin/contenido — antes era la página completa
// /admin/planes, absorbida aquí a pedido del usuario 2026-09-04 ("la
// pestaña 'precios' en /admin/contenido elimina /admin/planes"). Mismo
// endpoint de siempre (/api/admin/planes, borrador→publicar), solo cambió
// dónde vive y su diseño visual (ver src/components/admin/plan-campos.tsx).

interface ConfigPlan {
  id: 'free' | 'lab' | 'impulso' | 'ilimitado'
  precio_cop: number
  precio_usd: number
  precio_eur: number
  precio_anual_cop: number | null
  precio_anual_usd: number | null
  precio_anual_eur: number | null
  limite_empleados: number | null
  limite_calculos_mes: number | null
  limite_informes_mes: number | null
  limite_cotizaciones_mes: number | null
  borrador_precio_cop: number | null
  borrador_precio_usd: number | null
  borrador_precio_eur: number | null
  borrador_precio_anual_cop: number | null
  borrador_precio_anual_usd: number | null
  borrador_precio_anual_eur: number | null
  borrador_limite_empleados: number | null
  borrador_limite_calculos_mes: number | null
  borrador_limite_informes_mes: number | null
  borrador_limite_cotizaciones_mes: number | null
  tiene_borrador_sin_publicar: boolean
}

const NOMBRES: Record<string, string> = {
  free: 'Explora', lab: 'Circular Lab', impulso: 'Impulso Sostenible', ilimitado: 'Impacto Ilimitado',
}

function TarjetaPlan({ plan, onGuardado }: { plan: ConfigPlan; onGuardado: () => void }) {
  const { toast } = useToast()
  const [borrador, setBorrador] = useState({
    borrador_precio_cop: plan.borrador_precio_cop ?? plan.precio_cop,
    borrador_precio_usd: plan.borrador_precio_usd ?? plan.precio_usd,
    borrador_precio_eur: plan.borrador_precio_eur ?? plan.precio_eur,
    borrador_precio_anual_cop: plan.borrador_precio_anual_cop ?? plan.precio_anual_cop ?? plan.precio_cop * 10,
    borrador_precio_anual_usd: plan.borrador_precio_anual_usd ?? plan.precio_anual_usd ?? plan.precio_usd * 10,
    borrador_precio_anual_eur: plan.borrador_precio_anual_eur ?? plan.precio_anual_eur ?? plan.precio_eur * 10,
    borrador_limite_empleados: plan.borrador_limite_empleados ?? plan.limite_empleados,
    borrador_limite_calculos_mes: plan.borrador_limite_calculos_mes ?? plan.limite_calculos_mes,
    borrador_limite_informes_mes: plan.borrador_limite_informes_mes ?? plan.limite_informes_mes,
    borrador_limite_cotizaciones_mes: plan.borrador_limite_cotizaciones_mes ?? plan.limite_cotizaciones_mes,
  })
  const [guardando, setGuardando] = useState(false)
  const [publicando, setPublicando] = useState(false)

  async function guardarBorrador() {
    setGuardando(true)
    const res = await fetch('/api/admin/planes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plan.id, ...borrador }),
    })
    setGuardando(false)
    if (!res.ok) { toast.error('No se pudo guardar el borrador.'); return }
    toast.success('Borrador guardado.')
    onGuardado()
  }

  async function publicar() {
    setPublicando(true)
    const res = await fetch(`/api/admin/planes/${plan.id}/publicar`, { method: 'POST' })
    setPublicando(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'No se pudo publicar.')
      return
    }
    toast.success(`Plan ${NOMBRES[plan.id]} publicado.`)
    onGuardado()
  }

  function cambiarMensual(campo: 'cop' | 'usd' | 'eur', v: number) {
    setBorrador(b => ({
      ...b,
      [`borrador_precio_${campo}`]: v,
      [`borrador_precio_anual_${campo}`]: Math.round(v * 10 * 100) / 100,
    }))
  }

  const cfg = PLAN_CONFIG[plan.id]
  const IconoPlan = cfg.icon

  return (
    <div style={{ borderRadius: 20, border: '1px solid var(--border)', padding: 24, background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${cfg.color}18`, flexShrink: 0 }}>
            <IconoPlan size={19} color={cfg.color} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{NOMBRES[plan.id]}</h3>
        </div>
        {plan.tiene_borrador_sin_publicar && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-warning)', background: 'var(--color-warning)1A', padding: '2px 8px', borderRadius: 999 }}>
            Cambios sin publicar
          </span>
        )}
      </div>

      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Límites</h4>
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ display: 'grid', gap: 20, marginBottom: 28 }}>
        <CampoLimiteGrande icono={Users} label="Empleados" valor={borrador.borrador_limite_empleados} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_empleados: v }))} />
        <CampoLimiteGrande icono={Calculator} label="Cálculos/mes" valor={borrador.borrador_limite_calculos_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_calculos_mes: v }))} />
        <CampoLimiteGrande icono={FileText} label="Informes/mes" valor={borrador.borrador_limite_informes_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_informes_mes: v }))} />
        <CampoLimiteGrande icono={ClipboardList} label="Cotizaciones/mes" valor={borrador.borrador_limite_cotizaciones_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_cotizaciones_mes: v }))} />
      </div>

      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Precios</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ display: 'grid', gap: 20, marginBottom: 20 }}>
        {MONEDAS.map((moneda) => (
          <BloqueMoneda
            key={moneda.codigo}
            moneda={moneda}
            mensual={borrador[`borrador_precio_${moneda.codigo}`]}
            anual={borrador[`borrador_precio_anual_${moneda.codigo}`]}
            onMensualChange={(v) => cambiarMensual(moneda.codigo, v)}
            onAnualChange={(v) => setBorrador(b => ({ ...b, [`borrador_precio_anual_${moneda.codigo}`]: v }))}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" onClick={guardarBorrador} loading={guardando}>Guardar borrador</Button>
        <Button variant="primary" size="sm" onClick={publicar} loading={publicando} disabled={!plan.tiene_borrador_sin_publicar}>Publicar</Button>
      </div>
    </div>
  )
}

export function PreciosTab() {
  const [planes, setPlanes] = useState<ConfigPlan[]>([])
  const [cargando, setCargando] = useState(true)

  function cargar() {
    setCargando(true)
    fetch('/api/admin/planes')
      .then(r => r.json())
      .then(data => setPlanes(data.planes ?? []))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Precios y límites reales de los 4 planes. Los cambios solo aplican al hacer clic en Publicar — antes de eso, quedan como borrador sin afectar a nadie. Para una empresa puntual con precios distintos, negocia desde su propia ficha en Empresas.
      </p>
      {cargando ? (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:grid-cols-2">
          {planes.map(plan => (
            <TarjetaPlan key={plan.id} plan={plan} onGuardado={cargar} />
          ))}
        </div>
      )}
    </div>
  )
}
