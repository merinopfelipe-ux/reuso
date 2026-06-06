import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

const schema = z.object({
  estado: z.enum([
    'por_cotizar', 'enviada', 'en_negociacion',
    'esperando_anticipo', 'cerrado_ganado', 'cerrado_perdido', 'cerrado_inviable',
  ]).optional(),
  descuento: z.number().min(0).optional(),
  observaciones: z.string().max(1000).optional(),
  cliente_id: z.uuid('ID de cliente inválido.').optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'Envía al menos un campo para actualizar.' })

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  const { data: cotizacion } = await adminClient
    .from('crm_cotizaciones')
    .select(`
      id, codigo_cotizacion, estado, subtotal, descuento, total,
      co2_evitado_total_kg, agua_evitada_total_l,
      observaciones, enlace_publico_token,
      fecha_enviada, fecha_apertura_cliente, veces_abierta,
      created_at, updated_at, empresa_id,
      crm_clientes ( nombre, telefono, email ),
      profiles ( nombre )
    `)
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .single()

  if (!cotizacion) {
    return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })
  }

  return NextResponse.json({ cotizacion })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, adminClient } = auth
  const ip = getIp(request)

  const { data: cotActual } = await adminClient
    .from('crm_cotizaciones')
    .select('id, subtotal, descuento, total')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .single()

  if (!cotActual) {
    return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })
  }

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400 }
    )
  }

  const actualizar: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }

  if (parsed.data.descuento !== undefined) {
    actualizar.total = Math.max(0, (cotActual.subtotal ?? 0) - parsed.data.descuento)
  }

  const { data: cotActualizada, error } = await adminClient
    .from('crm_cotizaciones')
    .update(actualizar)
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .select()
    .single()

  if (error || !cotActualizada) {
    return NextResponse.json({ error: 'Error al actualizar la cotización.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'cotizacion_actualizada',
    detalle: { cotizacion_id: params.id, cambios: Object.keys(parsed.data) },
    ip,
  })

  return NextResponse.json(cotActualizada)
}
