import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PanelInformes } from '@/components/informes/panel-informes'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import type { Informe } from '@/types'

export default async function EmpresaInformesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  let empresaId = perfil?.empresa_id ?? null

  // super_admin no tiene empresa_id propio: usa la empresa más reciente para QA/vista
  if (!empresaId && perfil?.rol === 'super_admin') {
    const { data: primera } = await supabase
      .from('empresas')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (primera) empresaId = primera.id
  }

  if (!empresaId) redirect('/dashboard')

  const adminClient = await createAdminClient()

  const { data: informesData } = await adminClient
    .from('informes')
    .select('id, tipo, co2_total, agua_total, codigo_verificacion, created_at, beneficiario, pdf_url, user_id, empresa_id, fecha_inicio, fecha_fin, metadata_json')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(50)

  const informes = (await Promise.all(
    (informesData ?? []).map(async (i) => {
      if (i.pdf_url && !i.pdf_url.startsWith('http')) {
        const { data } = await adminClient.storage.from('documentos').createSignedUrl(i.pdf_url, 3600)
        return { ...i, pdf_url: data?.signedUrl ?? null }
      }
      return i
    })
  )) as unknown as Informe[]

  return (
    <div style={{ width: '100%' }}>
      <AdminPageHeader titulo="Informes" subtitulo="Informes de impacto ambiental de tu organización con respaldo de seguridad permanente." showBack />

      <PanelInformes
        informes={informes}
        empresaId={empresaId}
        modo="empresa"
      />
    </div>
  )
}
