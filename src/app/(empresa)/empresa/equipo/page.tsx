import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EquipoClient } from './components/equipo-client'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import type { Rol } from '@/types'

export default async function EmpresaEquipoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  if (!perfil?.empresa_id) redirect('/dashboard')

  const adminClient = await createAdminClient()
  const empresaId = perfil.empresa_id
  const rol = (perfil.rol ?? 'empresa_admin') as Rol

  const [{ data: miembros }, { data: invitaciones }, { data: empresa }] = await Promise.all([
    adminClient
      .from('profiles')
      .select('id, user_id, nombre, rol, created_at, email')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: true }),
    adminClient
      .from('invitaciones')
      .select('id, email, estado, rol_asignado, created_at, expires_at')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(50),
    adminClient
      .from('empresas')
      .select('codigo_registro')
      .eq('id', empresaId)
      .single(),
  ])

  return (
    <div style={{ width: '100%' }}>
      <AdminPageHeader titulo="Equipo" subtitulo="Miembros activos e invitaciones de tu organización." showBack />

      <EquipoClient
        miembros={miembros ?? []}
        invitaciones={invitaciones ?? []}
        empresaId={empresaId}
        rolActual={rol}
        codigoRegistro={empresa?.codigo_registro ?? null}
      />
    </div>
  )
}
