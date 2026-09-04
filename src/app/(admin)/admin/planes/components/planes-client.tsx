'use client'

import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Button } from '@/components/ui/button'
import { Square, SquareCheck, Users, Calculator, FileText, ClipboardList } from '@/components/ui/icons'
import { useToast } from '@/components/toast-provider'
import { PLAN_CONFIG } from '@/components/admin/plan-badge'

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
  // Límite de cotizaciones/mes (sql/118) — antes "Cotizador" era solo Sí/No
  // por plan (acceso al módulo), sin tope mensual.
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

// Tarjeta chica de estadística — reemplaza la frase larga "Publicado hoy: X
// · Y · Z" por algo que se lee de un vistazo. Ícono en círculo de color +
// número grande: mismo lenguaje visual que <KpiCard> en
// estado-cuenta-client.tsx (ya usado y aprobado en este mismo panel admin),
// no un patrón nuevo — ajustado 2026-09-04 tras 3 rondas de feedback del
// usuario pidiendo algo "con más diseño, más estético" como sus referentes
// (números grandes como protagonistas, ícono con color de identidad, fondo
// plano sin borde).
function ChipResumen({ icono: Icono, valor, etiqueta, color }: { icono: React.ElementType; valor: string | number; etiqueta: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg-input)', borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
      <div style={{ width: 30, height: 30, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: `${color}18` }}>
        <Icono size={15} color={color} />
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)' }}>{valor}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 3 }}>{etiqueta}</div>
    </div>
  )
}

// Separa cada bloque de campos (mensual / anual / límites) con una línea
// fina, no con una caja propia — antes cada bloque tenía su fondo y su
// borde, y el usuario lo rechazó dos veces ("esos colores... lejos del
// sistema de diseño", luego "no me gusta todo tan encerrado", con un
// referente visual de tarjetas SIN borde separadas solo por líneas finas).
// var(--divider) es justo el token para esa línea (más tenue que
// var(--border), pensado para separar contenido dentro de una misma
// tarjeta, no para encerrar una caja nueva).
function SeccionCard({ titulo, accion, ultima, children }: { titulo: string; accion?: React.ReactNode; ultima?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: ultima ? 'none' : '1px solid var(--divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{titulo}</span>
        {accion}
      </div>
      {children}
    </div>
  )
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

  const cfg = PLAN_CONFIG[plan.id]
  const IconoPlan = cfg.icon

  return (
    <div style={{ borderRadius: 20, border: '1px solid var(--border)', padding: 22, background: 'var(--bg-card)' }}>
      {/* Ícono + nombre con el color de identidad del plan — el mismo
          PLAN_CONFIG que ya usa <PlanBadge> en toda la plataforma, no un
          color nuevo. Antes las 4 tarjetas se veían idénticas entre sí
          (mismo gris, mismo peso tipográfico); esto le da a cada plan su
          propia identidad de un vistazo, a pedido del usuario 2026-09-04
          tras 3 rondas pidiendo "más diseño, más estético". */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
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

      {/* Precio como cifra protagonista (patrón del referente: un número
          grande al frente, el dato secundario chico al lado) — antes el
          precio mensual era un chip más, del mismo tamaño que los demás. */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
          ${plan.precio_cop.toLocaleString('es-CO')}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>COP / mes</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 18px' }}>
        ≈ ${(plan.precio_anual_cop ?? plan.precio_cop * 10).toLocaleString('es-CO')} COP al año
      </p>

      {/* Resumen de límites — antes era una frase larga con 5 datos
          separados por "·". Ahora son 4 tarjetas de estadística con ícono,
          a pedido del usuario 2026-09-04. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8, marginBottom: 18 }}>
        <ChipResumen icono={Users} color={cfg.color} valor={plan.limite_empleados ?? '∞'} etiqueta="empleados" />
        <ChipResumen icono={Calculator} color={cfg.color} valor={plan.limite_calculos_mes ?? '∞'} etiqueta="cálculos/mes" />
        <ChipResumen icono={FileText} color={cfg.color} valor={plan.limite_informes_mes ?? '∞'} etiqueta="informes/mes" />
        <ChipResumen icono={ClipboardList} color={cfg.color} valor={plan.limite_cotizaciones_mes ?? '∞'} etiqueta="cotizaciones/mes" />
      </div>

      {/* Un solo bloque con línea superior + separadores internos finos,
          nunca 3 cajas con borde propio — a pedido del usuario 2026-09-04
          tras ver un referente visual de tarjetas sin encierro. */}
      <div style={{ borderTop: '1px solid var(--divider)' }}>
        <SeccionCard titulo="Precio mensual">
          {/* Editar el mensual recalcula el anual automáticamente (mensual x
              10, "2 meses gratis") — a pedido del usuario 2026-09-03. El anual
              sigue siendo editable por separado después: solo se pisa cuando
              se vuelve a tocar ESTE campo mensual, no en cada render. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
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
        </SeccionCard>

        <SeccionCard
          titulo="Precio anual"
          accion={
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
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
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
        </SeccionCard>

        <SeccionCard titulo="Límites de uso" ultima>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <CampoIlimitado label="Empleados" valor={borrador.borrador_limite_empleados} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_empleados: v }))} />
            <CampoIlimitado label="Cálculos/mes" valor={borrador.borrador_limite_calculos_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_calculos_mes: v }))} />
            <CampoIlimitado label="Informes/mes" valor={borrador.borrador_limite_informes_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_informes_mes: v }))} />
            <CampoIlimitado label="Cotizaciones/mes" valor={borrador.borrador_limite_cotizaciones_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_cotizaciones_mes: v }))} />
          </div>
        </SeccionCard>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" onClick={guardarBorrador} loading={guardando}>Guardar borrador</Button>
        <Button variant="primary" size="sm" onClick={publicar} loading={publicando} disabled={!plan.tiene_borrador_sin_publicar}>Publicar</Button>
      </div>
    </div>
  )
}


export function PlanesClient() {
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:grid-cols-2">
          {planes.map(plan => (
            <TarjetaPlan key={plan.id} plan={plan} onGuardado={cargar} />
          ))}
        </div>
      )}

      {/* La negociación por empresa ya no vive aquí — se movió a la ficha
          de cada empresa (2026-09-04, a pedido del usuario: "eso debe ir en
          cada empresa"). */}
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 24, textAlign: 'center' }}>
        ¿Necesitas precios o límites distintos para una empresa puntual? Eso se negocia desde su propia ficha en{' '}
        <a href="/admin/empresas" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>Empresas</a>.
      </p>
    </div>
  )
}
