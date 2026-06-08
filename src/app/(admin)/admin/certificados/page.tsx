import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Certificados' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { CertificadosAdminClient } from './certificados-client'

export default async function AdminCertificadosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('rol').eq('user_id', user.id).single()
  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()

  const { data, count } = await adminClient
    .from('certificados')
    .select(`
      id, codigo_verificacion, tipo, beneficiario, co2_total,
      created_at, revocado, motivo_revocacion, revocado_en, pdf_url,
      empresa_id,
      empresas!certificados_empresa_id_fkey(nombre)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 29)

  const dataConUrls = await Promise.all(
    (data ?? []).map(async (c) => {
      if (c.pdf_url && !c.pdf_url.startsWith('http')) {
        const { data: urlData } = await adminClient.storage.from('documentos').createSignedUrl(c.pdf_url, 3600)
        return { ...c, pdf_url: urlData?.signedUrl ?? null }
      }
      return c
    })
  )

  return (
    <div>
      <AdminPageHeader
        titulo="Certificados"
        subtitulo="Gestiona y revoca certificados e informes emitidos por la plataforma"
        showBack
      />
      <CertificadosAdminClient
        certificados={dataConUrls as unknown as Parameters<typeof CertificadosAdminClient>[0]['certificados']}
        total={count ?? 0}
      />
    </div>
  )
}
