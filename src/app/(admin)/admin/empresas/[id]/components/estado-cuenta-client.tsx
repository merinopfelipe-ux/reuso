'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Calculator, Sparkles, ChevronDown, CheckCircle, Power, RefreshCw, Save, Calendar, FileText, ClipboardList, Plus, Minus } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { PlanBadge, PLAN_CONFIG } from '@/components/admin/plan-badge'
import { RichTextEditor, type RichTextEditorHandle } from '@/components/ui/rich-text-editor'
import type { Empresa, Plan } from '@/types'

interface HistorialPlanEntry {
  created_at: string
  admin: string
  adminRol: string
  cambios: Record<string, unknown>
}

// Límites y precio REALES de esta empresa hoy — vienen de config_planes
// (plan global) o de empresas_negociaciones si esta empresa tiene una
// negociación propia (sql/115). Ya NO es la tabla fija que traía esta
// página antes, desincronizada desde que /admin/planes se volvió editable
// — corregido 2026-09-04.
interface PlanReal {
  origen: 'global' | 'negociacion'
  precio_cop: number
  precio_anual_cop: number | null
  limite_empleados: number | null
  limite_calculos_mes: number | null
  limite_informes_mes: number | null
  limite_cotizaciones_mes: number | null
}

interface Props {
  empresa: Empresa
  totalEmpleados: number
  calculosMes: number
  planReal: PlanReal
  historialPlan: HistorialPlanEntry[]
  adminNombre?: string
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
      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>{pct} % del límite</p>
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
    <div className="rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg-card)]">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: `${color}18`, flexShrink: 0 }}>
          <Icono size={16} color={color} />
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
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
  calculosMes,
  planReal,
  historialPlan,
  adminNombre = 'Equipo Interno',
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const editorRef = useRef<RichTextEditorHandle>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const [mostrarTodasActividades, setMostrarTodasActividades] = useState(false)
  const [plan, setPlan] = useState<Plan>((empresa.plan as Plan) || 'free')
  const [guardandoPlan, setGuardandoPlan] = useState(false)
  const [menuPlanAbierto, setMenuPlanAbierto] = useState(false)
  const [activa, setActiva] = useState(empresa.activa)
  const [cambiandoActiva, setCambiandoActiva] = useState(false)

  // Ciclo de facturación (sql/119) — dato manual, no hay pasarela de pagos
  // integrada. El super_admin lo marca a mano, igual que las notas.
  const [ciclo, setCiclo] = useState<'mensual' | 'anual' | null>(empresa.ciclo_facturacion)
  const [renovacion, setRenovacion] = useState(empresa.proxima_renovacion ?? '')
  const [guardandoCiclo, setGuardandoCiclo] = useState(false)
  const [verDetallePlan, setVerDetallePlan] = useState(false)

  async function guardarCiclo(nuevoCiclo: 'mensual' | 'anual' | null, nuevaRenovacion: string) {
    setGuardandoCiclo(true)
    const res = await fetch(`/api/admin/empresas/${empresa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ciclo_facturacion: nuevoCiclo, proxima_renovacion: nuevaRenovacion || null }),
    })
    setGuardandoCiclo(false)
    if (res.ok) startTransition(() => router.refresh())
  }

  async function toggleActiva() {
    if (cambiandoActiva) return
    setCambiandoActiva(true)
    try {
      const res = await fetch(`/api/admin/empresas/${empresa.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa: !activa }),
      })
      if (res.ok) {
        setActiva(v => !v)
        startTransition(() => router.refresh())
      }
    } finally {
      setCambiandoActiva(false)
    }
  }

  async function cambiarPlan(nuevoPlan: Plan) {
    if (nuevoPlan === plan) return
    setGuardandoPlan(true)
    const res = await fetch(`/api/admin/empresas/${empresa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: nuevoPlan }),
    })
    setGuardandoPlan(false)
    if (res.ok) {
      setPlan(nuevoPlan)
      setMenuPlanAbierto(false)
      startTransition(() => router.refresh())
    }
  }

  interface NotaFeedEntry { id: string; nota: string; autor: string; fecha: string }
  const [notasFeed, setNotasFeed] = useState<NotaFeedEntry[]>([])

  useEffect(() => {
    if (empresa.notas_admin) {
      try {
        const parsed = JSON.parse(empresa.notas_admin)
        if (Array.isArray(parsed)) {
          setNotasFeed(parsed)
        } else {
          throw new Error('Not array')
        }
      } catch {
        setNotasFeed([{ id: 'legacy', nota: empresa.notas_admin, autor: 'Equipo Interno', fecha: empresa.created_at }])
      }
    }
  }, [empresa.notas_admin, empresa.created_at])

  async function guardarNotas() {
    const htmlNotas = editorRef.current?.getHTML() ?? ''
    if (!htmlNotas || htmlNotas === '<p></p>') return
    
    setGuardando(true)
    
    const fechaActual = new Date()
    
    const nuevaNota = {
      id: crypto.randomUUID(),
      nota: htmlNotas,
      autor: adminNombre,
      fecha: fechaActual.toISOString()
    }
    const nuevoFeed = [...notasFeed, nuevaNota]
    
    await fetch(`/api/admin/empresas/${empresa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas_admin: JSON.stringify(nuevoFeed) }),
    })
    
    setNotasFeed(nuevoFeed)
    editorRef.current?.clear()
    
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
    <div className="w-full">
      {/* Header con ← integrado en el título */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              onClick={() => router.back()}
              style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              <ArrowLeft size={20} />
              {empresa.nombre}
            </h1>
            <PlanBadge plan={empresa.plan} />
            {!activa && (
              <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(255,94,75,0.10)', color: '#CC3C2A' }}>
                Desactivada
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={() => router.refresh()}
            >
              Actualizar
            </Button>
            <Button
              variant={activa ? 'danger' : 'primary'}
              size="sm"
              icon={<Power size={13} />}
              loading={cambiandoActiva}
              onClick={toggleActiva}
            >
              {activa ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 28 }}>
          Activa desde {fechaActivacion}
        </p>
      </div>

      {/* Alerta de datos operativos faltantes */}
      {(!empresa.nit || !empresa.telefono || !empresa.pais || !empresa.ciudad || !empresa.direccion) && (
        <div 
          className="flex items-start gap-3 p-4 mb-5 rounded-2xl border"
          style={{
            background: 'rgba(246, 191, 62, 0.08)',
            borderColor: 'rgba(246, 191, 62, 0.25)',
            color: 'var(--text-primary)'
          }}
        >
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-[var(--text-primary)] m-0">Datos operativos incompletos</p>
            <p className="text-[11px] text-[var(--text-secondary)] m-0.5">
              Esta empresa fue registrada previamente y no cuenta con todos los datos obligatorios. Completa el NIT, teléfono y ubicación en la sección &quot;Información general&quot; para normalizar su estado.
            </p>
          </div>
        </div>
      )}

      {/* KPIs de uso */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard titulo="Empleados" valor={totalEmpleados} limite={planReal.limite_empleados ?? Infinity} icono={Users} color="#00827C" />
        <KpiCard titulo="Cálculos este mes" valor={calculosMes} limite={planReal.limite_calculos_mes ?? Infinity} icono={Calculator} color="#59A6E4" />
        <div className="rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg-card)] relative">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: PLAN_CONFIG[plan]?.bg ?? 'rgba(160,130,200,0.12)', transition: 'background 0.3s', flexShrink: 0 }}>
              <Sparkles size={16} style={{ color: PLAN_CONFIG[plan]?.color ?? '#9B6DD6', transition: 'color 0.3s' }} />
            </div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Plan actual</p>
          </div>
          <div className="relative mt-2 inline-block">
            <button
              type="button"
              onClick={() => setMenuPlanAbierto(v => !v)}
              disabled={guardandoPlan}
              className="flex items-center gap-2 p-1.5 rounded-full border transition-all cursor-pointer text-left hover:bg-[var(--bg-hover)]"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border)',
                paddingRight: '12px'
              }}
            >
              <PlanBadge plan={plan} />
              <ChevronDown size={14} className="text-[var(--text-secondary)]" />
            </button>

            {menuPlanAbierto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuPlanAbierto(false)} />
                <div
                  className="absolute top-full left-0 mt-1.5 w-56 border rounded-xl shadow-lg z-50 overflow-hidden"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border)'
                  }}
                >
                  <div className="p-1 flex flex-col gap-0.5">
                    {(Object.keys(PLAN_CONFIG) as Plan[]).map(p => {
                      const cfg = PLAN_CONFIG[p]
                      const Icono = cfg.icon
                      const activo = p === plan
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => cambiarPlan(p)}
                          className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Icono size={14} color={cfg.color} />
                            <span className="text-xs font-bold text-[var(--text-primary)]">{cfg.label}</span>
                          </div>
                          {activo && <CheckCircle size={14} color={cfg.color} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          {guardandoPlan && <p className="text-xs mt-2 text-[var(--text-secondary)] font-semibold animate-pulse">Guardando cambio...</p>}

          {/* Qué incluye el plan — debajo del nombre del plan, colapsado
              detrás de un "+" (lista, no un párrafo de texto plano), a
              pedido del usuario 2026-09-04. Lee planReal (config_planes o
              empresas_negociaciones, lo que aplique), nunca un número fijo. */}
          <button
            type="button"
            onClick={() => setVerDetallePlan(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {verDetallePlan ? <Minus size={12} /> : <Plus size={12} />}
            {planReal.origen === 'negociacion' ? 'Negociación propia' : 'Qué incluye este plan'}
          </button>

          {verDetallePlan && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {([
                { icono: Calculator, valor: planReal.limite_calculos_mes, etiqueta: 'cálculos/mes' },
                { icono: FileText, valor: planReal.limite_informes_mes, etiqueta: 'informes/mes' },
                { icono: ClipboardList, valor: planReal.limite_cotizaciones_mes, etiqueta: 'cotizaciones/mes' },
                { icono: Users, valor: planReal.limite_empleados, etiqueta: 'empleados' },
              ]).map(({ icono: Icono, valor, etiqueta }) => (
                <div key={etiqueta} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-primary)' }}>
                  <Icono size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <strong>{valor ?? '∞'}</strong> {etiqueta}
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-primary)' }}>
                <Sparkles size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <strong>${planReal.precio_cop.toLocaleString('es-CO')} COP</strong> / mes
                {planReal.precio_anual_cop != null && (
                  <span style={{ color: 'var(--text-secondary)' }}>(≈${planReal.precio_anual_cop.toLocaleString('es-CO')}/año)</span>
                )}
              </div>
            </div>
          )}

          {/* Ciclo de facturación (sql/119) — dato manual, el super_admin
              lo marca a mano porque no hay pasarela de pagos integrada.
              A pedido del usuario 2026-09-04: "es un texto... la vigencia,
              si es mensual o anual", con fecha de renovación. */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {(['mensual', 'anual'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={guardandoCiclo}
                  onClick={() => { setCiclo(c); guardarCiclo(c, renovacion) }}
                  style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    border: `1px solid ${ciclo === c ? 'var(--color-brand)' : 'var(--border)'}`,
                    background: ciclo === c ? 'var(--color-brand)' : 'transparent',
                    color: ciclo === c ? 'var(--text-on-brand)' : 'var(--text-secondary)',
                    cursor: guardandoCiclo ? 'wait' : 'pointer',
                  }}
                >
                  {c === 'mensual' ? 'Mensual' : 'Anual'}
                </button>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
              <Calendar size={13} />
              Próxima renovación
              <input
                type="date"
                value={renovacion}
                onChange={(e) => { setRenovacion(e.target.value); guardarCiclo(ciclo, e.target.value) }}
                style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full items-stretch">
        {/* Notas admin */}
        <div className="rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg-card)] flex flex-col h-full">
          <p className="text-xs font-semibold mb-3 text-[var(--text-secondary)]">Notas privadas</p>
          <div className="flex flex-col gap-2 mb-3 max-h-[300px] overflow-y-auto">
            {notasFeed.map(n => {
              const autorLimpio = n.autor ? n.autor.split('·')[0].trim() : 'Equipo Interno'
              const fechaValida = n.fecha && !isNaN(new Date(n.fecha).getTime())
              const fechaTexto = fechaValida
                ? new Date(n.fecha).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : ''
              return (
                <div key={n.id} className="rounded-xl p-2.5 bg-[var(--bg-input)]">
                  <div
                    className="text-[13px] font-normal break-words whitespace-pre-wrap text-[var(--text-primary)]"
                    dangerouslySetInnerHTML={{ __html: n.nota }}
                  />
                  <p className="text-[10px] mt-1 text-[var(--text-secondary)]">
                    {autorLimpio}{fechaTexto ? ` · ${fechaTexto}` : ''}
                  </p>
                </div>
              )
            })}
          </div>
          <RichTextEditor
            ref={editorRef}
            initialHTML=""
            minHeightPx={60}
            placeholder="Escribe una nota interna…"
            onEnviar={guardarNotas}
            className="mb-3"
            footer={
              <div className="flex justify-end px-2 pb-2">
                <Button
                  onClick={guardarNotas}
                  loading={guardando}
                  variant="primary"
                  size="sm"
                  icon={guardado ? <CheckCircle size={14} /> : <Save size={14} />}
                >
                  {guardado ? 'Guardado' : 'Guardar'}
                </Button>
              </div>
            }
          />
        </div>

        {/* Actividad / Historial de cambios */}
        <div className="rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg-card)] flex flex-col h-full">
          <p className="text-xs font-semibold mb-3 text-[var(--text-secondary)]">Actividad</p>

          {(() => {
            const actividadesFiltradas = historialPlan.filter((entry) => {
              const keys = Object.keys(entry.cambios).filter(k => k !== 'notas_admin')
              return keys.length > 0
            })

            if (actividadesFiltradas.length === 0) {
              return <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Sin actividad registrada.</p>
            }

            const MAX_COLLAPSED = 4
            const itemsAMostrar = mostrarTodasActividades ? actividadesFiltradas : actividadesFiltradas.slice(0, MAX_COLLAPSED)

            return (
              <div className="flex flex-col justify-between flex-1 min-h-0">
                <div className={`flex flex-col gap-2.5 min-h-0 transition-all duration-300 ${mostrarTodasActividades ? 'max-h-[280px] overflow-y-auto pr-1' : 'max-h-[200px] overflow-hidden'}`}>
                  {itemsAMostrar.map((entry, i) => {
                    const cambiosLimpios = { ...entry.cambios }
                    delete cambiosLimpios.notas_admin

                    const keys = Object.keys(cambiosLimpios)
                    const tienePlan = keys.includes('plan')
                    const tienePorQueElegirnos = keys.some(k => k.includes('por_que_elegirnos'))
                    const tieneInfoGeneral = keys.some(k => k !== 'plan' && !k.includes('por_que_elegirnos'))

                    const partes: string[] = []

                    if (tieneInfoGeneral) {
                      partes.push('Actualizó información general')
                    }

                    if (tienePorQueElegirnos) {
                      partes.push('Actualizó sección "¿Por qué elegirnos?"')
                    }

                    if (tienePlan) {
                      const nombresPlanes: Record<string, string> = {
                        free: 'Explora',
                        lab: 'Circular Lab',
                        impulso: 'Impulso Sostenible',
                        ilimitado: 'Impacto Ilimitado'
                      }
                      const planVal = String(cambiosLimpios.plan)
                      const planNombre = nombresPlanes[planVal] || planVal
                      partes.push(`Cambió plan a "${planNombre}"`)
                    }

                    const label = partes.join(' · ') || 'Actualizó información general'

                    const rolFormatted = entry.adminRol ? (entry.adminRol.charAt(0).toUpperCase() + entry.adminRol.slice(1).toLowerCase()) : ''
                    const fechaHora = new Date(entry.created_at).toLocaleString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    const metaText = [entry.admin, rolFormatted, fechaHora].filter(Boolean).join(' · ')

                    return (
                      <div key={i} className="py-0.5">
                        <p className="text-[13px] font-normal text-[var(--text-primary)] whitespace-normal break-words">{label}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          {metaText}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {actividadesFiltradas.length > MAX_COLLAPSED && (
                  <button
                    type="button"
                    onClick={() => setMostrarTodasActividades(v => !v)}
                    className="mt-3 text-xs font-medium text-[var(--text-primary)] hover:underline text-left cursor-pointer pt-1"
                  >
                    {mostrarTodasActividades 
                      ? 'Ver menos' 
                      : `+${actividadesFiltradas.length - MAX_COLLAPSED} más`}
                  </button>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
