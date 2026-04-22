import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Reportes' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

const ReportesClient = dynamic(
  () => import('./reportes-client').then(m => ({ default: m.ReportesClient })),
  { ssr: false, loading: () => <div style={{ height: 400, borderRadius: 12, background: '#EBF5F4' }} /> }
)

export default async function AdminReportesPage() {
  const supabase = createClient()
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
