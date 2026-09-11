'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  Users,
  Calculator,
  FileText,
  ClipboardList,
  Square,
  SquareCheck,
  Sparkles,
  IdCard,
  Plus,
  Trash,
  GripVertical,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from '@/components/ui/icons'
import { useToast } from '@/components/toast-provider'
import { PLAN_CONFIG } from '@/components/admin/plan-badge'
import { CampoLimiteGrande, BloqueMoneda, MONEDAS } from '@/components/admin/plan-campos'
import { Skeleton } from '@/components/ui/skeleton'
import { SwitchOpciones } from '@/components/ui/switch-opciones'
import { PLANS } from '@/lib/constants/pricing'

// Skeleton con la misma forma real de una tarjeta de plan:
// 1. Ícono + nombre
// 2. Límites (fila de 5)
// 3. Precios (fila de 3 monedas)
// 4. Capacidades de IA
// 5. Beneficios plegable
function TarjetaPlanSkeleton() {
  return (
    <div style={{ borderRadius: 20, border: '1px solid var(--border)', padding: 24, background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Skeleton style={{ width: 38, height: 38, borderRadius: 11 }} />
        <Skeleton style={{ width: 120, height: 20 }} />
      </div>
      {/* 1. Límites */}
      <Skeleton style={{ width: 70, height: 14, marginBottom: 14 }} />
      <div className="grid grid-cols-2 md:grid-cols-5" style={{ display: 'grid', gap: 16, marginBottom: 28 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i}>
            <Skeleton style={{ width: '80%', height: 12, marginBottom: 8 }} />
            <Skeleton style={{ width: '60%', height: 26 }} />
          </div>
        ))}
      </div>
      {/* 2. Precios */}
      <Skeleton style={{ width: 60, height: 14, marginBottom: 14 }} />
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ display: 'grid', gap: 20, marginBottom: 28 }}>
        {[0, 1, 2].map(i => (
          <div key={i}>
            <Skeleton style={{ width: '90%', height: 16, marginBottom: 14 }} />
            <Skeleton style={{ width: '100%', height: 38, marginBottom: 14, borderRadius: 8 }} />
            <Skeleton style={{ width: '100%', height: 38, borderRadius: 8 }} />
          </div>
        ))}
      </div>
      {/* 3. Capacidades de IA */}
      <Skeleton style={{ width: 130, height: 14, marginBottom: 12 }} />
      <Skeleton style={{ width: '100%', height: 42, marginBottom: 24, borderRadius: 10 }} />
      {/* 4. Beneficios */}
      <Skeleton style={{ width: '100%', height: 36, borderRadius: 8 }} />
    </div>
  )
}

// Pestaña "Precios" de /admin/contenido — antes era la página completa
// /admin/planes, absorbida aquí a pedido del usuario 2026-09-04 ("la
// pestaña 'precios' en /admin/contenido elimina /admin/planes"). Mismo
// endpoint de siempre (/api/admin/planes, borrador→publicar), solo cambió
// dónde vive y su diseño visual (ver src/components/admin/plan-campos.tsx).
//
// Autoguardado + "Publicar todo" (2026-09-04, 2ª pasada): antes cada
// tarjeta tenía su propio "Guardar borrador"/"Publicar". El usuario pidió
// autoguardado (nunca más un clic para guardar el borrador) pero
// preguntado explícitamente, confirmó que quería SEGUIR necesitando un
// clic para publicar — solo que ahora es UN botón para los 4 planes a la
// vez, no uno por tarjeta. El borrador sigue sin afectar a nadie hasta
// ese clic, la red de seguridad no se toca.

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
  incluye_ia: boolean
  limite_dpp_mes: number | null
  features_json: string[] | null
  equivalente_mensual_anual_cop: number | null
  equivalente_mensual_anual_usd: number | null
  equivalente_mensual_anual_eur: number | null
  borrador_incluye_ia: boolean | null
  borrador_limite_dpp_mes: number | null
  borrador_features_json: string[] | null
  borrador_equivalente_mensual_anual_cop: number | null
  borrador_equivalente_mensual_anual_usd: number | null
  borrador_equivalente_mensual_anual_eur: number | null
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

export interface TarjetaPlanHandle {
  // Guarda el borrador y publica en un solo viaje al servidor — se llama
  // solo cuando el usuario pulsa "Publicar todo", nunca mientras escribe.
  publicar: () => Promise<boolean>
}

const TarjetaPlan = forwardRef<TarjetaPlanHandle, { plan: ConfigPlan; onCambio: (planId: string, pendiente: boolean) => void }>(function TarjetaPlan({ plan, onCambio }, ref) {
  const featuresLanding = PLANS.find(p => p.id === plan.id)?.features ?? []
  const featuresIniciales = (plan.borrador_features_json && plan.borrador_features_json.length > 0)
    ? plan.borrador_features_json
    : (plan.features_json && plan.features_json.length > 0)
      ? plan.features_json
      : featuresLanding

  const valorInicial = {
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
    borrador_incluye_ia: plan.borrador_incluye_ia ?? plan.incluye_ia,
    borrador_limite_dpp_mes: plan.borrador_limite_dpp_mes ?? plan.limite_dpp_mes,
    borrador_features_json: featuresIniciales,
    borrador_equivalente_mensual_anual_cop: plan.borrador_equivalente_mensual_anual_cop ?? plan.equivalente_mensual_anual_cop,
    borrador_equivalente_mensual_anual_usd: plan.borrador_equivalente_mensual_anual_usd ?? plan.equivalente_mensual_anual_usd,
    borrador_equivalente_mensual_anual_eur: plan.borrador_equivalente_mensual_anual_eur ?? plan.equivalente_mensual_anual_eur,
  }
  const [borrador, setBorrador] = useState(valorInicial)
  const [beneficiosAbierto, setBeneficiosAbierto] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  // Snapshot del valor inicial, capturado UNA vez al montar (no dentro del
  // efecto) — comparar contra esto es lo que decide si hay algo real que
  // publicar, en vez de una bandera "primera vez" mutable. Un ref con
  // bandera se rompía con Strict Mode de React (double-invoke en
  // desarrollo): las 4 tarjetas disparaban un aviso espurio apenas se
  // cargaba la página, sin que el usuario tocara nada — bug real
  // encontrado y corregido 2026-09-04 antes de comitear.
  const baseline = useRef(valorInicial).current

  // Solo marca "hay algo pendiente" para habilitar "Publicar todo" — sin
  // llamar al servidor. El borrador vive únicamente en este estado local
  // mientras se escribe; antes cada tecla disparaba un guardado en la base
  // 500ms después, lo que se sentía lento con cualquier latencia de red.
  // Ahora un solo viaje al servidor ocurre al publicar (ver `publicar` más
  // abajo), no en cada cambio — corregido 2026-09-10 a pedido del usuario.
  useEffect(() => {
    const hayCambios = JSON.stringify(borrador) !== JSON.stringify(baseline)
    onCambio(plan.id, hayCambios)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrador])

  useImperativeHandle(ref, () => ({
    async publicar() {
      const resGuardar = await fetch('/api/admin/planes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Los beneficios vacíos (recién agregados, todavía sin escribir) no
        // se envían — el schema del servidor los rechazaría.
        body: JSON.stringify({ ...borrador, id: plan.id, borrador_features_json: borrador.borrador_features_json.filter(f => f.trim() !== '') }),
      })
      if (!resGuardar.ok) {
        const errJson = await resGuardar.json().catch(() => ({}))
        console.error(`[PreciosTab] Error al guardar borrador de ${plan.id}:`, errJson)
        return false
      }
      const resPublicar = await fetch(`/api/admin/planes/${plan.id}/publicar`, { method: 'POST' })
      if (!resPublicar.ok) {
        const errJson = await resPublicar.json().catch(() => ({}))
        console.error(`[PreciosTab] Error al publicar ${plan.id}:`, errJson)
        return false
      }
      return true
    },
  }), [borrador, plan.id])

  function cambiarMensual(campo: 'cop' | 'usd' | 'eur', v: number) {
    const anual = Math.round(v * 10 * 100) / 100
    const bruto = anual / 12
    const equiv = campo === 'cop' ? Math.floor(bruto / 10000) * 10000 : Math.floor(bruto)
    setBorrador(b => ({
      ...b,
      [`borrador_precio_${campo}`]: v,
      [`borrador_precio_anual_${campo}`]: anual,
      [`borrador_equivalente_mensual_anual_${campo}`]: equiv,
    }))
  }

  function cambiarAnual(campo: 'cop' | 'usd' | 'eur', v: number) {
    const bruto = v / 12
    const equiv = campo === 'cop' ? Math.floor(bruto / 10000) * 10000 : Math.floor(bruto)
    setBorrador(b => ({
      ...b,
      [`borrador_precio_anual_${campo}`]: v,
      [`borrador_equivalente_mensual_anual_${campo}`]: equiv,
    }))
  }

  function cambiarBeneficio(i: number, texto: string) {
    setBorrador(b => ({ ...b, borrador_features_json: b.borrador_features_json.map((f, j) => j === i ? texto : f) }))
  }
  function quitarBeneficio(i: number) {
    setBorrador(b => ({ ...b, borrador_features_json: b.borrador_features_json.filter((_, j) => j !== i) }))
  }
  function agregarBeneficio() {
    setBorrador(b => ({ ...b, borrador_features_json: [...b.borrador_features_json, ''] }))
  }
  function moverBeneficio(de: number, a: number) {
    if (de === a || de < 0 || a < 0) return
    setBorrador(b => {
      const lista = [...b.borrador_features_json]
      if (de >= lista.length || a >= lista.length) return b
      const [movida] = lista.splice(de, 1)
      lista.splice(a, 0, movida)
      return { ...b, borrador_features_json: lista }
    })
  }

  const cfg = PLAN_CONFIG[plan.id]
  const IconoPlan = cfg.icon
  const hayCambiosLocales = JSON.stringify(borrador) !== JSON.stringify(baseline)
  const tieneCambiosSinPublicar = plan.tiene_borrador_sin_publicar || hayCambiosLocales

  return (
    <div style={{ borderRadius: 20, border: '1px solid var(--border)', padding: 24, background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${cfg.color}18`, flexShrink: 0 }}>
            <IconoPlan size={19} color={cfg.color} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{NOMBRES[plan.id]}</h3>
        </div>
        {tieneCambiosSinPublicar && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-warning)', background: 'var(--color-warning)1A', padding: '2px 8px', borderRadius: 999 }}>
            Cambios sin publicar
          </span>
        )}
      </div>

      {/* 1. Límites */}
      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Límites</h4>
      <div className="grid grid-cols-2 md:grid-cols-5" style={{ display: 'grid', gap: 16, marginBottom: 28 }}>
        <CampoLimiteGrande icono={Users} label="Empleados" valor={borrador.borrador_limite_empleados} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_empleados: v }))} />
        <CampoLimiteGrande icono={Calculator} label="Cálculos/mes" valor={borrador.borrador_limite_calculos_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_calculos_mes: v }))} />
        <CampoLimiteGrande icono={FileText} label="Informes/mes" valor={borrador.borrador_limite_informes_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_informes_mes: v }))} />
        <CampoLimiteGrande icono={ClipboardList} label="Cotizaciones/mes" valor={borrador.borrador_limite_cotizaciones_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_cotizaciones_mes: v }))} />
        <CampoLimiteGrande icono={IdCard} label="DPP/mes" valor={borrador.borrador_limite_dpp_mes} onChange={(v) => setBorrador(b => ({ ...b, borrador_limite_dpp_mes: v }))} />
      </div>

      {/* 2. Precios */}
      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Precios</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ display: 'grid', gap: 20, marginBottom: 28 }}>
        {MONEDAS.map((moneda) => (
          <BloqueMoneda
            key={moneda.codigo}
            moneda={moneda}
            mensual={borrador[`borrador_precio_${moneda.codigo}`]}
            anual={borrador[`borrador_precio_anual_${moneda.codigo}`]}
            equivalenteMensual={borrador[`borrador_equivalente_mensual_anual_${moneda.codigo}`]}
            onMensualChange={(v) => cambiarMensual(moneda.codigo, v)}
            onAnualChange={(v) => cambiarAnual(moneda.codigo, v)}
            onEquivalenteMensualChange={(v) => setBorrador(b => ({ ...b, [`borrador_equivalente_mensual_anual_${moneda.codigo}`]: v }))}
          />
        ))}
      </div>

      {/* 3. Capacidades de IA */}
      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Capacidades de IA</h4>
      <button
        type="button"
        onClick={() => setBorrador(b => ({ ...b, borrador_incluye_ia: !b.borrador_incluye_ia }))}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 28,
          fontSize: 13,
          color: 'var(--text-primary)',
          background: borrador.borrador_incluye_ia ? 'rgba(0,130,124,0.06)' : 'var(--bg-input)',
          border: `1px solid ${borrador.borrador_incluye_ia ? 'rgba(0,130,124,0.3)' : 'var(--border)'}`,
          borderRadius: 10,
          padding: '10px 14px',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          transition: 'all 0.15s ease',
        }}
      >
        {borrador.borrador_incluye_ia ? (
          <SquareCheck size={16} sinAnimacion style={{ color: 'var(--color-brand)', flexShrink: 0 }} />
        ) : (
          <Square size={16} sinAnimacion style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        )}
        <Sparkles size={14} style={{ color: borrador.borrador_incluye_ia ? 'var(--color-brand)' : 'var(--text-secondary)', flexShrink: 0 }} />
        <span style={{ flex: 1, lineHeight: 1.4 }}>
          Activa la IA para DPP y el cotizador. Si no se activa, se crean manualmente.
        </span>
      </button>

      {/* 4. Beneficios desplegables (cerrado por defecto, reordenable estilo FAQ) */}
      <div style={{ marginBottom: 24, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
        <button
          type="button"
          onClick={() => setBeneficiosAbierto(v => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Beneficios</h4>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-secondary)',
                background: 'var(--bg-hover)',
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px solid var(--border)',
              }}
            >
              {borrador.borrador_features_json.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
            <span>{beneficiosAbierto ? 'Ocultar' : 'Ver lista'}</span>
            <ChevronDown
              size={15}
              sinAnimacion
              style={{
                transform: beneficiosAbierto ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </div>
        </button>

        {beneficiosAbierto && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              La lista que ve la persona en la tarjeta de este plan, en la landing. Puedes arrastrar para reordenar, editar, eliminar o agregar beneficios.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {borrador.borrador_features_json.map((f, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== i) moverBeneficio(dragIndex, i)
                    setDragIndex(null)
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    opacity: dragIndex === i ? 0.4 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div
                    title="Arrastra para cambiar el orden"
                    style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}
                  >
                    <GripVertical size={14} sinAnimacion />
                  </div>
                  <input
                    type="text"
                    value={f}
                    placeholder="Escribe el beneficio..."
                    onChange={(e) => cambiarBeneficio(i, e.target.value)}
                    maxLength={140}
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      padding: '2px 0',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moverBeneficio(i, i - 1)}
                      title="Subir"
                      aria-label="Subir beneficio"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: i === 0 ? 'default' : 'pointer',
                        opacity: i === 0 ? 0.2 : 0.7,
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        padding: 3,
                        borderRadius: 4,
                      }}
                    >
                      <ArrowUp size={12} sinAnimacion />
                    </button>
                    <button
                      type="button"
                      disabled={i === borrador.borrador_features_json.length - 1}
                      onClick={() => moverBeneficio(i, i + 1)}
                      title="Bajar"
                      aria-label="Bajar beneficio"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: i === borrador.borrador_features_json.length - 1 ? 'default' : 'pointer',
                        opacity: i === borrador.borrador_features_json.length - 1 ? 0.2 : 0.7,
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        padding: 3,
                        borderRadius: 4,
                      }}
                    >
                      <ArrowDown size={12} sinAnimacion />
                    </button>
                    <button
                      type="button"
                      onClick={() => quitarBeneficio(i)}
                      title="Eliminar beneficio"
                      aria-label="Eliminar beneficio"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-error, #EF4444)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <Trash size={13} sinAnimacion />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={agregarBeneficio}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--color-brand)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <Plus size={14} sinAnimacion /> Agregar beneficio
            </button>
          </div>
        )}
      </div>

      {/* Nada se manda al servidor mientras escribes — solo al pulsar
          "Publicar todo" arriba. Este aviso es puramente local. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
        {hayCambiosLocales ? (
          <><Square size={13} sinAnimacion style={{ color: 'var(--color-warning)' }} /> Cambios sin guardar en este navegador</>
        ) : (
          <><CheckCircle size={13} style={{ color: 'var(--color-success)' }} /> Sin cambios pendientes</>
        )}
      </div>
    </div>
  )
})

// Cuadro comparativo del popup "Ver más" de la landing (debajo de los
// precios) — 100% editable desde aquí, guardado aparte de los planes en sí
// (usa contenido_landing, clave 'comparativa_planes', el mismo mecanismo
// genérico ya usado para FAQ/WhatsApp, sin borrador→publicar porque no es
// dato sensible de precio). Empieza vacío a propósito: el contenido de
// negocio (categorías y filas reales) lo define el super_admin, nunca se
// inventa aquí.
type TipoFilaComparativa = 'check' | 'texto'
interface FilaComparativa {
  label: string
  tipo: TipoFilaComparativa
  valores: Record<string, string | boolean>
}
interface CategoriaComparativa {
  nombre: string
  filas: FilaComparativa[]
}

const inputComparativaStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  width: '100%',
}

function ComparativaEditor({ planes }: { planes: ConfigPlan[] }) {
  const { toast } = useToast()
  const [categorias, setCategorias] = useState<CategoriaComparativa[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    fetch('/api/admin/contenido?clave=comparativa_planes')
      .then(r => r.json())
      .then(({ data }) => {
        const fila = Array.isArray(data) ? data[0] : null
        const cats = (fila?.valor_json?.categorias as CategoriaComparativa[] | undefined) ?? []
        setCategorias(cats)
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  function valoresVacios(): Record<string, string | boolean> {
    return Object.fromEntries(planes.map(p => [p.id, '']))
  }

  function agregarCategoria() {
    setCategorias(c => [...c, { nombre: '', filas: [] }])
  }
  function eliminarCategoria(i: number) {
    setCategorias(c => c.filter((_, idx) => idx !== i))
  }
  function moverCategoria(de: number, a: number) {
    if (a < 0 || a >= categorias.length) return
    setCategorias(c => {
      const lista = [...c]
      const [movida] = lista.splice(de, 1)
      lista.splice(a, 0, movida)
      return lista
    })
  }
  function cambiarNombreCategoria(i: number, nombre: string) {
    setCategorias(c => c.map((cat, idx) => idx === i ? { ...cat, nombre } : cat))
  }
  function agregarFila(i: number) {
    setCategorias(c => c.map((cat, idx) => idx === i
      ? { ...cat, filas: [...cat.filas, { label: '', tipo: 'check' as TipoFilaComparativa, valores: valoresVacios() }] }
      : cat))
  }
  function eliminarFila(i: number, j: number) {
    setCategorias(c => c.map((cat, idx) => idx === i ? { ...cat, filas: cat.filas.filter((_, fj) => fj !== j) } : cat))
  }
  function moverFila(i: number, de: number, a: number) {
    setCategorias(c => c.map((cat, idx) => {
      if (idx !== i) return cat
      if (a < 0 || a >= cat.filas.length) return cat
      const lista = [...cat.filas]
      const [movida] = lista.splice(de, 1)
      lista.splice(a, 0, movida)
      return { ...cat, filas: lista }
    }))
  }
  function cambiarFila(i: number, j: number, cambios: Partial<FilaComparativa>) {
    setCategorias(c => c.map((cat, idx) => idx === i
      ? { ...cat, filas: cat.filas.map((f, fj) => fj === j ? { ...f, ...cambios } : f) }
      : cat))
  }
  function cambiarValor(i: number, j: number, planId: string, valor: string | boolean) {
    setCategorias(c => c.map((cat, idx) => idx === i
      ? { ...cat, filas: cat.filas.map((f, fj) => fj === j ? { ...f, valores: { ...f.valores, [planId]: valor } } : f) }
      : cat))
  }

  async function guardar() {
    setGuardando(true)
    try {
      const res = await fetch('/api/admin/contenido', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'comparativa_planes', valor_json: { categorias } }),
      })
      if (!res.ok) throw new Error()
      toast.success('Cuadro comparativo guardado. Ya se ve así en el popup "Ver más" de la landing.')
    } catch {
      toast.error('No se pudo guardar el cuadro comparativo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Cuadro comparativo de planes</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0', maxWidth: 640 }}>
            Se ve en la landing al pulsar &quot;Ver más&quot; debajo de los precios. Agrupa por categorías (ej. &quot;Uso y límites&quot;, &quot;Cálculo Ambiental&quot;) y cada fila puede ser una casilla (sí/no) o un texto libre (&quot;5 al mes&quot;, &quot;Ilimitado&quot;).
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={guardar} loading={guardando}>
          Guardar comparativa
        </Button>
      </div>

      {cargando ? (
        <Skeleton style={{ height: 160, borderRadius: 16 }} />
      ) : (
        <>
          {categorias.length === 0 && (
            <div style={{ border: '1px dashed var(--border)', borderRadius: 16, padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Todavía no hay ninguna categoría. Agrega la primera para empezar a construir el cuadro comparativo.
            </div>
          )}

          {categorias.map((categoria, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16, background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                <input
                  value={categoria.nombre}
                  onChange={e => cambiarNombreCategoria(i, e.target.value)}
                  placeholder="Nombre de la categoría (ej. Uso y límites)"
                  style={{ ...inputComparativaStyle, fontWeight: 700, fontSize: 14, flex: 1 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moverCategoria(i, i - 1)}
                    title="Subir categoría"
                    style={{ display: 'flex', padding: 3, borderRadius: 4, color: 'var(--text-secondary)', opacity: i === 0 ? 0.2 : 0.7, cursor: i === 0 ? 'default' : 'pointer' }}
                  >
                    <ArrowUp size={14} sinAnimacion />
                  </button>
                  <button
                    type="button"
                    disabled={i === categorias.length - 1}
                    onClick={() => moverCategoria(i, i + 1)}
                    title="Bajar categoría"
                    style={{ display: 'flex', padding: 3, borderRadius: 4, color: 'var(--text-secondary)', opacity: i === categorias.length - 1 ? 0.2 : 0.7, cursor: i === categorias.length - 1 ? 'default' : 'pointer' }}
                  >
                    <ArrowDown size={14} sinAnimacion />
                  </button>
                  <button type="button" onClick={() => eliminarCategoria(i)} style={{ color: 'var(--color-error)', display: 'flex', padding: 3 }} title="Eliminar categoría">
                    <Trash size={16} sinAnimacion />
                  </button>
                </div>
              </div>

              {categoria.filas.map((fila, j) => (
                <div
                  key={j}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    alignItems: 'center',
                    padding: '12px 0',
                    borderTop: j > 0 ? '1px solid var(--divider)' : 'none',
                  }}
                >
                  <input
                    value={fila.label}
                    onChange={e => cambiarFila(i, j, { label: e.target.value })}
                    placeholder="Nombre de la fila (ej. Cálculos por mes)"
                    style={{ ...inputComparativaStyle, flex: '1 1 200px' }}
                  />
                  <div style={{ width: 150, flexShrink: 0 }}>
                    <SwitchOpciones
                      opciones={[{ valor: 'check', label: 'Casilla' }, { valor: 'texto', label: 'Texto' }]}
                      valor={fila.tipo}
                      onChange={(tipo) => cambiarFila(i, j, { tipo })}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {planes.map(plan => {
                      const val = fila.valores[plan.id]
                      return (
                        <div key={plan.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 92 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {NOMBRES[plan.id] ?? plan.id}
                          </span>
                          {fila.tipo === 'check' ? (
                            <button
                              type="button"
                              onClick={() => cambiarValor(i, j, plan.id, !val)}
                              style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-input)' }}
                            >
                              {val ? (
                                <SquareCheck size={16} sinAnimacion style={{ color: 'var(--color-brand)' }} />
                              ) : (
                                <Square size={16} sinAnimacion style={{ color: 'var(--text-secondary)' }} />
                              )}
                            </button>
                          ) : (
                            <input
                              value={typeof val === 'string' ? val : ''}
                              onChange={e => cambiarValor(i, j, plan.id, e.target.value)}
                              placeholder="—"
                              style={{ ...inputComparativaStyle, padding: '6px 8px', fontSize: 12, textAlign: 'center' }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <button
                      type="button"
                      disabled={j === 0}
                      onClick={() => moverFila(i, j, j - 1)}
                      title="Subir fila"
                      style={{ display: 'flex', padding: 3, borderRadius: 4, color: 'var(--text-secondary)', opacity: j === 0 ? 0.2 : 0.7, cursor: j === 0 ? 'default' : 'pointer' }}
                    >
                      <ArrowUp size={12} sinAnimacion />
                    </button>
                    <button
                      type="button"
                      disabled={j === categoria.filas.length - 1}
                      onClick={() => moverFila(i, j, j + 1)}
                      title="Bajar fila"
                      style={{ display: 'flex', padding: 3, borderRadius: 4, color: 'var(--text-secondary)', opacity: j === categoria.filas.length - 1 ? 0.2 : 0.7, cursor: j === categoria.filas.length - 1 ? 'default' : 'pointer' }}
                    >
                      <ArrowDown size={12} sinAnimacion />
                    </button>
                    <button type="button" onClick={() => eliminarFila(i, j)} style={{ color: 'var(--color-error)', display: 'flex', padding: 3 }} title="Eliminar fila">
                      <Trash size={14} sinAnimacion />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => agregarFila(i)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, fontWeight: 600, color: 'var(--color-brand)' }}
              >
                <Plus size={13} sinAnimacion /> Agregar fila
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={agregarCategoria}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--color-brand)', padding: '10px 0' }}
          >
            <Plus size={14} sinAnimacion /> Agregar categoría
          </button>
        </>
      )}
    </div>
  )
}

export function PreciosTab() {
  const { toast } = useToast()
  const [planes, setPlanes] = useState<ConfigPlan[]>([])
  // "cargando" solo tapa la pantalla la PRIMERA vez (todavía no hay nada
  // que mostrar). El autoguardado ya no dispara un refetch por cada
  // tecla — antes eso borraba las 4 tarjetas y mostraba solo
  // "Cargando...", el usuario perdía su lugar en la pantalla en cada
  // guardado. A pedido del usuario 2026-09-04 ("debería tener la barra
  // superior cargando y no irse de la pantalla, más fluido").
  const [cargando, setCargando] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [pendientes, setPendientes] = useState<Set<string>>(new Set())
  const [publicandoTodo, setPublicandoTodo] = useState(false)
  const refsTarjetas = useRef<Map<string, TarjetaPlanHandle>>(new Map())

  function cargar() {
    if (planes.length === 0) setCargando(true)
    else setRefrescando(true)
    fetch('/api/admin/planes')
      .then(r => r.json())
      .then(data => {
        const cargados: ConfigPlan[] = data.planes ?? []
        setPlanes(cargados)
        // Un plan puede llegar con un borrador sin publicar de una sesión
        // anterior (tiene_borrador_sin_publicar = true en la base) sin que
        // se haya editado nada en ESTA sesión — si no se seedea aquí, el
        // botón "Publicar todo" queda deshabilitado aunque la tarjeta
        // muestre "Cambios sin publicar". Bug real encontrado 2026-09-10.
        const conBorrador = cargados.filter(p => p.tiene_borrador_sin_publicar).map(p => p.id)
        if (conBorrador.length > 0) {
          setPendientes(prev => new Set([...Array.from(prev), ...conBorrador]))
        }
      })
      .finally(() => { setCargando(false); setRefrescando(false) })
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function marcarCambio(planId: string, hayPendiente: boolean) {
    setPendientes(prev => {
      const next = new Set(prev)
      if (hayPendiente) next.add(planId); else next.delete(planId)
      return next
    })
  }

  async function publicarTodo() {
    setPublicandoTodo(true)
    // Los planes con borrador de una sesión anterior (sin tarjeta editada
    // ahora, sin ref con cambios locales) se publican directo por API. Los
    // que sí tienen cambios locales en esta sesión pasan por el handle de
    // su tarjeta, que primero guarda y luego publica en una sola llamada.
    const idsAPublicar = Array.from(pendientes)
    const resultados = await Promise.all(
      idsAPublicar.map(id => {
        const handle = refsTarjetas.current.get(id)
        if (handle) return handle.publicar()
        return fetch(`/api/admin/planes/${id}/publicar`, { method: 'POST' }).then(r => r.ok)
      })
    )
    const fallos = resultados.filter(ok => !ok).length
    setPublicandoTodo(false)
    setPendientes(new Set())
    if (fallos > 0) toast.error(`${fallos} de ${idsAPublicar.length} plan(es) no se pudieron publicar.`)
    else toast.success(`${idsAPublicar.length} plan(es) publicado(s).`)
    cargar()
  }

  const hayPendientes = pendientes.size > 0

  return (
    <div style={{ position: 'relative' }}>
      {refrescando && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, overflow: 'hidden', borderRadius: 2, zIndex: 1 }}>
          <div style={{ width: '40%', height: '100%', background: 'var(--color-brand)', animation: 'barraCargaSlide 1s ease-in-out infinite' }} />
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes barraCargaSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      ` }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 640 }}>
          Precios y límites reales de los 4 planes. Los cambios se quedan en tu navegador mientras escribes — nadie los ve hasta que pulses &quot;Publicar todo&quot;. Para una empresa puntual con precios distintos, negocia desde su propia ficha en Empresas.
        </p>
        <Button variant="primary" size="sm" onClick={publicarTodo} loading={publicandoTodo} disabled={!hayPendientes}>
          Publicar todo{hayPendientes ? ` (${pendientes.size})` : ''}
        </Button>
      </div>
      {cargando ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:grid-cols-2">
          {[0, 1, 2, 3].map(i => <TarjetaPlanSkeleton key={i} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:grid-cols-2">
          {planes.map(plan => (
            <TarjetaPlan
              key={plan.id}
              plan={plan}
              onCambio={marcarCambio}
              ref={(handle) => {
                if (handle) refsTarjetas.current.set(plan.id, handle)
                else refsTarjetas.current.delete(plan.id)
              }}
            />
          ))}
        </div>
      )}

      {!cargando && <ComparativaEditor planes={planes} />}
    </div>
  )
}
