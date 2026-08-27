import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { calcularLogistica, type CicloLogistica, type TipoVehiculoTransporte } from '@/lib/reportes/logistica'

// Reporte 3 — Bitácora de Logística y Residuo Cero. Dominio (C), autocontenido
// en dpp_ciclos/dpp_activos.

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
    return NextResponse.json(
      { error: auth.status === 401 ? 'No autenticado.' : auth.status === 400 ? 'Selecciona una empresa para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth
  const { searchParams } = new URL(request.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  let query = adminClient
    .from('dpp_ciclos')
    .select('id, distancia_transporte_km, tipo_vehiculo_transporte, peso_residuo_taller_kg, peso_residuo_reciclado_kg, destino_residuo, fecha_inicio, dpp_activos(peso_total_kg)')
    .eq('empresa_id', empresa_id)

  if (desde) query = query.gte('fecha_inicio', desde)
  if (hasta) query = query.lte('fecha_inicio', hasta)

  const { data: rows, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Error al cargar los datos de logística.' }, { status: 500 })
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
  return NextResponse.json({ data: resultado })
}
