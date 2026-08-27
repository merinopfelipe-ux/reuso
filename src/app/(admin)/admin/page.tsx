import type { Metadata } from 'next'
import Link from 'next/link'
export const metadata: Metadata = { title: 'Panel admin' }

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Users, Buildings, Calculator, Leaf } from '@/components/ui/icons'
import dynamic from 'next/dynamic'
import { KpiCard } from '@/components/admin/kpi-card'

import { displayName } from '@/lib/display-name'
import { formatFecha, formatNumero } from '@/lib/format'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilAdmin } = await supabase
    .from('profiles')
    .select('nombre, apellido, apodo')
    .eq('user_id', user.id)
    .single()
  const saludo = displayName(perfilAdmin ?? { nombre: user.email ?? undefined })

  // Queries paralelas para KPIs
  const adminClient = await createAdminClient()
  const [
    { count: totalUsuarios },
    { count: totalEmpresas },
    { count: totalCalculos },
    { data: co2Data },
    { data: actividadData },
    { data: ultimosCalculos },
  ] = await Promise.all([
    adminClient.from('profiles').select('*', { count: 'exact', head: true }),
    adminClient.from('empresas').select('*', { count: 'exact', head: true }),
    adminClient.from('calculos').select('*', { count: 'exact', head: true }),
    adminClient.from('calculos').select('total_co2'),
    adminClient
      .from('calculos')
      .select('fecha')
      .gte('fecha', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('fecha', { ascending: true }),
    adminClient
      .from('calculos')
      .select('id, fecha, total_co2, user_id, empresa_id, profiles(nombre), empresas(nombre)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const co2Total = (co2Data ?? []).reduce((sum, r) => sum + (r.total_co2 ?? 0), 0)
  const co2Ton = (co2Total / 1000).toFixed(2)

  // Agrupar actividad por día
  const actividadMap = new Map<string, number>()
  for (const { fecha } of actividadData ?? []) {
    if (!fecha) continue
    const dia = fecha.slice(0, 10)
    actividadMap.set(dia, (actividadMap.get(dia) ?? 0) + 1)
  }
  const ActivityChart = dynamic(
  () => import('@/components/admin/activity-chart').then(m => ({ default: m.ActivityChart })),
  {
    ssr: false,
    loading: () => <div style={{ height: 300, borderRadius: 16, background: 'var(--color-brand)' }} />,
  }
)
  const actividadChart = Array.from(actividadMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, calculos]) => ({
      fecha: fecha.slice(5), // MM-DD
      calculos,
    }))

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ margin: 0, color: 'var(--text-primary)' }}>
            Hola, {saludo}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-brand)]">
            ¡Juntos recuperamos el planeta!
          </p>
        </div>
        <Link href="/admin/sistema" className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-4 py-2 text-[13px] font-semibold text-[var(--color-brand)] bg-[var(--bg-card)] no-underline">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38B98E', display: 'inline-block' }}></span>
          Estado de sistemas
        </Link>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KpiCard
          titulo="Usuarios registrados"
          valor={totalUsuarios ?? 0}
          icono={Users}
        />
        <KpiCard
          titulo="Empresas activas"
          valor={totalEmpresas ?? 0}
          icono={Buildings}
          color="var(--color-info)"
        />
        <KpiCard
          titulo="Cálculos realizados"
          valor={totalCalculos ?? 0}
          icono={Calculator}
          color="var(--color-warning)"
        />
        <KpiCard
          titulo="CO₂ eq total evitado"
          valor={`${co2Ton} t`}
          subtitulo="toneladas de CO₂ eq"
          icono={Leaf}
          color="var(--color-success)"
        />
      </div>

      {/* Gráfica de actividad */}
      <div style={{ marginBottom: 24 }}>
        <ActivityChart data={actividadChart} />
      </div>

      {/* Últimos cálculos */}
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Últimos 10 cálculos
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
                <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Fecha</th>
                <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Usuario</th>
                <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Empresa</th>
                <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">CO₂ (kg)</th>
              </tr>
            </thead>
            <tbody>
              {(!ultimosCalculos || ultimosCalculos.length === 0) ? (
                <tr>
                  <td colSpan={4} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Calculator size={32} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        No se han registrado cálculos aún
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', opacity: 0.7 }}>
                        Cuando los usuarios comiencen a calcular objetos, aparecerán en esta lista.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                ultimosCalculos.map((c, idx) => {
                  return (
                    <tr
                      key={c.id}
                      className={`cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${
                        idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                      }`}
                      style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                    >
                      <td className="px-4 py-3 text-[var(--text-secondary)] text-center">
                        {c.fecha ? formatFecha(c.fecha) : '-'}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)] font-medium">
                        {(c.profiles as unknown as { nombre: string }[] | null)?.[0]?.nombre ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {(c.empresas as unknown as { nombre: string }[] | null)?.[0]?.nombre ?? '-'}
                      </td>
                      <td className="px-4 py-3 font-bold text-[var(--color-brand)] text-right">
                        {formatNumero(c.total_co2, { unidad: 'kg' })}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
