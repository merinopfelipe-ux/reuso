// Reporte 3 — Bitácora de Logística y Residuo Cero. Dominio (C) DPP,
// autocontenido en dpp_ciclos/dpp_activos. Ver skill `dominios-datos`.

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

export type TipoVehiculoTransporte = 'liviano_diesel' | 'mediano_diesel' | 'pesado_diesel'

/**
 * Factores de emisión por vehículo, fuente DEFRA UK Greenhouse Gas
 * Conversion Factors (confirmados con el usuario 2026-08-06),
 * nivel_confianza 'media' — son cifras de referencia por kg CO2/km del
 * vehículo, no un factor por tonelada-km. El proyecto los atribuye al peso
 * transportado (ver `calcularCicloLogistica`) como método de estimación
 * mientras no haya un factor tonelada-km propio que citar; márcalo como tal
 * si algún reporte lo expone a un auditor externo.
 */
export const FACTORES_TRANSPORTE: Record<TipoVehiculoTransporte, { factor_kg_co2_km: number; etiqueta: string; fuente: string }> = {
  liviano_diesel: {
    factor_kg_co2_km: 0.21,
    etiqueta: 'Furgoneta / van ligera diésel (<3.5t)',
    fuente: 'DEFRA UK Greenhouse Gas Conversion Factors',
  },
  mediano_diesel: {
    factor_kg_co2_km: 0.58,
    etiqueta: 'Camión mediano rígido diésel (3.5-7.5t)',
    fuente: 'DEFRA UK Greenhouse Gas Conversion Factors',
  },
  pesado_diesel: {
    factor_kg_co2_km: 0.87,
    etiqueta: 'Camión pesado diésel (>7.5t)',
    fuente: 'DEFRA UK Greenhouse Gas Conversion Factors',
  },
}

/** CO2 logística de UN ciclo = distancia_km × (peso_kg / 1000) × factor del vehículo. */
export function calcularCo2Logistica(
  distancia_km: number,
  peso_kg: number,
  tipo_vehiculo: TipoVehiculoTransporte | null
): { co2_logistica_kg: number; factor_emision_aplicado: number | null } {
  if (!tipo_vehiculo || distancia_km <= 0) {
    return { co2_logistica_kg: 0, factor_emision_aplicado: null }
  }
  const factor = FACTORES_TRANSPORTE[tipo_vehiculo].factor_kg_co2_km
  const co2_logistica_kg = r2(distancia_km * (peso_kg / 1000) * factor)
  return { co2_logistica_kg, factor_emision_aplicado: factor }
}

export interface CicloLogistica {
  id: string
  distancia_transporte_km: number
  peso_transportado_kg: number
  tipo_vehiculo_transporte: TipoVehiculoTransporte | null
  peso_residuo_taller_kg: number
  peso_residuo_reciclado_kg: number
  destino_residuo: string | null
}

export interface CicloLogisticaCalculado extends CicloLogistica {
  co2_logistica_kg: number
}

export interface ResultadoLogistica {
  ciclos: CicloLogisticaCalculado[]
  co2_logistica_total_kg: number
  peso_residuo_taller_total_kg: number
  peso_residuo_reciclado_total_kg: number
  tasa_desvio_vertedero_pct: number | null
}

export function calcularLogistica(ciclos: CicloLogistica[]): ResultadoLogistica {
  const ciclosCalculados: CicloLogisticaCalculado[] = ciclos.map((c) => {
    const { co2_logistica_kg } = calcularCo2Logistica(
      c.distancia_transporte_km,
      c.peso_transportado_kg,
      c.tipo_vehiculo_transporte
    )
    return { ...c, co2_logistica_kg }
  })

  const co2_logistica_total_kg = r2(ciclosCalculados.reduce((s, c) => s + c.co2_logistica_kg, 0))
  const peso_residuo_taller_total_kg = r2(ciclos.reduce((s, c) => s + c.peso_residuo_taller_kg, 0))
  const peso_residuo_reciclado_total_kg = r2(ciclos.reduce((s, c) => s + c.peso_residuo_reciclado_kg, 0))
  const tasa_desvio_vertedero_pct = peso_residuo_taller_total_kg > 0
    ? r2((peso_residuo_reciclado_total_kg / peso_residuo_taller_total_kg) * 100)
    : null

  return {
    ciclos: ciclosCalculados,
    co2_logistica_total_kg,
    peso_residuo_taller_total_kg,
    peso_residuo_reciclado_total_kg,
    tasa_desvio_vertedero_pct,
  }
}
