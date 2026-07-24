import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
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
    .single()

  if (fetchError) {
    return NextResponse.json({ error: 'Error al verificar la cotización.' }, { status: 500 })
  }

  if (!cot) {
    return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })
  }

  // Generar token si no tiene uno
  let token = cot.enlace_publico_token
  if (!token) {
    token = randomBytes(18).toString('hex')
  }

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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://reuso.lurdes.co'
  const enlace = `${baseUrl}/propuesta/${token}`

  await logAuditoria(adminClient, {
    user_id,
    accion: 'cotizacion_enviada',
    detalle: { cotizacion_id: params.id, token },
    ip,
  })

  return NextResponse.json({ enlace, token })
}
