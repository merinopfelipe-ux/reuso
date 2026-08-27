import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Métricas y Seguimiento de Correo' }

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CorreoDetalleClient } from './correo-detalle-client'

export default async function AdminCorreoDetallePage({
  params,
}: {
  params: { id: string }
}) {
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

  // 1. Obtener registro de correo
  const { data: correo } = await adminClient
    .from('admin_correos_enviados')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!correo) {
    notFound()
  }

  // 2. Obtener lista de destinatarios y métricas individuales
  const { data: destinatarios } = await adminClient
    .from('admin_correos_destinatarios')
    .select('*')
    .eq('correo_id', params.id)
    .order('created_at', { ascending: true })

  // 3. Obtener nombre de empresa si aplica
  let empresaNombre: string | null = null
  if (correo.empresa_id) {
    const { data: emp } = await adminClient
      .from('empresas')
      .select('nombre')
      .eq('id', correo.empresa_id)
      .single()
    empresaNombre = emp?.nombre ?? null
  }

  // 4. Obtener remitente
  let remitenteNombre: string | null = null
  if (correo.enviado_por) {
    const { data: rem } = await adminClient
      .from('profiles')
      .select('nombre, apellido, email')
      .eq('user_id', correo.enviado_por)
      .single()
    if (rem) {
      remitenteNombre = `${rem.nombre ?? ''} ${rem.apellido ?? ''}`.trim() || rem.email
    }
  }

  return (
    <CorreoDetalleClient
      correo={correo}
      destinatarios={destinatarios ?? []}
      empresaNombre={empresaNombre}
      remitenteNombre={remitenteNombre}
    />
  )
}
