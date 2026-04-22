import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Logs de auditoría' }

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { LogsClient } from './components/logs-client'

const DEFAULT_PAGE_SIZE = 20

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.pageSize ?? String(DEFAULT_PAGE_SIZE))))
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const accionFiltro = searchParams.accion ?? ''
  const desde = searchParams.desde ?? ''
  const hasta = searchParams.hasta ?? ''
  const offset = (page - 1) * pageSize

  const adminClient = await createAdminClient()
  let query = adminClient
    .from('logs_auditoria')
    .select('*', { count: 'exact' })

  if (accionFiltro) query = query.eq('accion', accionFiltro)
  if (desde) query = query.gte('created_at', `${desde}T00:00:00.000Z`)
  if (hasta) query = query.lte('created_at', `${hasta}T23:59:59.999Z`)

  const { data: logs, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  // Cargar lista de acciones disponibles para el filtro
  const { data: accionesRows } = await adminClient
    .from('logs_auditoria')
    .select('accion')
    .order('accion')

  const acciones = Array.from(new Set((accionesRows ?? []).map(l => l.accion))).sort()

  return (
    <div>
      <AdminPageHeader
        titulo="Logs de auditoría"
        subtitulo="Registro cronológico y permanente de actividad administrativa"
        showBack
      />
      <LogsClient
        logs={logs ?? []}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        accionFiltro={accionFiltro}
        desde={desde}
        hasta={hasta}
        accionesDisponibles={acciones}
      />
    </div>
  )
}
