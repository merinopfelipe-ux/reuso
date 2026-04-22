import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Tickets de ayuda' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ListaTickets } from '@/components/soporte/lista-tickets'

export default async function AdminTicketsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  return (
    <div>
      <AdminPageHeader titulo="Centro de Soporte Técnico" subtitulo="Gestión de todos los tickets y solicitudes del sistema." showBack />
      <ListaTickets esAdmin={true} />
    </div>
  )
}
