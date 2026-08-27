import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ejecutado por Vercel Cron diariamente (vercel.json). Borra toda incidencia
// de /status con más de 30 días desde su creación — SIN excepción, resueltas
// o no (una incidencia activa que lleva 30 días sin cerrarse ya es un caso
// aparte que se revisa a mano en /admin/status, no un dato para conservar
// indefinidamente). Mismo patrón que cron/cotizador-purga-90d.

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const adminClient = await createAdminClient()
  const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: incidencias, error } = await adminClient
    .from('dpp_incidencias')
    .select('id')
    .lt('created_at', hace30dias)

  if (error) {
    console.error('[cron/status-purga-30d]', error.message)
    return NextResponse.json({ error: 'Error al consultar incidencias.' }, { status: 500 })
  }

  if (!incidencias || incidencias.length === 0) {
    return NextResponse.json({ procesadas: 0, mensaje: 'Sin incidencias que purgar hoy.' })
  }

  const { error: deleteError } = await adminClient
    .from('dpp_incidencias')
    .delete()
    .lt('created_at', hace30dias)

  if (deleteError) {
    console.error('[cron/status-purga-30d] error al borrar:', deleteError.message)
    return NextResponse.json({ error: 'Error al purgar incidencias.' }, { status: 500 })
  }

  console.log(`[cron/status-purga-30d] ${incidencias.length} incidencias purgadas.`)

  return NextResponse.json({
    procesadas: incidencias.length,
    mensaje: `${incidencias.length} incidencias purgadas (30+ días).`,
  })
}
