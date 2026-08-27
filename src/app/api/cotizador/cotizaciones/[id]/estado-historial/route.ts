import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

// Historial cronológico de cambios de estado del embudo (una fila por
// cambio, ver migración 043) — lo usa "Actividad" en el detalle de la
// cotización para mostrar todo el recorrido, no solo el estado actual.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Try/catch general: mismo criterio que los otros 2 endpoints de esta
  // misma pantalla — nunca dejar que una excepción no prevista devuelva algo
  // que no sea JSON.
  try {
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
      .from('crm_cotizaciones_estado_historial')
      .select('id, estado_anterior, estado_nuevo, created_at')
      .eq('cotizacion_id', params.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[GET /api/cotizador/cotizaciones/[id]/estado-historial]', error)
      return NextResponse.json({ error: 'Error al cargar el historial de estados.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (e) {
    console.error('[GET /api/cotizador/cotizaciones/[id]/estado-historial] excepción no prevista', e)
    return NextResponse.json({ error: 'Error al cargar el historial. Intenta de nuevo.' }, { status: 500 })
  }
}
