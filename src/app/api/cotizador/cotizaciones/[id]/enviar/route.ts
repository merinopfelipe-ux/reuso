import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.status === 401
          ? 'Inicia sesión para continuar.'
          : auth.status === 400
            ? 'Selecciona una empresa para continuar.'
            : 'Sin permiso.',
      },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, adminClient } = auth
  const ip = getIp(request)

  // Verificar que la cotización pertenece a esta empresa
  const { data: cot, error: fetchError } = await adminClient
    .from('crm_cotizaciones')
    .select('id, estado, enlace_publico_token, codigo_cotizacion')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()

  if (fetchError) {
    console.error('[POST /api/cotizador/cotizaciones/[id]/enviar]', fetchError)
    return NextResponse.json({ error: 'Error al verificar la cotización.' }, { status: 500 })
  }

  if (!cot) {
    return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })
  }

  // El token del enlace público es el mismo codigo_cotizacion (ver
  // cotizaciones/route.ts) — un solo identificador, no dos códigos
  // distintos para una misma cotización.
  const token = cot.enlace_publico_token ?? cot.codigo_cotizacion

  const { error } = await adminClient
    .from('crm_cotizaciones')
    .update({
      enlace_publico_token: token,
      estado: 'enviada',
      fecha_enviada: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Error al generar el enlace.' }, { status: 500 })
  }

  if (cot.estado !== 'enviada') {
    await adminClient.from('crm_cotizaciones_estado_historial').insert({
      cotizacion_id: params.id,
      estado_anterior: cot.estado ?? null,
      estado_nuevo: 'enviada',
      user_id,
    })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://reuso.lurdes.co'
  const enlace = `${baseUrl}/cot/${token}`

  await logAuditoria(adminClient, {
    user_id,
    accion: 'cotizacion_enviada',
    detalle: { cotizacion_id: params.id, token },
    ip,
  })

  return NextResponse.json({ enlace, token })
}
