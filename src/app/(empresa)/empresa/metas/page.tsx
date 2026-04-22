import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Metas Ambientales' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ListaMetas } from '@/components/empresa/lista-metas'

export default async function EmpresaMetasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  if (!profile?.empresa_id) redirect('/dashboard')

  const esAdmin = profile.rol === 'empresa_admin' || profile.rol === 'super_admin'

  return (
    <div style={{ width: '100%' }}>
      <AdminPageHeader 
        titulo="Metas y Objetivos" 
        subtitulo="Haz seguimiento de las proyecciones de impacto ambiental de tu empresa." 
        showBack 
      />
      <ListaMetas esAdmin={esAdmin} />
    </div>
  )
}
