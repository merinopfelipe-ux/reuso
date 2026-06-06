import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Detalle de activo DPP' }

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DppDetalleClient } from './dpp-detalle-client'

interface PageProps {
  params: { id: string }
}

export default async function DppDetallePage({ params }: PageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  const esSuperAdmin = perfil?.rol === 'super_admin'

  if (!esSuperAdmin && !perfil?.empresa_id) redirect('/dashboard')

  const adminClient = await createAdminClient()

  const [activoRes, ciclosRes, metricasRes, documentosRes] = await Promise.all([
    adminClient
      .from('dpp_activos')
      .select('id, codigo_dpp, nombre, descripcion, estado, n_ciclos, peso_total_kg, composicion_json, hash_integridad, imagen_url, qr_url, created_at, updated_at, empresa_id')
      .eq('id', params.id)
      .single(),
    adminClient
      .from('dpp_ciclos')
      .select('*')
      .eq('activo_id', params.id)
      .order('numero_ciclo', { ascending: false }),
    adminClient
      .from('dpp_metricas_financieras')
      .select('id, tco, costo_evitado, e_roi, ice_porcentaje, inflow_circular_pct, snapshot_json, calculado_at, version')
      .eq('activo_id', params.id)
      .order('calculado_at', { ascending: false })
      .limit(10),
    adminClient
      .from('dpp_documentos_ingesta')
      .select('id, tipo, nombre_archivo, estado_ocr, resultado_json, created_at')
      .eq('activo_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (!activoRes.data || (!esSuperAdmin && activoRes.data.empresa_id !== perfil.empresa_id)) {
    redirect('/empresa/dpp')
  }

  return (
    <DppDetalleClient
      activo={activoRes.data}
      ciclos={ciclosRes.data ?? []}
      metricas={metricasRes.data ?? []}
      documentos={documentosRes.data ?? []}
    />
  )
}
