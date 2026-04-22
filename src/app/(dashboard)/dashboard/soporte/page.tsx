import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Soporte' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListaTickets } from '@/components/soporte/lista-tickets'

export default async function DashboardSoportePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ width: '100%' }}>
      <ListaTickets esAdmin={false} />
    </div>
  )
}
