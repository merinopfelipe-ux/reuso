import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { puedeAccederModulo } from '@/lib/permisos/modulos'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

const ReportesClient = dynamic(
  () => import('./components/reportes-client').then(m => ({ default: m.ReportesClient })),
  { ssr: false, loading: () => <div style={{ height: 400, borderRadius: 12, background: 'var(--bg-hover)' }} /> }
)

export default async function EmpresaReportesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'empresa_admin' && perfil?.rol !== 'super_admin') redirect('/dashboard')
  if (!perfil?.empresa_id && perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()
  const empresaId = perfil.empresa_id

  const [{ data: empresa }, cotizadorActivo] = await Promise.all([
    empresaId
      ? adminClient.from('empresas').select('nombre').eq('id', empresaId).single()
      : Promise.resolve({ data: null }),
    empresaId
      ? puedeAccederModulo(user.id, empresaId, perfil.rol, 'cotizador_crm')
      : Promise.resolve(true),
  ])

  return (
    <div style={{ width: '100%' }}>
      <AdminPageHeader titulo="Reportes" subtitulo="Rentabilidad, mitigación ecológica, logística y gobernanza de tu empresa." showBack />

      <ReportesClient
        empresaNombre={empresa?.nombre ?? 'Tu empresa'}
        cotizadorActivo={cotizadorActivo}
      />
    </div>
  )
}
