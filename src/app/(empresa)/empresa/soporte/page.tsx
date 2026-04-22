import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Soporte' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ListaTickets } from '@/components/soporte/lista-tickets'

export default async function EmpresaSoportePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()

  const esAdmin = perfil?.rol === 'empresa_admin' || perfil?.rol === 'super_admin'

  return (
    <div style={{ width: '100%' }}>
      <AdminPageHeader titulo="Soporte y Asistencia" subtitulo="Gestión de incidencias y dudas de tu organización." showBack />
      <ListaTickets esAdmin={esAdmin} />
    </div>
  )
}
