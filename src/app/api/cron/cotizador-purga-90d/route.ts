import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ejecutado por Vercel Cron diariamente (vercel.json). Borra POR COMPLETO toda
// cotización con más de 90 días desde su creación — SIN excepción, incluidas
// las cerrado_ganado (regla explícita del negocio, no un descuido). La cascada
// ya definida en el esquema (crm_muebles_cotizados, crm_cotizaciones_notas,
// crm_cotizaciones_aperturas → ON DELETE CASCADE de crm_cotizaciones) se
// encarga del resto. crm_clientes/crm_empresas_clientes NUNCA se tocan aquí.

interface CotizacionAPurgar {
  id: string
  codigo_cotizacion: string
}

interface MuebleImagen {
  imagen_url: string | null
}

// El path interno del bucket 'cotizador' es lo único que .remove() acepta
// (nunca una URL completa). Hoy imagen_url ya guarda ese path relativo
// (verificado en mueble/route.ts), pero esta función es defensiva: si alguna
// vez llegara a contener una URL completa, extrae todo lo que va después de
// "/cotizador/" antes de pasarlo a Storage.
function pathDeStorage(imagenUrl: string): string {
  const marcador = '/cotizador/'
  const idx = imagenUrl.indexOf(marcador)
  if (idx === -1) return imagenUrl // ya es un path relativo (caso normal hoy)
  return `cotizador/${imagenUrl.slice(idx + marcador.length)}`
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const adminClient = await createAdminClient()
  const hace90dias = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: cotizaciones, error } = await adminClient
    .from('crm_cotizaciones')
    .select('id, codigo_cotizacion')
    .lt('created_at', hace90dias)

  if (error) {
    console.error('[cron/cotizador-purga-90d]', error.message)
    return NextResponse.json({ error: 'Error al consultar cotizaciones.' }, { status: 500 })
  }

  if (!cotizaciones || cotizaciones.length === 0) {
    return NextResponse.json({ procesadas: 0, mensaje: 'Sin cotizaciones que purgar hoy.' })
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
      else console.error(`[cron/cotizador-purga-90d] error borrando imágenes de ${cot.codigo_cotizacion}:`, storageError.message)
    }

    const { error: deleteError } = await adminClient.from('crm_cotizaciones').delete().eq('id', cot.id)
    if (!deleteError) purgadas++
    else console.error(`[cron/cotizador-purga-90d] error borrando ${cot.codigo_cotizacion}:`, deleteError.message)
  }

  console.log(`[cron/cotizador-purga-90d] ${purgadas} cotizaciones purgadas, ${imagenesBorradas} imágenes borradas.`)

  return NextResponse.json({
    procesadas: cotizaciones.length,
    purgadas,
    imagenesBorradas,
    mensaje: `${purgadas} cotizaciones purgadas (90+ días).`,
  })
}
