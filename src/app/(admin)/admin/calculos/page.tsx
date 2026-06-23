import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Cálculos Globales' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { CalculosAdminClient } from './calculos-client'

export default async function AdminCalculosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('rol').eq('user_id', user.id).single()
  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()

  const { data, count } = await adminClient
    .from('calculos')
    .select(`
      id, user_id, empresa_id, fecha, total_co2, total_agua,
      estado, motivo_anulacion, anulado_en, created_at,
      profiles!calculos_user_id_fkey(nombre, apellido),
      empresas!calculos_empresa_id_fkey(nombre)
    `, { count: 'exact' })
    .order('fecha', { ascending: false })
    .range(0, 29)

  return (
    <div>
      <AdminPageHeader
        titulo="Cálculos Globales"
        subtitulo="Todos los cálculos del sistema - anula registros con errores"
        showBack
      />
      <CalculosAdminClient calculos={(data ?? []) as unknown as Parameters<typeof CalculosAdminClient>[0]['calculos']} total={count ?? 0} />
    </div>
  )
}
