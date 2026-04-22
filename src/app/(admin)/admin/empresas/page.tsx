import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Empresas' }

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { EmpresasClient } from './components/empresas-client'
import type { Plan } from '@/types'

const DEFAULT_PAGE_SIZE = 20

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.pageSize ?? String(DEFAULT_PAGE_SIZE))))
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const search = searchParams.search ?? ''
  const planFiltro = (searchParams.plan ?? '') as Plan | ''
  const offset = (page - 1) * pageSize

  const adminClient = await createAdminClient()
  let query = adminClient
    .from('empresas')
    .select('*', { count: 'exact' })

  if (search) query = query.ilike('nombre', `%${search}%`)
  if (planFiltro) query = query.eq('plan', planFiltro)

  const { data: empresas, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  // Batch queries para empleados y CO₂ de todas las empresas de la página (evita N+1)
  const ids = (empresas ?? []).map((e) => e.id)
  const [perfilesRes, calculosRes] = ids.length > 0
    ? await Promise.all([
        adminClient.from('profiles').select('empresa_id').in('empresa_id', ids),
        adminClient.from('calculos').select('empresa_id, total_co2').in('empresa_id', ids),
      ])
    : [{ data: [] }, { data: [] }]

  const empleadosMap: Record<string, number> = {}
  const co2Map: Record<string, number> = {}
  for (const p of perfilesRes.data ?? []) {
    if (p.empresa_id) empleadosMap[p.empresa_id] = (empleadosMap[p.empresa_id] ?? 0) + 1
  }
  for (const c of calculosRes.data ?? []) {
    if (c.empresa_id) co2Map[c.empresa_id] = (co2Map[c.empresa_id] ?? 0) + (c.total_co2 ?? 0)
  }

  const empresasConStats = (empresas ?? []).map((emp) => ({
    ...emp,
    total_empleados: empleadosMap[emp.id] ?? 0,
    total_co2: co2Map[emp.id] ?? 0,
  }))

  return (
    <div>
      <AdminPageHeader
        titulo="Empresas"
        subtitulo="Gestiona planes, estados y notas de cada empresa"
        showBack
      />
      <EmpresasClient
        empresas={empresasConStats}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        search={search}
        planFiltro={planFiltro}
      />
    </div>
  )
}
