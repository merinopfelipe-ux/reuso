import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'

export async function POST(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const adminClient = await createAdminClient()

  // Buscar cotización por token público
  const { data: cot, error: fetchError } = await adminClient
    .from('crm_cotizaciones')
    .select('id, estado, empresa_id, asesor_id, codigo_cotizacion, crm_clientes(nombre)')
    .eq('enlace_publico_token', params.token)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: 'Error al verificar la propuesta.' }, { status: 500 })
  }

  if (!cot) {
    return NextResponse.json({ error: 'Propuesta no encontrada.' }, { status: 404 })
  }

  // Solo cambia si no está ya aceptada o cerrada
  const estadosFinales = ['cerrado_ganado', 'cerrado_perdido', 'cerrado_inviable']
  if (estadosFinales.includes(cot.estado)) {
    return NextResponse.json({ ok: true, estado: cot.estado })
  }

  const { error } = await adminClient
    .from('crm_cotizaciones')
    .update({
      estado: 'esperando_anticipo',
      updated_at: new Date().toISOString(),
    })
    .eq('id', cot.id)

  if (error) {
    return NextResponse.json({ error: 'No pudimos registrar tu aceptación. Intenta de nuevo.' }, { status: 500 })
  }

  // Notificar al asesor con alerta en campana
  if (cot.asesor_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cl = Array.isArray(cot.crm_clientes) ? (cot.crm_clientes as any[])[0] : cot.crm_clientes
    const clienteNombre = (cl as { nombre: string } | null)?.nombre ?? 'El cliente'
    await adminClient.from('alertas').insert({
      titulo: 'Propuesta aceptada',
      mensaje: `${clienteNombre} aceptó la propuesta ${cot.codigo_cotizacion}. Coordina el anticipo.`,
      tipo: 'success',
      destinatario_tipo: 'usuario',
      destinatario_id: cot.asesor_id,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  await logAuditoria(adminClient, {
    user_id: cot.asesor_id ?? 'sistema',
    accion: 'propuesta_aceptada_cliente',
    detalle: { cotizacion_id: cot.id, token: params.token },
    ip: 'publica',
  })

  return NextResponse.json({ ok: true, estado: 'esperando_anticipo' })
}
