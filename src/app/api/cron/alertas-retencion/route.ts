import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ejecutado por Vercel Cron diariamente (vercel.json, mismo horario diario
// que el resto de los crons — Vercel Hobby no garantiza cadencias más
// finas). Retención automática de alertas del admin: se inactivan a las 24h
// de creadas (si seguían activas) y se borran del todo a la semana — mismo
// patrón que cron/status-purga-30d y cron/cotizador-purga-90d. Con chequeo
// diario, "24h" se resuelve entre 24 y 48h después de creada, suficiente
// para el propósito (limpieza de ruido, no un SLA exacto).

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const adminClient = await createAdminClient()
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: inactivadas, error: errorInactivar } = await adminClient
    .from('alertas')
    .update({ activa: false })
    .eq('activa', true)
    .lt('created_at', hace24h)
    .select('id')

  if (errorInactivar) {
    console.error('[cron/alertas-retencion] error al inactivar:', errorInactivar.message)
    return NextResponse.json({ error: 'Error al inactivar alertas.' }, { status: 500 })
  }

  const { data: borradas, error: errorBorrar } = await adminClient
    .from('alertas')
    .delete()
    .lt('created_at', hace7dias)
    .select('id')

  if (errorBorrar) {
    console.error('[cron/alertas-retencion] error al borrar:', errorBorrar.message)
    return NextResponse.json({ error: 'Error al borrar alertas.' }, { status: 500 })
  }

  console.log(`[cron/alertas-retencion] ${inactivadas?.length ?? 0} inactivadas, ${borradas?.length ?? 0} borradas.`)

  return NextResponse.json({
    inactivadas: inactivadas?.length ?? 0,
    borradas: borradas?.length ?? 0,
  })
}
