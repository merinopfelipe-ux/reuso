import { describe, it, expect } from 'vitest'
import { calcularHuellaHidrica, calcularEquivalenciasNarrativas } from './dpp-ambiental'

describe('calcularHuellaHidrica', () => {
  it('suma peso_kg * factor_agua_l_kg de cada material', () => {
    const composicion = [
      { peso_kg: 10, factor_agua_l_kg: 5 },
      { peso_kg: 4, factor_agua_l_kg: 2.5 },
    ]
    expect(calcularHuellaHidrica(composicion)).toBe(60)
  })

  it('ignora materiales sin factor_agua_l_kg definido', () => {
    const composicion = [
      { peso_kg: 10, factor_agua_l_kg: 5 },
      { peso_kg: 4 } as { peso_kg: number; factor_agua_l_kg?: number },
    ]
    expect(calcularHuellaHidrica(composicion)).toBe(50)
  })

  it('devuelve 0 con lista vacía', () => {
    expect(calcularHuellaHidrica([])).toBe(0)
  })
})

describe('calcularEquivalenciasNarrativas', () => {
  it('árboles = CO2 total / cuota diaria de un árbol, duchas = agua total / 100L', () => {
    // Mismos PARAM_EQUIV que co2.ts: 25 kg CO2/año por árbol, ducha de 100L.
    const resultado = calcularEquivalenciasNarrativas(25 / 365, 100)
    expect(resultado.arboles).toBe(1)
    expect(resultado.duchas).toBe(1)
  })

  it('con 0 CO2 y 0 agua, ambas equivalencias son 0', () => {
    const resultado = calcularEquivalenciasNarrativas(0, 0)
    expect(resultado.arboles).toBe(0)
    expect(resultado.duchas).toBe(0)
  })
})
