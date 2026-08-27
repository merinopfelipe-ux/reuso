import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

// Log cronológico de aperturas del enlace público (una fila por visita, ver
// migración 036) — a diferencia de crm_cotizaciones.veces_abierta que solo
// guarda el contador acumulado, esto muestra CUÁNDO abrió cada vez.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' }, { status: auth.status === 400 ? 401 : auth.status })
  }
  const { empresa_id, adminClient } = auth

  const { data: cot } = await adminClient
    .from('crm_cotizaciones')
    .select('id')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()
  if (!cot) return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })

  const { data, error } = await adminClient
    .from('crm_cotizaciones_aperturas')
    .select('id, created_at, user_agent, referrer, ciudad, pais, duracion_seg, tipo')
    .eq('cotizacion_id', params.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/cotizador/cotizaciones/[id]/aperturas]', error)
    return NextResponse.json({ error: 'Error al cargar las aperturas.' }, { status: 500 })
  }

  return NextResponse.json({ data })
}
