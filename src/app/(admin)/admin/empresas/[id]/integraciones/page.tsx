import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { SeccionDetalle } from '@/components/ui/detalle-pagina'
import { IntegracionChatwootClient } from '../components/integracion-chatwoot-client'

export default async function IntegracionesEmpresaPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('profiles').select('rol').eq('user_id', user.id).single()
  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()
  const { data: empresa } = await adminClient.from('empresas').select('nombre').eq('id', id).maybeSingle()
  if (!empresa) notFound()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 w-full flex flex-col gap-5">
      <AdminPageHeader
        titulo="Integraciones"
        subtitulo={empresa.nombre}
        showBack
      />

      <SeccionDetalle titulo="Mensajería (Chatwoot)">
        <p className="text-sm text-(--text-secondary) m-0">
          Conecta la bandeja de Chatwoot de esta empresa para que los mensajes de WhatsApp, Instagram y Facebook lleguen al CRM.
        </p>
        <IntegracionChatwootClient empresaId={id} />
      </SeccionDetalle>
    </div>
  )
}
