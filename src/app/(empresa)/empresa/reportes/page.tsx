import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ReportesClient = dynamic(
  () => import('./components/reportes-client').then(m => ({ default: m.ReportesClient })),
  { ssr: false, loading: () => <div style={{ height: 400, borderRadius: 12, background: '#EBF5F4' }} /> }
)
import { AdminPageHeader } from '@/components/admin/admin-page-header'

export default async function EmpresaReportesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('user_id', user.id)
    .single()

  if (!perfil?.empresa_id) redirect('/dashboard')

  const adminClient = await createAdminClient()
  const empresaId = perfil.empresa_id

  // Últimos 30 días de cálculos
  const hace30Dias = new Date()
  hace30Dias.setDate(hace30Dias.getDate() - 30)

  const [{ data: calculos30d }, { data: calculosTodos }] = await Promise.all([
    adminClient
      .from('calculos')
      .select('fecha, total_co2, total_agua, detalle_json')
      .eq('empresa_id', empresaId)
      .gte('fecha', hace30Dias.toISOString())
      .order('fecha', { ascending: true }),
    adminClient
      .from('calculos')
      .select('total_co2, total_agua, detalle_json')
      .eq('empresa_id', empresaId),
  ])

  // Agrupar por día los últimos 30 días
  const porDia: Record<string, { co2: number; count: number }> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const key = d.toISOString().slice(0, 10)
    porDia[key] = { co2: 0, count: 0 }
  }
  for (const c of calculos30d ?? []) {
    if (!c.fecha) continue
    const key = c.fecha.slice(0, 10)
    if (porDia[key]) {
      porDia[key].co2 += c.total_co2 ?? 0
      porDia[key].count += 1
    }
  }
  const serieTemporalCO2 = Object.entries(porDia).map(([fecha, v]) => ({
    fecha,
    co2: parseFloat(v.co2.toFixed(3)),
    calculos: v.count,
  }))

  // Desglose por categoría (todos los cálculos)
  const categoriaMap: Record<string, { cantidad: number; co2: number }> = {}
  for (const c of calculosTodos ?? []) {
    const detalle = c.detalle_json as Record<string, { categoria?: string; cantidad?: number; co2?: number }> | null
    if (!detalle) continue
    for (const entry of Object.values(detalle)) {
      const cat = entry?.categoria ?? 'Sin categoría'
      if (!categoriaMap[cat]) categoriaMap[cat] = { cantidad: 0, co2: 0 }
      categoriaMap[cat].cantidad += entry?.cantidad ?? 1
      categoriaMap[cat].co2 += entry?.co2 ?? 0
    }
  }
  const serieCategoria = Object.entries(categoriaMap)
    .map(([categoria, v]) => ({
      categoria,
      cantidad: v.cantidad,
      co2: parseFloat(v.co2.toFixed(3)),
    }))
    .sort((a, b) => b.co2 - a.co2)

  const co2Total = (calculosTodos ?? []).reduce((s, c) => s + (c.total_co2 ?? 0), 0)
  const aguaTotal = (calculosTodos ?? []).reduce((s, c) => s + (c.total_agua ?? 0), 0)

  return (
    <div style={{ width: '100%' }}>
      <AdminPageHeader titulo="Reportes de impacto" subtitulo="Evolución del impacto ambiental de tu organización." showBack />

      <ReportesClient
        serieTemporalCO2={serieTemporalCO2}
        serieCategoria={serieCategoria}
        co2Total={co2Total}
        aguaTotal={aguaTotal}
      />
    </div>
  )
}
