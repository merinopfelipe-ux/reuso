import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LeadDetalleClient } from './lead-detalle-client'

export const metadata: Metadata = { title: 'Contacto' }

// Ficha de un contacto, pensada para abrirse en una pestaña aparte desde la
// lista: así se le agregan notas sin perder los filtros ni el scroll.
export default async function LeadDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('profiles').select('rol').eq('user_id', user.id).single()
  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()
  const { data: lead } = await adminClient.from('leads').select('*').eq('id', id).maybeSingle()
  if (!lead) notFound()

  return <LeadDetalleClient lead={lead} />
}
