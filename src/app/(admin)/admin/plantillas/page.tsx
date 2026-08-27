import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Plantillas de Documentos' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { PlantillasClient } from './plantillas-client'

export default async function AdminPlantillasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('rol').eq('user_id', user.id).single()
  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()
  const [{ data: plantillas }, { data: config }] = await Promise.all([
    adminClient.from('plantillas_documentos').select('*').order('tipo'),
    adminClient.from('config_sistema').select('email_notificaciones').eq('id', 'default').single(),
  ])

  return (
    <div>
      <AdminPageHeader
        titulo="Plantilla de Informes de CO2"
        subtitulo="Configura la firma, el firmante y el pie legal del PDF de Informe de huella de carbono. No tiene relación con el Pasaporte Digital de Producto (DPP), que es un documento aparte."
        showBack
      />
      <PlantillasClient plantillas={plantillas ?? []} emailNotificacionesInicial={config?.email_notificaciones ?? ''} />
    </div>
  )
}
