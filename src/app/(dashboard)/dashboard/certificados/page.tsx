import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PanelCertificados } from '@/components/certificados/panel-certificados'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import type { Certificado, Rol } from '@/types'

export default async function DashboardCertificadosPage() {
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

  const { data: certData } = await adminClient
    .from('certificados')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const certificados = (certData ?? []) as Certificado[]

  return (
    <div style={{ width: '100%' }}>
      <AdminPageHeader titulo="Mis certificados e informes" subtitulo="Descarga tus documentos de certificación de impacto ambiental personal." showBack />

      <PanelCertificados
        certificados={certificados}
        empresaId={empresaId}
        modo="personal"
      />
    </div>
  )
}
