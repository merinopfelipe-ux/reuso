import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { calcularLogistica, type CicloLogistica, type TipoVehiculoTransporte } from '@/lib/reportes/logistica'
import { generarPDFLogistica } from '@/lib/pdf/generar-pdf-reporte-logistica'
import { fetchImageAsBase64 } from '@/lib/pdf/pdf-shared'

interface CicloRow {
  id: string
  distancia_transporte_km: number | null
  tipo_vehiculo_transporte: TipoVehiculoTransporte | null
  peso_residuo_taller_kg: number | null
  peso_residuo_reciclado_kg: number | null
  destino_residuo: string | null
  dpp_activos: { peso_total_kg: number | null } | null
}

export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin'])
  if (!auth.ok) {
    return NextResponse.json({ error: 'Sin permiso.' }, { status: auth.status })
  }
  const { empresa_id, adminClient } = auth
  const { searchParams } = new URL(request.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const { data: empresa } = await adminClient.from('empresas').select('nombre, logo_propuesta_url, logo_url').eq('id', empresa_id).single()

  let query = adminClient
    .from('dpp_ciclos')
    .select('id, distancia_transporte_km, tipo_vehiculo_transporte, peso_residuo_taller_kg, peso_residuo_reciclado_kg, destino_residuo, fecha_inicio, dpp_activos(peso_total_kg)')
    .eq('empresa_id', empresa_id)
  if (desde) query = query.gte('fecha_inicio', desde)
  if (hasta) query = query.lte('fecha_inicio', hasta)

  const { data: rows, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Error al generar el PDF.' }, { status: 500 })
  }

  const ciclos: CicloLogistica[] = ((rows ?? []) as unknown as CicloRow[]).map((r) => ({
    id: r.id,
    distancia_transporte_km: r.distancia_transporte_km ?? 0,
    peso_transportado_kg: r.dpp_activos?.peso_total_kg ?? 0,
    tipo_vehiculo_transporte: r.tipo_vehiculo_transporte,
    peso_residuo_taller_kg: r.peso_residuo_taller_kg ?? 0,
    peso_residuo_reciclado_kg: r.peso_residuo_reciclado_kg ?? 0,
    destino_residuo: r.destino_residuo,
  }))

  const resultado = calcularLogistica(ciclos)
  const logoUrl = empresa?.logo_propuesta_url ?? empresa?.logo_url ?? null
  const empresa_logo_base64 = logoUrl ? await fetchImageAsBase64(logoUrl) : null
  const buffer = generarPDFLogistica({ empresa_nombre: empresa?.nombre ?? 'Tu empresa', empresa_logo_base64, desde, hasta, resultado })

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-logistica-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  })
}
