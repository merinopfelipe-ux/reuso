import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Redactar Correo | Admin' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { NuevoCorreoClient } from './nuevo-correo-client'

export default async function NuevoCorreoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, nombre, apellido')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()
  const { data: empresas } = await adminClient
    .from('empresas')
    .select('id, nombre')
    .order('nombre', { ascending: true })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Redactar nuevo correo"
        subtitulo="Configura los destinatarios, redacta el mensaje con variables y previsualiza cómo llegará antes de enviar."
        showBack
      />

      <NuevoCorreoClient
        empresas={empresas ?? []}
        userEmail={user.email ?? ''}
        userNombre={[perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || 'Superadmin'}
      />
    </div>
  )
}
