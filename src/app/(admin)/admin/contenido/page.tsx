import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Contenido Landing' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ContenidoClient } from './contenido-client'

export default async function AdminContenidoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('rol').eq('user_id', user.id).single()
  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()
  const { data: contenido } = await adminClient
    .from('contenido_landing')
    .select('clave, valor_json, updated_at')
    .order('clave')

  return (
    <div>
      <AdminPageHeader
        titulo="Contenido de la Landing"
        subtitulo="Edita los textos, estadísticas y datos de contacto de la página pública"
        showBack
      />
      <ContenidoClient contenido={contenido ?? []} />
    </div>
  )
}
