import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Panel admin' }

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Users, Buildings, Calculator, Leaf } from '@/components/ui/icons'
import dynamic from 'next/dynamic'
import { KpiCard } from '@/components/admin/kpi-card'

const ActivityChart = dynamic(
  () => import('@/components/admin/activity-chart').then(m => ({ default: m.ActivityChart })),
  {
    ssr: false,
    loading: () => <div style={{ height: 300, borderRadius: 16, background: '#EBF5F4' }} />,
  }
)
import { displayName } from '@/lib/display-name'

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

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
    const dia = fecha.slice(0, 10)
    actividadMap.set(dia, (actividadMap.get(dia) ?? 0) + 1)
  }
  const actividadChart = Array.from(actividadMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, calculos]) => ({
      fecha: fecha.slice(5), // MM-DD
      calculos,
    }))

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <span style={{
          display: 'inline-block',
          padding: '3px 10px', borderRadius: 100,
          background: 'rgba(0,130,124,0.12)',
          color: 'var(--color-brand)',
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
          marginBottom: 8,
        }}>
          Super Admin · Sistema
        </span>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          Hola, {saludo}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          ¡Juntos recuperamos el planeta!
        </p>
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
          titulo="CO₂ total evitado"
          valor={`${co2Ton} t`}
          subtitulo="toneladas de CO₂-eq"
          icono={Leaf}
          color="var(--color-success)"
        />
      </div>

      {/* Gráfica de actividad */}
      <div style={{ marginBottom: 24 }}>
        <ActivityChart data={actividadChart} />
      </div>

      {/* Últimos cálculos */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Últimos 10 cálculos
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                {['Fecha', 'Usuario', 'Empresa', 'CO₂ (kg)'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
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
                        Cuando los usuarios comiencen a certificar objetos, aparecerán en esta lista.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                ultimosCalculos.map((c) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                    className="hover-row"
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {formatFecha(c.fecha as string)}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {(c.profiles as unknown as { nombre: string }[] | null)?.[0]?.nombre ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {(c.empresas as unknown as { nombre: string }[] | null)?.[0]?.nombre ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-brand)' }}>
                      {Number(c.total_co2).toFixed(3)} kg
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
