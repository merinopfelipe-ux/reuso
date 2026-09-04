'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Trash, Users, Calculator, FileText, ClipboardList } from '@/components/ui/icons'
import { useToast } from '@/components/toast-provider'
import { CampoLimiteGrande, BloqueMoneda, MONEDAS } from '@/components/admin/plan-campos'

// Módulo de negociación por empresa — antes vivía en /admin/planes con un
// buscador para elegir la empresa; el usuario pidió moverlo a la ficha de
// cada empresa (2026-09-04), donde la empresa ya está implícita por la URL.
// Mismo endpoint de siempre (/api/admin/empresas/[id]/negociacion).
// Diseño visual (2026-09-04, 2ª pasada): mismos campos grandes con ícono +
// tarjetas por moneda que la pestaña "Precios" de /admin/contenido, a
// pedido explícito del usuario ("allí debe tomar el mismo diseño").

interface Negociacion {
  precio_cop: number
  precio_usd: number
  precio_eur: number
  precio_anual_cop: number
  precio_anual_usd: number
  precio_anual_eur: number
  limite_empleados: number | null
  limite_calculos_mes: number | null
  limite_informes_mes: number | null
  limite_cotizaciones_mes: number | null
  notas: string | null
}

const VACIA: Negociacion = {
  precio_cop: 0, precio_usd: 0, precio_eur: 0,
  precio_anual_cop: 0, precio_anual_usd: 0, precio_anual_eur: 0,
  limite_empleados: null, limite_calculos_mes: null, limite_informes_mes: null, limite_cotizaciones_mes: null,
  notas: '',
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
  border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)',
}
const labelSt: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }

export function NegociacionEmpresaClient({ empresaId }: { empresaId: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [negociacion, setNegociacion] = useState<Negociacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false)
  const [form, setForm] = useState<Negociacion>(VACIA)

  useEffect(() => {
    fetch(`/api/admin/empresas/${empresaId}/negociacion`)
      .then(r => r.json())
      .then(data => {
        setNegociacion(data.negociacion)
        setForm(data.negociacion ?? VACIA)
      })
      .finally(() => setCargando(false))
  }, [empresaId])

  async function guardar() {
    setGuardando(true)
    const res = await fetch(`/api/admin/empresas/${empresaId}/negociacion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setGuardando(false)
    if (!res.ok) { toast.error('No se pudo guardar la negociación.'); return }
    toast.success('Negociación guardada — esta empresa ya no se ve afectada por cambios al plan global.')
    setNegociacion(form)
    startTransition(() => router.refresh())
  }

  async function eliminar() {
    const res = await fetch(`/api/admin/empresas/${empresaId}/negociacion`, { method: 'DELETE' })
    setModalEliminarAbierto(false)
    if (!res.ok) { toast.error('No se pudo quitar la negociación.'); return }
    toast.success('Negociación eliminada — la empresa vuelve al plan global.')
    setNegociacion(null)
    setForm(VACIA)
    startTransition(() => router.refresh())
  }

  if (cargando) {
    return <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando negociación...</p>
  }

  // Editar el mensual de una moneda sugiere su anual (x10, "2 meses
  // gratis") — mismo criterio que config_planes, el anual sigue editable
  // por separado después.
  function cambiarMensual(campo: 'cop' | 'usd' | 'eur', v: number) {
    setForm(f => ({
      ...f,
      [`precio_${campo}`]: v,
      [`precio_anual_${campo}`]: Math.round(v * 10 * 100) / 100,
    }))
  }

  return (
    <div className="rounded-[12px] border border-[var(--border)] p-5 bg-[var(--bg-card)]">
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        {negociacion
          ? 'Esta empresa tiene una negociación propia. Sus precios y límites quedan fijos y nunca cambian cuando publicas un ajuste al plan global.'
          : 'Esta empresa usa el plan global normal. Si necesita precios o límites distintos a los publicados, créalos aquí.'}
      </p>

      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Límites</h4>
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ display: 'grid', gap: 20, marginBottom: 24 }}>
        <CampoLimiteGrande icono={Users} label="Empleados" valor={form.limite_empleados} onChange={(v) => setForm(f => ({ ...f, limite_empleados: v }))} />
        <CampoLimiteGrande icono={Calculator} label="Cálculos/mes" valor={form.limite_calculos_mes} onChange={(v) => setForm(f => ({ ...f, limite_calculos_mes: v }))} />
        <CampoLimiteGrande icono={FileText} label="Informes/mes" valor={form.limite_informes_mes} onChange={(v) => setForm(f => ({ ...f, limite_informes_mes: v }))} />
        <CampoLimiteGrande icono={ClipboardList} label="Cotizaciones/mes" valor={form.limite_cotizaciones_mes} onChange={(v) => setForm(f => ({ ...f, limite_cotizaciones_mes: v }))} />
      </div>

      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Precios</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ display: 'grid', gap: 20, marginBottom: 20 }}>
        {MONEDAS.map((moneda) => (
          <BloqueMoneda
            key={moneda.codigo}
            moneda={moneda}
            mensual={form[`precio_${moneda.codigo}`]}
            anual={form[`precio_anual_${moneda.codigo}`]}
            onMensualChange={(v) => cambiarMensual(moneda.codigo, v)}
            onAnualChange={(v) => setForm(f => ({ ...f, [`precio_anual_${moneda.codigo}`]: v }))}
          />
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={labelSt}>Notas (ej. referencia del contrato)</span>
        <textarea value={form.notas ?? ''} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} style={{ ...inputSt, minHeight: 60, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="primary" size="sm" onClick={guardar} loading={guardando}>Guardar negociación</Button>
        {negociacion && (
          <Button variant="secondary" size="sm" onClick={() => setModalEliminarAbierto(true)}>
            <Trash size={14} sinAnimacion /> Quitar negociación
          </Button>
        )}
      </div>

      <Modal
        abierto={modalEliminarAbierto}
        onClose={() => setModalEliminarAbierto(false)}
        titulo="Quitar negociación"
        descripcion="La empresa volverá a usar los límites y precios del plan global."
        varianteConfirmar="error"
        textoConfirmar="Quitar"
        onConfirmar={eliminar}
      />
    </div>
  )
}
