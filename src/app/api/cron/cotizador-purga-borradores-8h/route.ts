import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ejecutado por Vercel Cron diariamente (vercel.json). Borra cotizaciones
// que siguen en 'por_cotizar' (nunca se enviaron al cliente) 8h después de
// que se guardó su primer ítem (borrador_iniciado_at) — el estado de
// borrador solo existe para no perder información por mala conexión, no
// como espacio de trabajo de varios días (decisión explícita del usuario).
// Sin importar cuántos ítems tenga: si sigue en 'por_cotizar' pasadas las
// 8h, se borra igual que las cotizaciones vacías (cotizador-purga-vacias-8h).
//
// IMPORTANTE: esto NUNCA reemplaza ni restringe el borrado manual ya
// existente (DELETE /api/cotizador/cotizaciones/[id], usado individual y en
// lote desde /empresa/cotizador/page.tsx) — el vendedor puede borrar
// cualquier cotización, sea o no "Borrador", en cualquier momento, sin
// relación con este cron.

interface CotizacionAPurgar {
  id: string
  codigo_cotizacion: string
}

interface MuebleImagen {
  imagen_url: string | null
}

// Mismo helper que cotizador-purga-90d — el path interno del bucket
// 'cotizador' es lo único que .remove() acepta, nunca una URL completa.
function pathDeStorage(imagenUrl: string): string {
  const marcador = '/cotizador/'
  const idx = imagenUrl.indexOf(marcador)
  if (idx === -1) return imagenUrl
  return `cotizador/${imagenUrl.slice(idx + marcador.length)}`
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
    .select('id, codigo_cotizacion')
    .eq('estado', 'por_cotizar')
    .not('borrador_iniciado_at', 'is', null)
    .lt('borrador_iniciado_at', hace8h)

  if (error) {
    console.error('[cron/cotizador-purga-borradores-8h]', error.message)
    return NextResponse.json({ error: 'Error al consultar cotizaciones.' }, { status: 500 })
  }

  if (!cotizaciones || cotizaciones.length === 0) {
    return NextResponse.json({ procesadas: 0, mensaje: 'Sin borradores que purgar hoy.' })
  }

  const cotizacionesTyped = cotizaciones as CotizacionAPurgar[]
  let purgadas = 0
  let imagenesBorradas = 0

  for (const cot of cotizacionesTyped) {
    const { data: muebles } = await adminClient
      .from('crm_muebles_cotizados')
      .select('imagen_url')
      .eq('cotizacion_id', cot.id)

    const paths = ((muebles ?? []) as MuebleImagen[])
      .map(m => m.imagen_url)
      .filter((url): url is string => !!url && !url.startsWith('http'))
      .map(pathDeStorage)

    if (paths.length > 0) {
      const { error: storageError } = await adminClient.storage.from('cotizador').remove(paths)
      if (!storageError) imagenesBorradas += paths.length
      else console.error(`[cron/cotizador-purga-borradores-8h] error borrando imágenes de ${cot.codigo_cotizacion}:`, storageError.message)
    }

    const { error: deleteError } = await adminClient.from('crm_cotizaciones').delete().eq('id', cot.id)
    if (!deleteError) purgadas++
    else console.error(`[cron/cotizador-purga-borradores-8h] error borrando ${cot.codigo_cotizacion}:`, deleteError.message)
  }

  console.log(`[cron/cotizador-purga-borradores-8h] ${purgadas} borradores purgados, ${imagenesBorradas} imágenes borradas.`)

  return NextResponse.json({
    procesadas: cotizaciones.length,
    purgadas,
    imagenesBorradas,
    mensaje: `${purgadas} borradores purgados (8h+ sin enviar).`,
  })
}
