'use client'

import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { SelectorEmpresa, type EmpresaOpcion } from '@/components/ui/selector-empresa'
import { Square, SquareCheck, Trash } from '@/components/ui/icons'
import { useToast } from '@/components/toast-provider'

interface ConfigPlan {
  id: 'free' | 'lab' | 'impulso' | 'ilimitado'
  precio_cop: number
  precio_usd: number
  precio_eur: number
  // Precio anual (sql/117) — antes era un descuento fijo en código (mensual
  // x 10, "2 meses gratis"), ahora su propio valor editable por separado.
  precio_anual_cop: number | null
  precio_anual_usd: number | null
  precio_anual_eur: number | null
  limite_empleados: number | null
  limite_calculos_mes: number | null
  limite_informes_mes: number | null
  borrador_precio_cop: number | null
  borrador_precio_usd: number | null
  borrador_precio_eur: number | null
  borrador_precio_anual_cop: number | null
  borrador_precio_anual_usd: number | null
  borrador_precio_anual_eur: number | null
  borrador_limite_empleados: number | null
  borrador_limite_calculos_mes: number | null
  borrador_limite_informes_mes: number | null
  tiene_borrador_sin_publicar: boolean
}

const NOMBRES: Record<string, string> = {
  free: 'Explora', lab: 'Circular Lab', impulso: 'Impulso Sostenible', ilimitado: 'Impacto Ilimitado',
}

interface Negociacion {
  precio_cop: number
  precio_usd: number
  precio_eur: number
  limite_empleados: number | null
  limite_calculos_mes: number | null
  limite_informes_mes: number | null
  notas: string | null
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
  border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)',
}
const labelSt: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }
// Solo informativo, nunca editable — a pedido del usuario 2026-09-03: junto
// al precio anual se muestra a qué mensual equivale (anual / 12), para que
// quede claro qué le cobra en la práctica a alguien que paga por año.
const equivalenteSt: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }
function equivalenteMensual(anual: number): number {
  return Math.round((anual / 12) * 100) / 100
}

function CampoIlimitado({ label, valor, onChange }: { label: string; valor: number | null; onChange: (v: number | null) => void }) {
  const ilimitado = valor === null
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={labelSt}>{label}</span>
        <button
          type="button"
          onClick={() => onChange(ilimitado ? 0 : null)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {ilimitado ? <SquareCheck size={14} sinAnimacion /> : <Square size={14} sinAnimacion />} Ilimitado
        </button>
      </div>
      {!ilimitado && (
        <input
          type="number" min={0} value={valor ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          style={inputSt}
        />
      )}
    </div>
  )
}

function TarjetaPlan({ plan, onGuardado }: { plan: ConfigPlan; onGuardado: () => void }) {
  const { toast } = useToast()
  const [borrador, setBorrador] = useState({
    borrador_precio_cop: plan.borrador_precio_cop ?? plan.precio_cop,
    borrador_precio_usd: plan.borrador_precio_usd ?? plan.precio_usd,
    borrador_precio_eur: plan.borrador_precio_eur ?? plan.precio_eur,
    // Si todavía no hay ningún precio anual guardado (antes de correr
    // sql/117), se sugiere el mismo cálculo que usaba el código: mensual x 10.
    borrador_precio_anual_cop: plan.borrador_precio_anual_cop ?? plan.precio_anual_cop ?? plan.precio_cop * 10,
    borrador_precio_anual_usd: plan.borrador_precio_anual_usd ?? plan.precio_anual_usd ?? plan.precio_usd * 10,
    borrador_precio_anual_eur: plan.borrador_precio_anual_eur ?? plan.precio_anual_eur ?? plan.precio_eur * 10,
    borrador_limite_empleados: plan.borrador_limite_empleados ?? plan.limite_empleados,
    borrador_limite_calculos_mes: plan.borrador_limite_calculos_mes ?? plan.limite_calculos_mes,
    borrador_limite_informes_mes: plan.borrador_limite_informes_mes ?? plan.limite_informes_mes,
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

  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border)', padding: 16, background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{NOMBRES[plan.id]}</h3>
        {plan.tiene_borrador_sin_publicar && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-warning)', background: 'var(--color-warning)1A', padding: '2px 8px', borderRadius: 999 }}>
            Cambios sin publicar
          </span>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Publicado hoy: {plan.precio_cop.toLocaleString('es-CO')} COP/mes · {(plan.precio_anual_cop ?? plan.precio_cop * 10).toLocaleString('es-CO')} COP/año · {plan.limite_calculos_mes ?? 'Ilimitados'} cálculos/mes · {plan.limite_informes_mes ?? 'Ilimitados'} informes/mes
      </p>

      <span style={{ ...labelSt, marginBottom: 8, fontWeight: 700 }}>Precio mensual</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {/* Editar el mensual recalcula el anual automáticamente (mensual x
            10, "2 meses gratis") — a pedido del usuario 2026-09-03. El anual
            sigue siendo editable por separado después: solo se pisa cuando
            se vuelve a tocar ESTE campo mensual, no en cada render. */}
        <div>
          <span style={labelSt}>COP</span>
          <input type="number" min={0} value={borrador.borrador_precio_cop} onChange={(e) => { const v = Number(e.target.value); setBorrador(b => ({ ...b, borrador_precio_cop: v, borrador_precio_anual_cop: Math.round(v * 10) })) }} style={inputSt} />
        </div>
        <div>
          <span style={labelSt}>USD</span>
          <input type="number" min={0} value={borrador.borrador_precio_usd} onChange={(e) => { const v = Number(e.target.value); setBorrador(b => ({ ...b, borrador_precio_usd: v, borrador_precio_anual_usd: Math.round(v * 10 * 100) / 100 })) }} style={inputSt} />
        </div>
        <div>
          <span style={labelSt}>EUR</span>
          <input type="number" min={0} value={borrador.borrador_precio_eur} onChange={(e) => { const v = Number(e.target.value); setBorrador(b => ({ ...b, borrador_precio_eur: v, borrador_precio_anual_eur: Math.round(v * 10 * 100) / 100 })) }} style={inputSt} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ ...labelSt, marginBottom: 0, fontWeight: 700 }}>Precio anual</span>
        <button
          type="button"
          onClick={() => setBorrador(b => ({
            ...b,
            borrador_precio_anual_cop: Math.round(b.borrador_precio_cop * 10),
            borrador_precio_anual_usd: Math.round(b.borrador_precio_usd * 10),
            borrador_precio_anual_eur: Math.round(b.borrador_precio_eur * 10),
          }))}
          style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Usar sugerido (2 meses gratis)
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <span style={labelSt}>COP</span>
          <input type="number" min={0} value={borrador.borrador_precio_anual_cop} onChange={(e) => setBorrador(b => ({ ...b, borrador_precio_anual_cop: Number(e.target.value) }))} style={inputSt} />
          <span style={equivalenteSt}>≈ {equivalenteMensual(borrador.borrador_precio_anual_cop).toLocaleString('es-CO')} COP/mes</span>
        </div>
        <div>
          <span style={labelSt}>USD</span>
          <input type="number" min={0} value={borrador.borrador_precio_anual_usd} onChange={(e) => setBorrador(b => ({ ...b, borrador_precio_anual_usd: Number(e.target.value) }))} style={inputSt} />
          <span style={equivalenteSt}>≈ {equivalenteMensual(borrador.borrador_precio_anual_usd).toFixed(2)} USD/mes</span>
        </div>
        <div>
          <span style={labelSt}>EUR</span>
          <input type="number" min={0} value={borrador.borrador_precio_anual_eur} onChange={(e) => setBorrador(b => ({ ...b, borrador_precio_anual_eur: Number(e.target.value) }))} style={inputSt} />
          <span style={equivalenteSt}>≈ {equivalenteMensual(borrador.borrador_precio_anual_eur).toFixed(2)} EUR/mes</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <CampoIlimitado label="Empleados" valor={borrador.borrador_limite_empleados} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_empleados: v }))} />
        <CampoIlimitado label="Cálculos/mes" valor={borrador.borrador_limite_calculos_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_calculos_mes: v }))} />
        <CampoIlimitado label="Informes/mes" valor={borrador.borrador_limite_informes_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_informes_mes: v }))} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" onClick={guardarBorrador} loading={guardando}>Guardar borrador</Button>
        <Button variant="primary" size="sm" onClick={publicar} loading={publicando} disabled={!plan.tiene_borrador_sin_publicar}>Publicar</Button>
      </div>
    </div>
  )
}

function SeccionNegociaciones({ empresas }: { empresas: EmpresaOpcion[] }) {
  const { toast } = useToast()
  const [empresaId, setEmpresaId] = useState('')
  const [negociacion, setNegociacion] = useState<Negociacion | null>(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false)
  const [form, setForm] = useState<Negociacion>({
    precio_cop: 0, precio_usd: 0, precio_eur: 0,
    limite_empleados: null, limite_calculos_mes: null, limite_informes_mes: null, notas: '',
  })

  useEffect(() => {
    if (!empresaId) { setNegociacion(null); return }
    setCargando(true)
    fetch(`/api/admin/empresas/${empresaId}/negociacion`)
      .then(r => r.json())
      .then(data => {
        setNegociacion(data.negociacion)
        if (data.negociacion) setForm(data.negociacion)
        else setForm({ precio_cop: 0, precio_usd: 0, precio_eur: 0, limite_empleados: null, limite_calculos_mes: null, limite_informes_mes: null, notas: '' })
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
  }

  async function eliminar() {
    const res = await fetch(`/api/admin/empresas/${empresaId}/negociacion`, { method: 'DELETE' })
    setModalEliminarAbierto(false)
    if (!res.ok) { toast.error('No se pudo quitar la negociación.'); return }
    toast.success('Negociación eliminada — la empresa vuelve al plan global.')
    setNegociacion(null)
    setForm({ precio_cop: 0, precio_usd: 0, precio_eur: 0, limite_empleados: null, limite_calculos_mes: null, limite_informes_mes: null, notas: '' })
  }

  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border)', padding: 16, background: 'var(--bg-card)', marginTop: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 0, marginBottom: 4 }}>Negociaciones por empresa</h3>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Si una empresa tiene una negociación propia aquí, sus precios y límites quedan fijos — nunca cambian cuando publicas un ajuste al plan global.
      </p>

      <SelectorEmpresa empresas={empresas} value={empresaId} onChange={setEmpresaId} placeholder="Busca una empresa..." />

      {empresaId && !cargando && (
        <div style={{ marginTop: 16 }}>
          {negociacion && (
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-brand)', marginBottom: 12 }}>
              Esta empresa ya tiene una negociación propia activa.
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div><span style={labelSt}>Precio COP</span><input type="number" min={0} value={form.precio_cop} onChange={(e) => setForm(f => ({ ...f, precio_cop: Number(e.target.value) }))} style={inputSt} /></div>
            <div><span style={labelSt}>Precio USD</span><input type="number" min={0} value={form.precio_usd} onChange={(e) => setForm(f => ({ ...f, precio_usd: Number(e.target.value) }))} style={inputSt} /></div>
            <div><span style={labelSt}>Precio EUR</span><input type="number" min={0} value={form.precio_eur} onChange={(e) => setForm(f => ({ ...f, precio_eur: Number(e.target.value) }))} style={inputSt} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <CampoIlimitado label="Empleados" valor={form.limite_empleados} onChange={(v) => setForm(f => ({ ...f, limite_empleados: v }))} />
            <CampoIlimitado label="Cálculos/mes" valor={form.limite_calculos_mes} onChange={(v) => setForm(f => ({ ...f, limite_calculos_mes: v }))} />
            <CampoIlimitado label="Informes/mes" valor={form.limite_informes_mes} onChange={(v) => setForm(f => ({ ...f, limite_informes_mes: v }))} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={labelSt}>Notas (ej. referencia del contrato)</span>
            <textarea value={form.notas ?? ''} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} style={{ ...inputSt, minHeight: 60, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="primary" size="sm" onClick={guardar} loading={guardando}>Guardar negociación</Button>
            {negociacion && (
              <Button variant="ghost" size="sm" onClick={() => setModalEliminarAbierto(true)}>
                <Trash size={14} sinAnimacion /> Quitar negociación
              </Button>
            )}
          </div>
        </div>
      )}

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

export function PlanesClient({ empresasIniciales }: { empresasIniciales: EmpresaOpcion[] }) {
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
      <AdminPageHeader
        titulo="Planes"
        subtitulo="Precios y límites reales de los 4 planes. Los cambios solo aplican al hacer clic en Publicar — antes de eso, quedan como borrador sin afectar a nadie."
      />

      {cargando ? (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="md:grid-cols-2">
          {planes.map(plan => (
            <TarjetaPlan key={plan.id} plan={plan} onGuardado={cargar} />
          ))}
        </div>
      )}

      <SeccionNegociaciones empresas={empresasIniciales} />
    </div>
  )
}
