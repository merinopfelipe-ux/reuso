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
  const { data: plantillas } = await adminClient
    .from('plantillas_documentos')
    .select('*')
    .order('tipo')

  return (
    <div>
      <AdminPageHeader
        titulo="Plantillas de Documentos"
        subtitulo="Configura la firma, el firmante y el pie legal que aparecen en certificados e informes"
        showBack
      />
      <PlantillasClient plantillas={plantillas ?? []} />
    </div>
  )
}
