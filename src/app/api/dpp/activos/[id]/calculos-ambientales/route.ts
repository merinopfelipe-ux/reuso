import { NextRequest, NextResponse } from 'next/server'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { calcularMitigacionPorCiclos, calcularAnalisisCicloVida } from '@/lib/calculos/lca'
import { calcularHuellaHidrica, calcularEquivalenciasNarrativas } from '@/lib/calculos/dpp-ambiental'
import { calcularLogistica, type CicloLogistica } from '@/lib/reportes/logistica'

interface MaterialComposicion {
  peso_kg: number
  factor_co2_kg?: number
  factor_agua_l_kg?: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso para ver este activo.' },
      { status: auth.status }
    )
  }
  const { empresa_id, rol, adminClient } = auth
  const { id } = params

  const { data: activo, error: activoError } = await adminClient
    .from('dpp_activos')
    .select('id, empresa_id, composicion_json, co2_manufactura_kg')
    .eq('id', id)
    .single()

  if (activoError || !activo) {
    return NextResponse.json({ error: 'No encontramos este activo.' }, { status: 404 })
  }
  if (rol !== 'super_admin' && activo.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No tienes permiso para este activo.' }, { status: 403 })
  }

  const { data: ciclosDb, error: ciclosError } = await adminClient
    .from('dpp_ciclos')
    .select('id, co2_ciclo_kg, distancia_transporte_km, tipo_vehiculo_transporte, peso_residuo_taller_kg, peso_residuo_reciclado_kg, destino_residuo')
    .eq('activo_id', id)
    .order('numero_ciclo', { ascending: true })

  if (ciclosError) {
    return NextResponse.json({ error: 'Error al leer los ciclos del activo.' }, { status: 500 })
  }

  const composicion: MaterialComposicion[] = Array.isArray(activo.composicion_json)
    ? activo.composicion_json as MaterialComposicion[]
    : []

  // Regla de Objetividad (CLAUDE.md): un activo sin composicion_json
  // todavía (nadie ha confirmado materiales) da 0 en co2_manufactura_kg
  // por el DEFAULT de la columna — pero ese 0 no es un resultado real, es
  // "todavía no hay nada que calcular". `calculado` deja que quien
  // consuma este endpoint distinga los dos casos en vez de mostrar un
  // 0 como si fuera un dato verificado.
  const calculado = composicion.length > 0
  const co2_manufactura_kg = activo.co2_manufactura_kg ?? 0
  const agua_total_l = calcularHuellaHidrica(composicion)
  const equivalencias = calcularEquivalenciasNarrativas(co2_manufactura_kg, agua_total_l)

  const ciclosParaMitigacion = (ciclosDb ?? []).map(c => ({ co2_ciclo_kg: c.co2_ciclo_kg ?? 0 }))
  const mitigacion = calcularMitigacionPorCiclos(co2_manufactura_kg, ciclosParaMitigacion)
  const acv = calcularAnalisisCicloVida(co2_manufactura_kg, ciclosParaMitigacion)

  const ciclosParaLogistica: CicloLogistica[] = (ciclosDb ?? []).map(c => ({
    id: c.id,
    distancia_transporte_km: c.distancia_transporte_km ?? 0,
    // 0 a propósito: este endpoint solo usa tasa_desvio_vertedero_pct de
    // calcularLogistica (depende únicamente de los pesos de residuo, nunca
    // de este campo). Si en el futuro se necesita co2_logistica_total_kg
    // de este mismo resultado, primero hay que traer el peso real
    // transportado por ciclo — con 0 aquí, ese número saldría mal.
    peso_transportado_kg: 0,
    tipo_vehiculo_transporte: c.tipo_vehiculo_transporte,
    peso_residuo_taller_kg: c.peso_residuo_taller_kg ?? 0,
    peso_residuo_reciclado_kg: c.peso_residuo_reciclado_kg ?? 0,
    destino_residuo: c.destino_residuo,
  }))
  const logistica = calcularLogistica(ciclosParaLogistica)

  return NextResponse.json({
    data: {
      calculado,
      huella_carbono_kg: co2_manufactura_kg,
      huella_hidrica_l: agua_total_l,
      arboles_preservados: equivalencias.arboles,
      duchas_ahorradas: equivalencias.duchas,
      tasa_desvio_vertedero_pct: logistica.tasa_desvio_vertedero_pct,
      mitigacion_por_ciclos: mitigacion,
      analisis_ciclo_vida: acv,
    },
  })
}
