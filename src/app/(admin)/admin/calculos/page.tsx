import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Cálculos Globales' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { CalculosAdminClient } from './calculos-client'
import { resolverAutores } from '@/lib/resolver-autores'

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
      empresas!calculos_empresa_id_fkey(nombre)
    `, { count: 'exact' })
    .order('fecha', { ascending: false })
    .range(0, 29)

  // profiles se resuelve aparte, nunca con el embed `profiles!fk(...)`:
  // calculos.user_id referencia auth.users(id), no profiles(id) — el embed
  // rechazaba la consulta COMPLETA y la pantalla se veía siempre vacía, sin
  // ningún error visible porque el destructuring de arriba no lo revisaba.
  const autores = await resolverAutores(adminClient, (data ?? []).map(c => c.user_id))
  const calculosConAutor = (data ?? []).map(c => ({ ...c, profiles: autores.get(c.user_id) ?? null }))

  return (
    <div>
      <AdminPageHeader
        titulo="Cálculos Globales"
        subtitulo="Auditoría de todos los cálculos de CO2 de la plataforma, de todas las empresas. Anula un cálculo con error sin borrar su rastro."
        showBack
      />
      <CalculosAdminClient calculos={calculosConAutor as unknown as Parameters<typeof CalculosAdminClient>[0]['calculos']} total={count ?? 0} />
    </div>
  )
}
