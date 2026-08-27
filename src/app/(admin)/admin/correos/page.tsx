import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Correos y Comunicaciones' }

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Plus } from '@/components/ui/icons'
import { CorreosClient } from './correos-client'

export default async function AdminCorreosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()

  let correos: Array<{
    id: string
    asunto: string
    preheader: string | null
    cuerpo_html: string
    tipo: string
    segmento: string
    empresa_id: string | null
    destinatarios_count: number
    destinatarios_lista: string[] | null
    enviado_por: string | null
    estado: string
    error_mensaje: string | null
    created_at: string
  }> = []

  try {
    const { data } = await adminClient
      .from('admin_correos_enviados')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    correos = data ?? []
  } catch (e) {
    console.warn('Tabla admin_correos_enviados no disponible aún:', e)
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Correos y Comunicaciones"
        subtitulo="Redacta, previsualiza y envía correos individuales, segmentados o masivos a tus usuarios y empresas."
        showBack
        accion={
          <Link
            href="/admin/correos/nuevo"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--text-on-brand)] shadow-xs transition-transform hover-pop hover-press no-underline"
          >
            <Plus size={16} />
            Redactar correo
          </Link>
        }
      />

      <CorreosClient correosIniciales={correos} />
    </div>
  )
}
