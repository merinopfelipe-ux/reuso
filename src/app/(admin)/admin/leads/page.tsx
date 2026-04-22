import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Gestión de Leads' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { LeadsClient } from './leads-client'

export default async function AdminLeadsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()
  const { data: leads } = await adminClient
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <AdminPageHeader
        titulo="Gestión de Leads"
        subtitulo="Prospectos capturados desde la landing page"
        showBack
      />
      <LeadsClient leads={leads ?? []} />
    </div>
  )
}
