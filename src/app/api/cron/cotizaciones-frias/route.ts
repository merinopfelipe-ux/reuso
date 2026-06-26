import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ejecutado por Vercel Cron diariamente a las 8:00 AM Colombia (UTC-5 → 13:00 UTC)
// Configurado en vercel.json: { "crons": [{ "path": "/api/cron/cotizaciones-frias", "schedule": "0 13 * * *" }] }

interface CotizacionFria {
  id: string
  codigo_cotizacion: string
  empresa_id: string
  asesor_id: string | null
  updated_at: string
  crm_clientes: { nombre: string } | { nombre: string }[] | null
}

export async function GET(request: NextRequest) {
  // Proteger con CRON_SECRET para que solo Vercel pueda llamarlo
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const adminClient = await createAdminClient()
  const hace48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // Buscar cotizaciones enviadas/en negociación sin actividad hace 48h+
  const { data: frias, error } = await adminClient
    .from('crm_cotizaciones')
    .select('id, codigo_cotizacion, empresa_id, asesor_id, updated_at, crm_clientes(nombre)')
    .in('estado', ['enviada', 'en_negociacion'])
    .lt('updated_at', hace48h)

  if (error) {
    console.error('[cron/cotizaciones-frias]', error.message)
    return NextResponse.json({ error: 'Error al consultar cotizaciones.' }, { status: 500 })
  }

  if (!frias || frias.length === 0) {
    return NextResponse.json({ procesadas: 0, mensaje: 'Sin cotizaciones frías hoy.' })
  }

  const friasTyped = frias as unknown as CotizacionFria[]
  let notificadas = 0

  for (const cot of friasTyped) {
    if (!cot.asesor_id) continue
    const cl = Array.isArray(cot.crm_clientes) ? cot.crm_clientes[0] : cot.crm_clientes
    const clienteNombre = cl?.nombre ?? 'un cliente'
    const diasSinRespuesta = Math.floor(
      (Date.now() - new Date(cot.updated_at).getTime()) / 86_400_000
    )

    // Crear notificación en campana del asesor
    const { error: alertaError } = await adminClient.from('alertas').insert({
      titulo: 'Cotización sin respuesta',
      mensaje: `La propuesta de ${clienteNombre} (${cot.codigo_cotizacion}) lleva ${diasSinRespuesta} días sin actividad. Haz seguimiento.`,
      tipo: 'warning',
      destinatario_tipo: 'usuario',
      destinatario_id: cot.asesor_id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (!alertaError) notificadas++
  }

  console.log(`[cron/cotizaciones-frias] ${notificadas} notificaciones enviadas de ${frias.length} cotizaciones frías.`)

  return NextResponse.json({
    procesadas: frias.length,
    notificadas,
    mensaje: `${notificadas} asesores notificados.`,
  })
}
