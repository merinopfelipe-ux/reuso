import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'

interface CotizacionAceptar {
  id: string
  estado: string
  empresa_id: string
  asesor_id: string | null
  codigo_cotizacion: string
  crm_clientes: { nombre: string } | { nombre: string }[] | null
}

export async function POST(
  _: Request,
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

  const cotTyped = cot as unknown as CotizacionAceptar

  // Solo cambia si no está ya aceptada o cerrada
  const estadosFinales = ['cerrado_ganado', 'cerrado_perdido', 'cerrado_inviable']
  if (estadosFinales.includes(cotTyped.estado)) {
    return NextResponse.json({ ok: true, estado: cotTyped.estado })
  }

  const { error } = await adminClient
    .from('crm_cotizaciones')
    .update({
      estado: 'esperando_anticipo',
      updated_at: new Date().toISOString(),
    })
    .eq('id', cotTyped.id)

  if (error) {
    return NextResponse.json({ error: 'No pudimos registrar tu aceptación. Intenta de nuevo.' }, { status: 500 })
  }

  // Notificar al asesor con alerta en campana
  if (cotTyped.asesor_id) {
    const cl = Array.isArray(cotTyped.crm_clientes) ? cotTyped.crm_clientes[0] : cotTyped.crm_clientes
    const clienteNombre = cl?.nombre ?? 'El cliente'
    await adminClient.from('alertas').insert({
      titulo: 'Propuesta aceptada',
      mensaje: `${clienteNombre} aceptó la propuesta ${cotTyped.codigo_cotizacion}. Coordina el anticipo.`,
      tipo: 'success',
      destinatario_tipo: 'usuario',
      destinatario_id: cotTyped.asesor_id,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  await logAuditoria(adminClient, {
    user_id: cotTyped.asesor_id ?? 'sistema',
    accion: 'propuesta_aceptada_cliente',
    detalle: { cotizacion_id: cotTyped.id, token: params.token },
    ip: 'publica',
  })

  return NextResponse.json({ ok: true, estado: 'esperando_anticipo' })
}
