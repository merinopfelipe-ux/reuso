import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { construirPdfCotizacion } from '@/lib/pdf/construir-pdf-cotizacion'
import { getIp } from '@/lib/admin-guard'
import { buscarUbicacionPorIp } from '@/lib/geo-ip'

// Descarga pública del resumen básico de una cotización — el token en la
// URL ya es el mecanismo de acceso (mismo modelo que /cot/[token]).
const LIMITE_DESCARGAS = 6

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const adminClient = await createAdminClient()

  const { data: cot } = await adminClient
    .from('crm_cotizaciones')
    .select('id, codigo_cotizacion, updated_at')
    .or(`enlace_publico_token.eq.${params.token},codigo_cotizacion.eq.${params.token}`)
    .single()

  if (!cot) return NextResponse.json({ error: 'Propuesta no encontrada.' }, { status: 404 })

  // Límite de descargas por versión: cuenta solo las descargas registradas
  // desde el último cambio de la cotización (updated_at). Si el asesor edita
  // la propuesta, el contador se reinicia porque es normal volver a
  // descargarla tras un cambio real.
  const { count: descargasPrevias } = await adminClient
    .from('crm_cotizaciones_aperturas')
    .select('id', { count: 'exact', head: true })
    .eq('cotizacion_id', cot.id)
    .eq('tipo', 'descarga')
    .gt('created_at', cot.updated_at)

  if ((descargasPrevias ?? 0) >= LIMITE_DESCARGAS) {
    return NextResponse.json(
      { error: 'limite_descargas', mensaje: 'Superaste el límite de descargas para esta versión de la propuesta.' },
      { status: 429 }
    )
  }

  const pdf = await construirPdfCotizacion(cot.id, adminClient)
  if (!pdf) return NextResponse.json({ error: 'Propuesta no encontrada.' }, { status: 404 })

  // Registrar la descarga en la misma trazabilidad de las aperturas (mejor
  // esfuerzo: si falla, la descarga se entrega igual).
  try {
    const ip = getIp(request)
    const userAgent = request.headers.get('user-agent') ?? null
    const { ciudad, pais } = await buscarUbicacionPorIp(ip)
    await adminClient.from('crm_cotizaciones_aperturas').insert({
      cotizacion_id: cot.id,
      ip_address: ip,
      user_agent: userAgent,
      ciudad,
      pais,
      tipo: 'descarga',
    })
  } catch {
    // no interrumpir la descarga si falla el registro de trazabilidad
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cotizacion-${cot.codigo_cotizacion.replace(/\s+/g, '-')}.pdf"`,
    },
  })
}
