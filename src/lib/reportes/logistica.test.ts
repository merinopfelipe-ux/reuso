import { describe, it, expect } from 'vitest'
import { calcularCo2Logistica, calcularLogistica, type CicloLogistica } from './logistica'

describe('calcularCo2Logistica', () => {
  it('camión mediano: 100km * (500kg/1000) * 0.58 = 29', () => {
    const res = calcularCo2Logistica(100, 500, 'mediano_diesel')
    expect(res.co2_logistica_kg).toBe(29)
    expect(res.factor_emision_aplicado).toBe(0.58)
  })

  it('sin tipo de vehículo, no calcula nada', () => {
    const res = calcularCo2Logistica(100, 500, null)
    expect(res.co2_logistica_kg).toBe(0)
    expect(res.factor_emision_aplicado).toBeNull()
  })

  it('distancia cero no calcula nada', () => {
    const res = calcularCo2Logistica(0, 500, 'pesado_diesel')
    expect(res.co2_logistica_kg).toBe(0)
  })
})

const CICLO_1: CicloLogistica = {
  id: 'ciclo-1',
  distancia_transporte_km: 50,
  peso_transportado_kg: 200,
  tipo_vehiculo_transporte: 'liviano_diesel',
  peso_residuo_taller_kg: 20,
  peso_residuo_reciclado_kg: 15,
  destino_residuo: 'reciclaje_metales',
}

const CICLO_2: CicloLogistica = {
  id: 'ciclo-2',
  distancia_transporte_km: 30,
  peso_transportado_kg: 100,
  tipo_vehiculo_transporte: 'pesado_diesel',
  peso_residuo_taller_kg: 10,
  peso_residuo_reciclado_kg: 2,
  destino_residuo: 'relleno_sanitario',
}

describe('calcularLogistica - dos ciclos', () => {
  const res = calcularLogistica([CICLO_1, CICLO_2])

  it('suma CO2 logística de ambos ciclos', () => {
    // ciclo1: 50 * 0.2 * 0.21 = 2.1 · ciclo2: 30 * 0.1 * 0.87 = 2.61
    expect(res.co2_logistica_total_kg).toBe(4.71)
  })

  it('suma residuos de taller: 20 + 10 = 30', () => {
    expect(res.peso_residuo_taller_total_kg).toBe(30)
  })

  it('calcula la tasa de desvío de vertedero: (15+2)/30*100', () => {
    expect(res.tasa_desvio_vertedero_pct).toBeCloseTo(56.67, 1)
  })
})

describe('calcularLogistica - sin residuo de taller', () => {
  it('tasa de desvío es null si no hay residuo registrado', () => {
    const res = calcularLogistica([{ ...CICLO_1, peso_residuo_taller_kg: 0, peso_residuo_reciclado_kg: 0 }])
    expect(res.tasa_desvio_vertedero_pct).toBeNull()
  })
})
