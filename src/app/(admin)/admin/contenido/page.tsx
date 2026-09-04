import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Contenido Landing' }

// Sin esto, Next.js cachea las llamadas fetch() internas de Supabase y esta
// página muestra contenido viejo tras editar/publicar — mismo bug ya
// documentado y corregido en src/app/api/planes/route.ts. Bug real
// encontrado 2026-09-04: la pestaña FAQ no mostraba el contenido recién
// sembrado en la base aunque los datos ya estaban ahí, verificado en vivo.
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ContenidoClient } from './contenido-client'

export default async function AdminContenidoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('rol').eq('user_id', user.id).single()
  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()
  const { data: contenido } = await adminClient
    .from('contenido_landing')
    .select('clave, valor_json, updated_at')
    .order('clave')

  return (
    <div>
      <AdminPageHeader
        titulo="Contenido de la landing"
        subtitulo="WhatsApp de contacto, precios de los 4 planes y preguntas frecuentes de la página pública"
        showBack
      />
      <ContenidoClient contenido={contenido ?? []} />
    </div>
  )
}
