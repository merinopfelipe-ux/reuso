import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Reportes' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ReportesClient } from './diferidos'


export default async function AdminReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('rol').eq('user_id', user.id).single()
  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  return (
    <div>
      <AdminPageHeader
        titulo="Reportes"
        subtitulo="Genera y descarga reportes del sistema en PDF o CSV"
        showBack
      />
      <ReportesClient />
    </div>
  )
}
