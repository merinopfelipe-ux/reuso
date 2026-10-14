import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Panel de impacto' }

import { Suspense, cache } from 'react'
import { redirect } from 'next/navigation'
import { obtenerUsuario } from '@/lib/supabase/usuario'
import { createAdminClient } from '@/lib/supabase/admin'
import { Calculadora } from '@/components/calculadora/calculadora'
import { HistorialCalculos } from '@/components/calculadora/historial-calculos'
import { PanelInformes } from '@/components/informes/panel-informes'
import RankingEmpleados from '@/components/empresa/ranking-empleados'
import { BannerDatosPendientes } from '@/components/empresa/banner-datos-pendientes'

import BotonExportarCSV from '@/components/empresa/boton-exportar-csv'
import { obtenerLimitesEfectivos } from '@/lib/plan-limits'
import { ListaMetas } from '@/components/empresa/lista-metas'
import { Leaf, Drop, Users, Medal } from '@/components/ui/icons'
import type { Rol, Plan } from '@/types'
import { displayName } from '@/lib/display-name'
import type { PuntoMensual } from '@/components/empresa/grafica-co2-mensual'
import type { ItemDonut } from '@/components/empresa/donut-categorias'
import type { ItemRanking } from '@/components/empresa/ranking-empleados'
import { GraficaCO2Mensual, DonutCategorias } from './diferidos'

function KpiCard({ titulo, valor, unidad, icono: Icon, color }: {
  titulo: string; valor: string; unidad?: string
  icono: React.ElementType; color: string
}) {
  return (
    <div className="backdrop-blur-md transition-all duration-300 hover:-translate-y-1 group" style={{
      background: 'color-mix(in srgb, var(--bg-card) 60%, transparent)', border: '1px solid var(--border-light)',
      borderRadius: 24, padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,130,124,0.04)',
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: `${color}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px' }}>
          {titulo}
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
          {valor}{unidad && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>{unidad}</span>}
        </p>
      </div>
    </div>
  )
}

function SectionCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="backdrop-blur-xl transition-all duration-300" style={{
      background: 'color-mix(in srgb, var(--bg-card) 60%, transparent)', border: '1px solid var(--border-light)',
      borderRadius: '2rem', padding: '24px', boxShadow: '0 8px 32px rgba(0, 130, 124, 0.05)', marginBottom: 20,
    }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
        {titulo}
      </h2>
      {children}
    </div>
  )
}

// ── Funciones puras de agregación ────────────────────────────────

function agruparPorMes(calculos: { fecha: string; total_co2: number }[]): PuntoMensual[] {
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const ahora = new Date()
  const resultado: PuntoMensual[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
    const co2 = calculos
      .filter((c) => c.fecha?.startsWith(key))
      .reduce((s, c) => s + (c.total_co2 ?? 0), 0)
    resultado.push({ mes: label, co2: parseFloat(co2.toFixed(2)) })
  }
  return resultado
}

function calcularRanking(
  calculos: { user_id: string; total_co2: number }[],
  nombresMap: Map<string, string>
): ItemRanking[] {
  const porUsuario = new Map<string, { co2: number; count: number }>()
  for (const c of calculos) {
    const prev = porUsuario.get(c.user_id) ?? { co2: 0, count: 0 }
    porUsuario.set(c.user_id, { co2: prev.co2 + (c.total_co2 ?? 0), count: prev.count + 1 })
  }
  return Array.from(porUsuario.entries())
    .map(([user_id, { co2, count }]) => ({
      user_id,
      nombre: nombresMap.get(user_id) ?? 'Usuario',
      co2: parseFloat(co2.toFixed(2)),
      count,
    }))
    .sort((a, b) => b.co2 - a.co2)
    .slice(0, 10)
}

function calcularDonut(calculos: { detalle_json: unknown }[]): ItemDonut[] {
  const porCat = new Map<string, number>()
  for (const c of calculos) {
    const detalle = c.detalle_json as Record<string, { categoria?: string; co2?: number }> | null
    if (!detalle) continue
    for (const item of Object.values(detalle)) {
      const cat = item?.categoria ?? 'Sin categoría'
      porCat.set(cat, (porCat.get(cat) ?? 0) + (item?.co2 ?? 0))
    }
  }
  const total = Array.from(porCat.values()).reduce((s, v) => s + v, 0)
  return Array.from(porCat.entries())
    .map(([categoria, co2]) => ({
      categoria,
      co2: parseFloat(co2.toFixed(2)),
      porcentaje: total > 0 ? Math.round((co2 / total) * 100) : 0,
    }))
    .sort((a, b) => b.co2 - a.co2)
}

// ── Datos compartidos entre secciones ────────────────────────────
// React.cache evita repetir la misma consulta cuando dos secciones la necesitan.

const obtenerEmpresa = cache(async (empresaId: string) => {
  const adminClient = await createAdminClient()
  const { data } = await adminClient
    .from('empresas')
    .select('plan, nombre, nit, telefono, pais, ciudad')
    .eq('id', empresaId)
    .single()
  return data
})

const obtenerCalculosEmpresa = cache(async (empresaId: string) => {
  const adminClient = await createAdminClient()
  const { data } = await adminClient
    .from('calculos')
    .select('fecha, total_co2, total_agua, user_id, detalle_json')
    .eq('empresa_id', empresaId)
    .order('fecha', { ascending: true })
  return data ?? []
})

const obtenerInformes = cache(async (empresaId: string) => {
  const adminClient = await createAdminClient()
  const { data } = await adminClient
    .from('informes')
    .select('id, tipo, user_id, empresa_id, fecha_inicio, fecha_fin, co2_total, agua_total, pdf_url, codigo_verificacion, metadata_json, created_at')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(20)
  const informes = data ?? []
  const conUrls = await Promise.all(
    informes.map(async (c) => {
      if (c.pdf_url && !c.pdf_url.startsWith('http')) {
        const { data: firmada } = await adminClient.storage.from('documentos').createSignedUrl(c.pdf_url, 3600)
        return { ...c, pdf_url: firmada?.signedUrl ?? null }
      }
      return c
    })
  )
  return { total: informes.length, conUrls }
})

const obtenerNombresEquipo = cache(async (empresaId: string) => {
  const adminClient = await createAdminClient()
  const { data } = await adminClient.from('profiles').select('user_id, nombre').eq('empresa_id', empresaId)
  return data ?? []
})

// ── Secciones (cada una llega apenas termina, sin esperar a las demás) ──

function FallbackBloque({ alto }: { alto: number }) {
  return <div className="skeleton-shimmer w-full rounded-2xl mb-5" style={{ height: alto }} />
}

async function BannerEmpresa({ empresaId }: { empresaId: string }) {
  const empresa = await obtenerEmpresa(empresaId)
  return (
    <BannerDatosPendientes
      nit={empresa?.nit ?? null}
      telefono={empresa?.telefono ?? null}
      pais={empresa?.pais ?? null}
      ciudad={empresa?.ciudad ?? null}
      hrefCompletar="/empresa/configuracion"
    />
  )
}

async function ResumenEmpresa({ empresaId }: { empresaId: string }) {
  const adminClient = await createAdminClient()
  const [{ count: totalEmpleados }, calculos, informes, perfilesEmpresa] = await Promise.all([
    adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
    obtenerCalculosEmpresa(empresaId),
    obtenerInformes(empresaId),
    obtenerNombresEquipo(empresaId),
  ])

  const co2Total = calculos.reduce((s, c) => s + (c.total_co2 ?? 0), 0)
  const aguaTotal = calculos.reduce((s, c) => s + (c.total_agua ?? 0), 0)
  const nombresMap = new Map(perfilesEmpresa.map((p) => [p.user_id, p.nombre]))
  const serieMensual = agruparPorMes(calculos)
  const ranking = calcularRanking(calculos, nombresMap)
  const donut = calcularDonut(calculos)

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        <KpiCard titulo="CO₂ eq evitado" valor={co2Total.toFixed(2)} unidad="kg" icono={Leaf} color="#00827C" />
        <KpiCard titulo="Agua ahorrada" valor={aguaTotal.toLocaleString('es-CO')} unidad="L" icono={Drop} color="#59A6E4" />
        <KpiCard titulo="Miembros del equipo" valor={String(totalEmpleados ?? 0)} icono={Users} color="#38B98E" />
        <KpiCard titulo="Informes generados" valor={String(informes.total)} icono={Medal} color="#AD7C43" />
      </div>

      {/* Gráfica mensual */}
      <SectionCard titulo="CO₂ eq evitado - últimos 6 meses">
        <GraficaCO2Mensual data={serieMensual} />
      </SectionCard>

      {/* Ranking + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
        <div className="backdrop-blur-xl" style={{ background: 'color-mix(in srgb, var(--bg-card) 60%, transparent)', border: '1px solid var(--border-light)', borderRadius: '2rem', padding: 24, boxShadow: '0 8px 32px rgba(0, 130, 124, 0.05)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Ranking del equipo
          </h2>
          <RankingEmpleados data={ranking} />
        </div>
        <div className="backdrop-blur-xl" style={{ background: 'color-mix(in srgb, var(--bg-card) 60%, transparent)', border: '1px solid var(--border-light)', borderRadius: '2rem', padding: 24, boxShadow: '0 8px 32px rgba(0, 130, 124, 0.05)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Materiales reutilizados
          </h2>
          <DonutCategorias data={donut} />
        </div>
      </div>
    </>
  )
}

async function CalculadoraEmpresa({ empresaId, rol }: { empresaId: string; rol: Rol }) {
  const adminClient = await createAdminClient()

  // Módulos activos de la empresa para filtrar categorías
  const { data: modEmpresa } = await adminClient
    .from('modulos_empresas')
    .select('modulo_id')
    .eq('empresa_id', empresaId)
    .eq('activo', true)
  const moduloIdsActivos = (modEmpresa ?? []).map((m) => m.modulo_id)

  const [{ data: categoriasData }, historialRes] = await Promise.all([
    moduloIdsActivos.length === 0
      ? Promise.resolve({ data: null })
      : adminClient
          .from('categorias')
          .select('id, nombre, icono_lucide, descripcion, activa, orden, modulo_id, parent_id, created_at, items(id, categoria_id, nombre, descripcion, peso_kg, co2_por_unidad, agua_por_unidad, factor_rentabilidad, icono_lucide, activo, orden, origen_fuente, detalle_fuente, nivel_confianza, created_at)')
          .eq('activa', true)
          .eq('items.activo', true)
          .in('modulo_id', moduloIdsActivos)
          .order('orden', { ascending: true }),
    adminClient
      .from('calculos')
      .select('id, user_id, empresa_id, fecha, total_co2, total_agua, detalle_json, created_at', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('fecha', { ascending: false })
      .range(0, 14),
  ])

  const categorias = (categoriasData ?? []).map((cat) => ({
    ...cat,
    items: Array.isArray(cat.items) ? cat.items : [],
  }))
  const nombresCategorias = categorias.map((c) => c.nombre)

  // Enriquecer historial con nombres (reutiliza la lista del equipo, sin otra consulta)
  const historialRaw = historialRes.data ?? []
  const nombresMap = new Map((await obtenerNombresEquipo(empresaId)).map((p) => [p.user_id, p.nombre]))
  const historialData = historialRaw.map((c) => ({ ...c, usuario_nombre: nombresMap.get(c.user_id) ?? null }))

  return (
    <>
      {/* Calculadora */}
      {categorias.length > 0 && (
        <Calculadora categorias={categorias} rol={rol} />
      )}

      {/* Historial */}
      <HistorialCalculos
        calculos={historialData as Parameters<typeof HistorialCalculos>[0]['calculos']}
        total={historialRes.count ?? 0}
        rol={rol}
        categorias={nombresCategorias}
      />
    </>
  )
}

async function InformesEmpresa({ empresaId }: { empresaId: string }) {
  const informes = await obtenerInformes(empresaId)
  return (
    <PanelInformes
      informes={informes.conUrls as Parameters<typeof PanelInformes>[0]['informes']}
      empresaId={empresaId}
      modo="empresa"
    />
  )
}

async function ExportarEmpresa({ empresaId }: { empresaId: string }) {
  const empresa = await obtenerEmpresa(empresaId)
  const plan = (empresa?.plan ?? 'free') as Plan
  const limites = await obtenerLimitesEfectivos(empresaId, plan)
  return <BotonExportarCSV plan={plan} incluyeExcelCSV={limites.incluye_excel_csv} />
}

// ── Page ─────────────────────────────────────────────────────────

export default async function EmpresaPage() {
  const { supabase, user } = await obtenerUsuario()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apellido, apodo, empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  // super_admin no tiene empresa_id propio: usa la empresa más reciente para QA/vista
  if (!perfil?.empresa_id && perfil?.rol === 'super_admin') {
    const { data: primera } = await supabase
      .from('empresas')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (primera) (perfil as Record<string, unknown>).empresa_id = primera.id
  }

  if (!perfil?.empresa_id) redirect('/dashboard')

  const rol = (perfil.rol ?? 'empresa_admin') as Rol
  const saludo = displayName(perfil ?? {})
  const empresaId = perfil.empresa_id

  // El saludo sale de inmediato. Cada sección llega apenas termina su consulta.
  return (
    <div className="pb-6 bg-(--bg-primary)">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', margin: '0 0 4px' }}>
          Hola, {saludo}
        </h1>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          ¡Juntos recuperamos el planeta!
        </p>
      </div>

      <Suspense fallback={null}>
        <BannerEmpresa empresaId={empresaId} />
      </Suspense>

      <Suspense fallback={<FallbackBloque alto={420} />}>
        <ResumenEmpresa empresaId={empresaId} />
      </Suspense>

      {/* Metas Ambientales */}
      <ListaMetas esAdmin={rol === 'empresa_admin' || rol === 'super_admin'} />

      <Suspense fallback={<FallbackBloque alto={360} />}>
        <CalculadoraEmpresa empresaId={empresaId} rol={rol} />
      </Suspense>

      {/* Documentos */}
      <Suspense fallback={<FallbackBloque alto={200} />}>
        <InformesEmpresa empresaId={empresaId} />
      </Suspense>

      {/* Exportar CSV */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, marginBottom: 32 }}>
        <Suspense fallback={null}>
          <ExportarEmpresa empresaId={empresaId} />
        </Suspense>
      </div>
      </div>
    </div>
  )
}
