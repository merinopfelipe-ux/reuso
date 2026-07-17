import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Pasaportes Digitales' }

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { KpiCard } from '@/components/admin/kpi-card'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { EmptyState } from '@/components/empty-state'
import { Package, Leaf, ArrowCounterClockwise, Stack, Scroll, Plus } from '@/components/ui/icons'
import { FiltrosDpp } from './filtros-dpp'

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  activo: { label: 'Activo', color: '#38B98E' },
  en_reuso: { label: 'En reúso', color: '#00827C' },
  disposicion_final: { label: 'Disposición final', color: '#FF5E4B' },
  archivado: { label: 'Archivado', color: '#7FA8A5' },
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function DppPage({
  searchParams,
}: {
  searchParams: { estado?: string; q?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  if (!perfil?.empresa_id) redirect('/dashboard')

  const adminClient = await createAdminClient()

  let query = adminClient
    .from('dpp_activos')
    .select('id, codigo_dpp, nombre, estado, n_ciclos, updated_at, created_at')
    .eq('empresa_id', perfil.empresa_id)
    .order('updated_at', { ascending: false })

  if (searchParams.estado) query = query.eq('estado', searchParams.estado as string)
  if (searchParams.q) query = query.ilike('nombre', `%${searchParams.q}%`)

  const { data: activos } = await query

  const activoIds = (activos ?? []).map((a) => a.id)
  const { data: ciclos } = activoIds.length > 0
    ? await adminClient
        .from('dpp_ciclos')
        .select('activo_id, co2_evitado_kg')
        .in('activo_id', activoIds)
    : { data: [] }

  // KPIs
  const total = activos?.length ?? 0
  const enReuso = activos?.filter((a) => a.estado === 'en_reuso').length ?? 0
  const totalCiclos = activos?.reduce((s, a) => s + (a.n_ciclos ?? 0), 0) ?? 0
  const co2Evitado = (ciclos ?? []).reduce((s, c) => s + (c.co2_evitado_kg ?? 0), 0)

  // Mapa co2 por activo (para la tabla)
  const co2PorActivo = new Map<string, number>()
  for (const c of ciclos ?? []) {
    co2PorActivo.set(c.activo_id, (co2PorActivo.get(c.activo_id) ?? 0) + (c.co2_evitado_kg ?? 0))
  }

  return (
    <div style={{ fontFamily: "'Open Sans', sans-serif" }}>
      <AdminPageHeader
        titulo="Pasaportes Digitales"
        subtitulo="Gestiona tus activos circulares y su trazabilidad"
        accion={
          <Link href="/empresa/dpp/nuevo" className="hover-pop hover-press" style={{ textDecoration: 'none' }}>
            <button style={{
              background: '#00827C', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 20px', fontSize: 14,
              fontWeight: 700, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Plus size={16} strokeWidth={2.5} />
              Registra nuevo activo
            </button>
          </Link>
        }
      />

      {/* KPI Grid - 2 cols mobile, 4 cols desktop */}
      <div
        className="dpp-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <style>{`@media(min-width:768px){.dpp-kpi-grid{grid-template-columns:repeat(4,1fr)!important}}`}</style>
        <KpiCard titulo="Activos registrados" valor={total} icono={Package} color="#00827C" />
        <KpiCard titulo="CO₂ evitado total" valor={`${co2Evitado.toFixed(1)} kg`} icono={Leaf} color="#38B98E" />
        <KpiCard titulo="Ciclos completados" valor={totalCiclos} icono={ArrowCounterClockwise} color="#59A6E4" />
        <KpiCard titulo="En reúso activo" valor={enReuso} icono={Stack} color="#F6BF3E" />
      </div>

      {/* Filtros + búsqueda */}
      <FiltrosDpp estadoActual={searchParams.estado} q={searchParams.q} />

      {/* Tabla o EmptyState */}
      {(activos?.length ?? 0) === 0 ? (
        <EmptyState
          icono={Scroll}
          titulo="Registra tu primer activo circular"
          descripcion="Empieza a construir confianza con tus clientes. Cada activo tiene su propio pasaporte digital verificable."
          cta={{ label: 'Registra el primer activo', href: '/empresa/dpp/nuevo' }}
        />
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Código DPP', 'Nombre', 'Estado', 'Ciclos', 'CO₂ evitado', 'Actualizado'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--color-brand)', borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activos?.map((a, i) => {
                const est = ESTADO_CONFIG[a.estado ?? 'activo'] ?? ESTADO_CONFIG['activo']
                const co2 = co2PorActivo.get(a.id) ?? 0
                return (
                  <tr key={a.id} style={{
                    background: i % 2 === 0 ? 'var(--bg-primary)' : 'rgba(0,130,124,0.02)',
                  }}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <Link href={`/empresa/dpp/${a.id}`} style={{
                        fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
                        color: '#00827C', textDecoration: 'none',
                      }}>
                        {a.codigo_dpp}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <Link href={`/empresa/dpp/${a.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {a.nombre}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{
                        background: `${est.color}1A`, color: est.color,
                        padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      }}>
                        {est.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {a.n_ciclos ?? 0}
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: co2 > 0 ? '#38B98E' : 'var(--text-secondary)', fontWeight: co2 > 0 ? 700 : 400 }}>
                      {co2 > 0 ? `${co2.toFixed(2)} kg` : '-'}
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
                      {formatFecha(a.updated_at ?? a.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
