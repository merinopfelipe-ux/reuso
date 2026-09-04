'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, Users, Calculator, FileText, ClipboardList, Loader2 as Spinner } from '@/components/ui/icons'
import { useToast } from '@/components/toast-provider'
import { PLAN_CONFIG } from '@/components/admin/plan-badge'
import { CampoLimiteGrande, BloqueMoneda, MONEDAS } from '@/components/admin/plan-campos'

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

function TarjetaPlan({ plan, onCambio }: { plan: ConfigPlan; onCambio: (planId: string, pendiente: boolean) => void }) {
  const { toast } = useToast()
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
  }
  const [borrador, setBorrador] = useState(valorInicial)
  const [estado, setEstado] = useState<'guardado' | 'guardando'>('guardado')
  const [huboEdicion, setHuboEdicion] = useState(false)
  // Snapshot del valor inicial, capturado UNA vez al montar (no dentro del
  // efecto) — comparar contra esto es lo que decide si hay algo real que
  // guardar, en vez de una bandera "primera vez" mutable. Un ref con
  // bandera se rompía con Strict Mode de React (double-invoke en
  // desarrollo): las 4 tarjetas disparaban un autoguardado espurio apenas
  // se cargaba la página, sin que el usuario tocara nada — bug real
  // encontrado y corregido 2026-09-04 antes de comitear.
  const baseline = useRef(valorInicial).current

  useEffect(() => {
    if (JSON.stringify(borrador) === JSON.stringify(baseline)) return
    setHuboEdicion(true)
    onCambio(plan.id, true)
    setEstado('guardando')
    const timer = setTimeout(async () => {
      const res = await fetch('/api/admin/planes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, ...borrador }),
      })
      if (res.ok) setEstado('guardado')
      else toast.error(`No se pudo guardar ${NOMBRES[plan.id]}. Revisa tu conexión.`)
    }, 900)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrador])

  function cambiarMensual(campo: 'cop' | 'usd' | 'eur', v: number) {
    setBorrador(b => ({
      ...b,
      [`borrador_precio_${campo}`]: v,
      [`borrador_precio_anual_${campo}`]: Math.round(v * 10 * 100) / 100,
    }))
  }

  const cfg = PLAN_CONFIG[plan.id]
  const IconoPlan = cfg.icon
  const tieneCambiosSinPublicar = plan.tiene_borrador_sin_publicar || huboEdicion

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

      {/* Estado de autoguardado — reemplaza el botón "Guardar borrador" de
          antes, ya no hace falta ningún clic. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
        {estado === 'guardando' ? (
          <><Spinner size={13} className="animate-spin" /> Guardando...</>
        ) : (
          <><CheckCircle size={13} style={{ color: 'var(--color-success)' }} /> Guardado</>
        )}
      </div>
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

  function cargar() {
    if (planes.length === 0) setCargando(true)
    else setRefrescando(true)
    fetch('/api/admin/planes')
      .then(r => r.json())
      .then(data => setPlanes(data.planes ?? []))
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
    const idsAPublicar = Array.from(pendientes)
    const resultados = await Promise.all(
      idsAPublicar.map(id => fetch(`/api/admin/planes/${id}/publicar`, { method: 'POST' }))
    )
    const fallos = resultados.filter(r => !r.ok).length
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
          Precios y límites reales de los 4 planes. Se guardan solos mientras escribes, como borrador — nadie los ve hasta que publiques. Para una empresa puntual con precios distintos, negocia desde su propia ficha en Empresas.
        </p>
        <Button variant="primary" size="sm" onClick={publicarTodo} loading={publicandoTodo} disabled={!hayPendientes}>
          Publicar todo{hayPendientes ? ` (${pendientes.size})` : ''}
        </Button>
      </div>
      {cargando ? (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:grid-cols-2">
          {planes.map(plan => (
            <TarjetaPlan key={plan.id} plan={plan} onCambio={marcarCambio} />
          ))}
        </div>
      )}
    </div>
  )
}
