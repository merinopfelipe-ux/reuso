import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ejecutado por Vercel Cron diariamente (vercel.json). Borra cotizaciones sin
// ningún ítem (crm_muebles_cotizados vacío) creadas hace 8h o más — son
// intentos abandonados: el registro en crm_cotizaciones se crea apenas se
// identifica el cliente (handleClienteListo), antes de que se suba ninguna
// foto, así que si nunca se le agregó un ítem no es una cotización real.
// Al ser diario (límite de Vercel Hobby a cadencias más finas, mismo criterio
// que cron/alertas-retencion), una fila vacía puede tardar hasta ~24h+8h en
// borrarse, no exactamente 8h — se acepta porque de todos modos ya está
// oculta de /empresa/cotizador desde el minuto uno (ver GET
// /api/cotizador/cotizaciones). crm_clientes nunca se toca aquí, igual que
// en cotizador-purga-90d.

interface CotizacionVacia {
  id: string
  codigo_cotizacion: string
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const adminClient = await createAdminClient()
  const hace8h = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()

  const { data: cotizaciones, error } = await adminClient
    .from('crm_cotizaciones')
    .select('id, codigo_cotizacion, crm_muebles_cotizados(id)')
    .lt('created_at', hace8h)

  if (error) {
    console.error('[cron/cotizador-purga-vacias-8h]', error.message)
    return NextResponse.json({ error: 'Error al consultar cotizaciones.' }, { status: 500 })
  }

  const vacias = ((cotizaciones ?? []) as unknown as (CotizacionVacia & { crm_muebles_cotizados: { id: string }[] })[])
    .filter((c) => (c.crm_muebles_cotizados?.length ?? 0) === 0)

  if (vacias.length === 0) {
    return NextResponse.json({ procesadas: 0, mensaje: 'Sin cotizaciones vacías que purgar hoy.' })
  }

  const { error: deleteError } = await adminClient
    .from('crm_cotizaciones')
    .delete()
    .in('id', vacias.map((c) => c.id))

  if (deleteError) {
    console.error('[cron/cotizador-purga-vacias-8h] error al borrar:', deleteError.message)
    return NextResponse.json({ error: 'Error al purgar cotizaciones vacías.' }, { status: 500 })
  }

  console.log(`[cron/cotizador-purga-vacias-8h] ${vacias.length} cotizaciones vacías purgadas.`)

  return NextResponse.json({
    procesadas: vacias.length,
    mensaje: `${vacias.length} cotizaciones vacías purgadas (8h+ sin ítems).`,
  })
}
