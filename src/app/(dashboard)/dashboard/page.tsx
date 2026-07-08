import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Mi impacto' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PanelCertificados } from '@/components/certificados/panel-certificados'
import { CalculadoraConHistorial } from '@/components/calculadora/calculadora-con-historial'
import { KpiCardAnimado, type IndicadorSemanal } from '@/components/dashboard/kpi-card-animado'
import dynamic from 'next/dynamic'
import { type PuntoMensualPersonal } from '@/components/dashboard/grafica-linea-personal'
import { OnboardingCard } from '@/components/dashboard/onboarding-card'

const GraficaLineaPersonal = dynamic(() => import('@/components/dashboard/grafica-linea-personal'), {
  ssr: false, loading: () => <div style={{ height: 200, borderRadius: 12, background: 'var(--border)' }} />, })
const DonutCategorias = dynamic(() => import('@/components/empresa/donut-categorias'), {
  ssr: false, loading: () => <div style={{ height: 220, borderRadius: 12, background: 'var(--border)' }} />, })
import { Buildings, Package, ClockCounterClockwise, Lifebuoy, ArrowRight, Star } from '@/components/ui/icons'
import type { Certificado, Rol } from '@/types'
import { displayName } from '@/lib/display-name'

// ─── Pure functions de agregación ──────────────────────────────────────────

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function agruparPorMes12(
  calculos: { fecha: string; total_co2: number }[]
): PuntoMensualPersonal[] {
  const ahora = new Date()
  const resultado: PuntoMensualPersonal[] = []

  for (let i = 11; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    const año = fecha.getFullYear()
    const mes = fecha.getMonth()
    const label = `${MESES_CORTOS[mes]} ${String(año).slice(2)}`
    const co2 = calculos
      .filter((c) => {
        const d = new Date(c.fecha)
        return d.getFullYear() === año && d.getMonth() === mes
      })
      .reduce((s, c) => s + (c.total_co2 ?? 0), 0)
    resultado.push({ mes: label, co2 })
  }

  return resultado
}

function calcularVentanas(
  calculos: { fecha: string; total_co2: number; total_agua: number }[],
  fechaHace7Dias: Date,
  fechaHace14Dias: Date
): {
  semanaActual: { co2: number; agua: number; objetos: number }
  semanaAnterior: { co2: number; agua: number; objetos: number }
} {
  const ahora = new Date()
  const semanaActual = { co2: 0, agua: 0, objetos: 0 }
  const semanaAnterior = { co2: 0, agua: 0, objetos: 0 }

  for (const c of calculos) {
    const d = new Date(c.fecha)
    if (d >= fechaHace7Dias && d <= ahora) {
      semanaActual.co2 += c.total_co2 ?? 0
      semanaActual.agua += c.total_agua ?? 0
      semanaActual.objetos += 1
    } else if (d >= fechaHace14Dias && d < fechaHace7Dias) {
      semanaAnterior.co2 += c.total_co2 ?? 0
      semanaAnterior.agua += c.total_agua ?? 0
      semanaAnterior.objetos += 1
    }
  }

  return { semanaActual, semanaAnterior }
}

function calcularIndicador(actual: number, anterior: number): IndicadorSemanal {
  if (anterior === 0 && actual === 0) return { porcentaje: 0, direccion: 'igual' }
  if (anterior === 0) return { porcentaje: 100, direccion: 'sube' }
  const diff = ((actual - anterior) / anterior) * 100
  if (Math.abs(diff) < 1) return { porcentaje: 0, direccion: 'igual' }
  return {
    porcentaje: Math.abs(Math.round(diff)),
    direccion: diff > 0 ? 'sube' : 'baja',
  }
}

function calcularDonutPersonal(
  calculos: { detalle_json: unknown }[]
): { categoria: string; co2: number; porcentaje: number }[] {
  const mapa: Record<string, number> = {}
  for (const c of calculos) {
    const detalle = c.detalle_json as Record<string, { categoria: string; co2: number }> | null
    if (!detalle) continue
    for (const item of Object.values(detalle)) {
      mapa[item.categoria] = (mapa[item.categoria] ?? 0) + (item.co2 ?? 0)
    }
  }
  const total = Object.values(mapa).reduce((s, v) => s + v, 0)
  if (total === 0) return []
  return Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .map(([categoria, co2]) => ({
      categoria,
      co2,
      porcentaje: Math.round((co2 / total) * 100),
    }))
}

function calcularPosicionRanking(
  calculos: { user_id: string; total_co2: number }[],
  miUserId: string
): { posicion: number; total: number } {
  const mapa: Record<string, number> = {}
  for (const c of calculos) {
    mapa[c.user_id] = (mapa[c.user_id] ?? 0) + (c.total_co2 ?? 0)
  }
  const ranking = Object.entries(mapa).sort((a, b) => b[1] - a[1])
  const total = ranking.length
  const idx = ranking.findIndex(([uid]) => uid === miUserId)
  return { posicion: idx === -1 ? total : idx + 1, total: Math.max(total, 1) }
}

// ─── Sección auxiliar ───────────────────────────────────────────────────────

function SectionCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div
      className="backdrop-blur-xl transition-all duration-300"
      style={{
        background: 'color-mix(in srgb, var(--bg-card) 60%, transparent)',
        border: '1px solid var(--border-light)',
        borderRadius: '2rem',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0, 130, 124, 0.05)',
      }}
    >
      <p
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 12px',
          
          letterSpacing: '0.04em',
        }}
      >
        {titulo}
      </p>
      {children}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = await createAdminClient()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apellido, apodo, empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol
  const empresa_id = perfil?.empresa_id ?? null
  const saludo = displayName(perfil ?? {})

  const ahora = new Date()
  const fechaHace7Dias = new Date(ahora)
  fechaHace7Dias.setDate(ahora.getDate() - 7)
  const fechaHace14Dias = new Date(ahora)
  fechaHace14Dias.setDate(ahora.getDate() - 14)
  const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  // Módulos activos para esta empresa (filtra categorías de la calculadora)
  let moduloIdsActivos: string[] | null = null
  if (empresa_id) {
    const { data: modEmpresa } = await adminClient
      .from('modulos_empresas')
      .select('modulo_id')
      .eq('empresa_id', empresa_id)
      .eq('activo', true)
    moduloIdsActivos = (modEmpresa ?? []).map((m) => m.modulo_id)
  }

  const [
    { count: totalObjetos },
    { data: co2Data },
    { data: certData },
    { data: categoriasData },
    historialRes,
    { data: calculosGrafica },
    { data: calculos14Dias },
    { data: calculosEmpresa },
    { data: co2Empresa },
    { count: calculosMesCount },
  ] = await Promise.all([
    adminClient.from('calculos').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    adminClient.from('calculos').select('total_co2, total_agua').eq('user_id', user.id),
    adminClient.from('certificados').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    (() => {
      // usuario_libre (sin empresa) → todas las categorías
      // empresa con módulos asignados → filtrar; empresa sin módulos → vacío
      if (moduloIdsActivos !== null && moduloIdsActivos.length === 0) {
        return Promise.resolve({ data: null, error: null })
      }
      let q = adminClient
        .from('categorias')
        .select('id, nombre, icono_lucide, descripcion, activa, orden, modulo_id, created_at, items(id, categoria_id, nombre, descripcion, peso_kg, co2_por_unidad, icono_lucide, activo, orden, origen_fuente, detalle_fuente, nivel_confianza, created_at)')
        .eq('activa', true)
        .eq('items.activo', true)
        .order('orden', { ascending: true })
      if (moduloIdsActivos !== null && moduloIdsActivos.length > 0) {
        q = q.in('modulo_id', moduloIdsActivos)
      }
      return q
    })(),
    // Primera página del historial según rol
    (async () => {
      let query = adminClient
        .from('calculos')
        .select('id, user_id, empresa_id, fecha, total_co2, total_agua, detalle_json, created_at', { count: 'exact' })
        .order('fecha', { ascending: false })
        .range(0, 19)

      if (rol === 'super_admin') {
        // sin filtro
      } else if (empresa_id) {
        query = query.eq('empresa_id', empresa_id)
      } else {
        query = query.eq('user_id', user.id)
      }

      return query
    })(),
    // Todos los cálculos para gráfica de línea + donut
    adminClient
      .from('calculos')
      .select('fecha, total_co2, detalle_json')
      .eq('user_id', user.id)
      .order('fecha', { ascending: true }),
    // Últimos 14 días para indicadores semanales
    adminClient
      .from('calculos')
      .select('fecha, total_co2, total_agua')
      .eq('user_id', user.id)
      .gte('fecha', fechaHace14Dias.toISOString()),
    // Cálculos de empresa para ranking (solo si pertenece a empresa)
    empresa_id
      ? adminClient.from('calculos').select('user_id, total_co2').eq('empresa_id', empresa_id)
      : Promise.resolve({ data: [] as { user_id: string; total_co2: number }[], error: null }),
    // KPIs empresa para empleado (co2 + agua de toda la empresa)
    (rol === 'empleado' && empresa_id)
      ? adminClient.from('calculos').select('total_co2, total_agua').eq('empresa_id', empresa_id)
      : Promise.resolve({ data: [] as { total_co2: number; total_agua: number }[], error: null }),
    // Cálculos este mes para cuota de usuario_libre
    (rol === 'usuario_libre')
      ? adminClient.from('calculos').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('fecha', primerDiaMes.toISOString())
      : Promise.resolve({ count: 0, data: null, error: null }),
  ])

  const co2Total = (co2Data ?? []).reduce((s, c) => s + (c.total_co2 ?? 0), 0)
  const aguaTotal = (co2Data ?? []).reduce((s, c) => s + (c.total_agua ?? 0), 0)
  const arboles = Math.round(co2Total / 8.0)
  const certificados = (certData ?? []) as Certificado[]

  // KPIs empresa para empleado
  const co2Empresa_ = (co2Empresa ?? []).reduce((s, c) => s + (c.total_co2 ?? 0), 0)
  const aguaEmpresa = (co2Empresa ?? []).reduce((s, c) => s + (c.total_agua ?? 0), 0)
  const objetosEmpresaCount = co2Empresa?.length ?? 0

  // Cuota mes para usuario_libre (max 10 del plan free)
  const calculosMes = calculosMesCount ?? 0
  const CUOTA_FREE = 10

  const categorias = (categoriasData ?? []).map((cat) => ({
    ...cat,
    items: Array.isArray(cat.items) ? cat.items : [],
  }))

  const nombresCategorias = categorias.map((c) => c.nombre)

  // Historial: añadir nombres de usuario para admin/empresa_admin
  const historialRaw = historialRes.data ?? []
  let historialData = historialRaw
  if (rol === 'super_admin' || rol === 'empresa_admin') {
    const userIds = Array.from(new Set(historialRaw.map((c) => c.user_id).filter(Boolean)))
    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('user_id, nombre')
        .in('user_id', userIds)
      const usuariosMap = new Map((profiles ?? []).map((p) => [p.user_id, p.nombre]))
      historialData = historialRaw.map((c) => ({ ...c, usuario_nombre: usuariosMap.get(c.user_id) ?? null }))
    }
  }

  const historialTotal = rol === 'usuario_libre'
    ? Math.min(historialRes.count ?? 0, 15)
    : (historialRes.count ?? 0)

  // Agregaciones para dashboard
  const serieMensual12 = agruparPorMes12(calculosGrafica ?? [])
  const donutPersonal = calcularDonutPersonal(calculosGrafica ?? [])
  const { semanaActual, semanaAnterior } = calcularVentanas(calculos14Dias ?? [], fechaHace7Dias, fechaHace14Dias)
  const indicadorCO2 = calcularIndicador(semanaActual.co2, semanaAnterior.co2)
  const indicadorAgua = calcularIndicador(semanaActual.agua, semanaAnterior.agua)
  const indicadorObjetos = calcularIndicador(semanaActual.objetos, semanaAnterior.objetos)

  const posicionRanking = empresa_id
    ? calcularPosicionRanking(calculosEmpresa ?? [], user.id)
    : null

  // Nombre de empresa del layout (disponible via perfil)
  let nombreEmpresa: string | undefined
  if (empresa_id) {
    const { data: emp } = await adminClient.from('empresas').select('nombre').eq('id', empresa_id).single()
    nombreEmpresa = emp?.nombre
  }

  return (
    <div style={{ width: '100%' }}>

      {/* Saludo */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ margin: 0, color: 'var(--text-primary)' }}>
          Hola, {saludo}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          ¡Juntos recuperamos el planeta!
        </p>
      </div>

      {/* Badge empresa + ranking */}
      {empresa_id && posicionRanking && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
            padding: '10px 16px',
            background: 'var(--color-brand-light)',
            border: '1px solid var(--color-brand)',
            borderRadius: 12,
            flexWrap: 'wrap',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Buildings size={14} color="var(--color-brand)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-brand)' }}>
              {nombreEmpresa}
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              padding: '2px 10px',
              background: 'var(--bg-card)',
              borderRadius: 100,
              border: '1px solid var(--border)',
            }}
          >
            Posición #{posicionRanking.posicion} de {posicionRanking.total}
          </span>
        </div>
      )}

      {/* KPI cards animadas - empresa para empleado, personales para los demás */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        {rol === 'empleado' && empresa_id ? (
          <>
            <KpiCardAnimado
              titulo="CO₂ evitado por la empresa"
              valorFinal={co2Empresa_}
              formato="decimal2"
              unidad="kg"
              icono="leaf"
              color="#00827C"
              indicador={indicadorCO2}
            />
            <KpiCardAnimado
              titulo="Agua ahorrada empresa"
              valorFinal={aguaEmpresa}
              formato="agua"
              unidad="L"
              icono="droplets"
              color="#59A6E4"
              indicador={indicadorAgua}
            />
            <KpiCardAnimado
              titulo="Registros empresa"
              valorFinal={objetosEmpresaCount}
              formato="entero"
              icono="box"
              color="#38B98E"
              indicador={indicadorObjetos}
            />
            <KpiCardAnimado
              titulo="Mi aporte CO₂"
              valorFinal={co2Total}
              formato="decimal2"
              unidad="kg"
              icono="award"
              color="#AD7C43"
              indicador={indicadorCO2}
            />
          </>
        ) : (
          <>
            <KpiCardAnimado
              titulo="CO₂ evitado"
              valorFinal={co2Total}
              formato="decimal2"
              unidad="kg"
              icono="leaf"
              color="#00827C"
              indicador={indicadorCO2}
            />
            <KpiCardAnimado
              titulo="Agua ahorrada"
              valorFinal={aguaTotal}
              formato="agua"
              unidad="L"
              icono="droplets"
              color="#59A6E4"
              indicador={indicadorAgua}
            />
            <KpiCardAnimado
              titulo="Objetos reutilizados"
              valorFinal={totalObjetos ?? 0}
              formato="entero"
              icono="box"
              color="#38B98E"
              indicador={indicadorObjetos}
            />
            <KpiCardAnimado
              titulo="Árboles equivalentes"
              valorFinal={arboles}
              formato="entero"
              icono="award"
              color="#AD7C43"
              indicador={indicadorCO2}
            />
          </>
        )}
      </div>

      {/* Cuota de cálculos - solo usuario_libre */}
      {rol === 'usuario_libre' && (
        <div
          style={{
            marginBottom: 24,
            padding: '16px 20px',
            background: calculosMes >= CUOTA_FREE
              ? 'rgba(255,94,75,0.06)'
              : 'rgba(0,130,124,0.06)',
            border: `1px solid ${calculosMes >= CUOTA_FREE ? 'rgba(255,94,75,0.25)' : 'rgba(0,130,124,0.20)'}`,
            borderRadius: 14,
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Cálculos este mes
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                Se reinicia el día 1 de cada mes
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: calculosMes >= CUOTA_FREE ? '#FF5E4B' : 'var(--color-brand)' }}>
                {calculosMes}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>
                / {CUOTA_FREE}
              </span>
            </div>
          </div>
          {/* Barra de progreso */}
          <div style={{ marginTop: 12, height: 6, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((calculosMes / CUOTA_FREE) * 100, 100)}%`,
              background: calculosMes >= CUOTA_FREE ? '#FF5E4B' : 'var(--color-brand)',
              borderRadius: 100,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}

      {/* Banner upgrade - solo usuario_libre */}
      {rol === 'usuario_libre' && (
        <div
          style={{
            marginBottom: 28,
            padding: '18px 20px',
            background: 'linear-gradient(135deg, rgba(0,130,124,0.08) 0%, rgba(0,130,124,0.03) 100%)',
            border: '1px solid rgba(0,130,124,0.25)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(0,130,124,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Star size={20} color="var(--color-brand)" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Desbloquea certificados y cálculos ilimitados
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                Crea tu empresa desde $89.000 COP/mes
              </p>
            </div>
          </div>
          <a
            href="/empresa/nueva"
            className="hover-slide-r hover-press transition-transform duration-200"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px',
              background: 'var(--color-brand)',
              color: '#fff',
              borderRadius: 10,
              fontSize: 13, fontWeight: 700,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            Crear mi empresa <ArrowRight size={14} />
          </a>
        </div>
      )}

      {/* Gráficas - solo si hay cálculos */}
      {(totalObjetos ?? 0) > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            marginBottom: 24,
          }}
        >
          <SectionCard titulo="Evolución mensual - CO₂ evitado">
            <GraficaLineaPersonal data={serieMensual12} />
          </SectionCard>
          {donutPersonal.length > 0 && (
            <SectionCard titulo="Materiales reutilizados">
              <DonutCategorias data={donutPersonal} />
            </SectionCard>
          )}
        </div>
      )}

      {/* Accesos rápidos - empleado */}
      {rol === 'empleado' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            { href: '/dashboard/objetos', label: 'Registrar reúso', icon: Package, desc: 'Nuevo cálculo', animClass: 'hover-package hover-press' },
            { href: '/dashboard/historial', label: 'Mi historial', icon: ClockCounterClockwise, desc: 'Ver cálculos anteriores', animClass: 'hover-spin hover-press' },
            { href: '/dashboard/soporte', label: 'Soporte', icon: Lifebuoy, desc: 'Abrir ticket', animClass: 'hover-lifebuoy hover-press' },
          ].map(({ href, label, icon: Icon, desc, animClass }) => (
            <a
              key={href}
              href={href}
              className={`group backdrop-blur-md hover:-translate-y-1 transition-all duration-300 ${animClass}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '20px',
                background: 'color-mix(in srgb, var(--bg-card) 60%, transparent)',
                border: '1px solid var(--border-light)',
                borderRadius: 24,
                boxShadow: '0 4px 16px rgba(0,130,124,0.04)',
                textDecoration: 'none',
                userSelect: 'none',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(0,130,124,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} className="transition-transform duration-300">
                <Icon size={20} color="var(--color-brand)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Calculadora + Historial (wrapper cliente para refrescar tras guardar) */}
      {(totalObjetos ?? 0) === 0 ? (
        <>
          {categorias.length > 0 && (
            <CalculadoraConHistorial
              categorias={categorias}
              rol={rol}
              historialInicial={[]}
              historialTotal={0}
              nombresCategorias={nombresCategorias}
            />
          )}
          <OnboardingCard />
        </>
      ) : (
        <CalculadoraConHistorial
          categorias={categorias}
          rol={rol}
          historialInicial={historialData as Parameters<typeof CalculadoraConHistorial>[0]['historialInicial']}
          historialTotal={historialTotal}
          nombresCategorias={nombresCategorias}
        />
      )}

      {/* Panel certificados */}
      <PanelCertificados
        certificados={certificados}
        empresaId={empresa_id}
        modo="personal"
      />
    </div>
  )
}
