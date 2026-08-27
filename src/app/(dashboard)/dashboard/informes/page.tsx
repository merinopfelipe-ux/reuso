import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PanelInformes } from '@/components/informes/panel-informes'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import type { Informe, Rol } from '@/types'

export default async function DashboardInformesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = await createAdminClient()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol

  // Solo empresa_admin puede generar documentos de empresa; los demás van en modo personal
  // Al no pasar empresa_id, la API resolverá plan desde el perfil y mostrará el mensaje correcto
  const empresaId = rol === 'empresa_admin' ? (perfil?.empresa_id ?? null) : null

  const { data: informesData } = await adminClient
    .from('informes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const informes = (informesData ?? []) as Informe[]

  return (
    <div style={{ width: '100%' }}>
      <AdminPageHeader titulo="Mis informes" subtitulo="Descarga tus informes de impacto ambiental personal." showBack />

      <PanelInformes
        informes={informes}
        empresaId={empresaId}
        modo="personal"
      />
    </div>
  )
}
