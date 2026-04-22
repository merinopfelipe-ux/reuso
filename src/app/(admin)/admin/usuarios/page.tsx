import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Usuarios' }

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { UsuariosClient } from './components/usuarios-client'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.pageSize ?? String(DEFAULT_PAGE_SIZE))))
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const search = searchParams.search ?? ''
  const rolFiltro = searchParams.rol ?? ''
  const offset = (page - 1) * pageSize

  const adminClient = await createAdminClient()
  let query = adminClient
    .from('profiles')
    .select('*, empresas(nombre)', { count: 'exact' })

  if (search) query = query.or(`nombre.ilike.%${search}%,email.ilike.%${search}%`)
  if (rolFiltro) query = query.eq('rol', rolFiltro)

  const { data: perfiles, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  return (
    <div>
      <AdminPageHeader
        titulo="Usuarios"
        subtitulo="Gestiona roles y accesos de todos los usuarios registrados"
        showBack
      />
      <UsuariosClient
        usuarios={perfiles ?? []}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        search={search}
        rolFiltro={rolFiltro}
        currentUserId={user.id}
      />
    </div>
  )
}
