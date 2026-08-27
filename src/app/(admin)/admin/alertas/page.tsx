import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AlertasClient } from './components/alertas-client'

export default async function AlertasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = await createAdminClient()
  const [{ data: alertas }, { data: empresas }] = await Promise.all([
    // Solo las que el super_admin creó a mano — las que genera el sistema
    // solo (cotización abierta, ticket respondido, cotización fría) no son
    // "sus" alertas, son eventos del sistema, ver sql/089_alertas_origen_y_delete.sql.
    adminClient.from('alertas').select('*').eq('origen', 'admin').order('created_at', { ascending: false }),
    adminClient.from('empresas').select('id, nombre').eq('activa', true).order('nombre'),
  ])

  return (
    <div>
      <AdminPageHeader titulo="Alertas" subtitulo="Crea y gestiona notificaciones para usuarios y empresas" showBack />
      <AlertasClient alertas={alertas ?? []} empresas={empresas ?? []} />
    </div>
  )
}
