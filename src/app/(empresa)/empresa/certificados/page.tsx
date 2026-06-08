import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PanelCertificados } from '@/components/certificados/panel-certificados'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import type { Certificado } from '@/types'

export default async function EmpresaCertificadosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('user_id', user.id)
    .single()

  if (!perfil?.empresa_id) redirect('/dashboard')

  const adminClient = await createAdminClient()
  const empresaId = perfil.empresa_id

  const { data: certData } = await adminClient
    .from('certificados')
    .select('id, tipo, co2_total, agua_total, codigo_verificacion, created_at, beneficiario, pdf_url, user_id, empresa_id, fecha_inicio, fecha_fin, metadata_json')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(50)

  const certificados = (await Promise.all(
    (certData ?? []).map(async (c) => {
      if (c.pdf_url && !c.pdf_url.startsWith('http')) {
        const { data } = await adminClient.storage.from('documentos').createSignedUrl(c.pdf_url, 3600)
        return { ...c, pdf_url: data?.signedUrl ?? null }
      }
      return c
    })
  )) as unknown as Certificado[]

  return (
    <div style={{ width: '100%' }}>
      <AdminPageHeader titulo="Certificados e Informes" subtitulo="Certificados e informes de impacto ambiental de tu organización con respaldo de seguridad permanente." showBack />

      <PanelCertificados
        certificados={certificados}
        empresaId={empresaId}
        modo="empresa"
      />
    </div>
  )
}
