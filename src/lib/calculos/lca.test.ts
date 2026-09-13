import { describe, it, expect } from 'vitest'
import { calcularHuellaManufactura, calcularMitigacionPorCiclos, calcularAnalisisCicloVida } from './lca'

describe('calcularHuellaManufactura', () => {
  it('suma peso_kg * factor_co2_kg de cada material', () => {
    const composicion = [
      { peso_kg: 10, factor_co2_kg: 2.5 },
      { peso_kg: 5, factor_co2_kg: 1.2 },
    ]
    expect(calcularHuellaManufactura(composicion)).toBe(31)
  })

  it('devuelve 0 con una lista vacía', () => {
    expect(calcularHuellaManufactura([])).toBe(0)
  })

  it('ignora materiales sin factor_co2_kg definido', () => {
    const composicion = [
      { peso_kg: 10, factor_co2_kg: 2 },
      { peso_kg: 5 } as { peso_kg: number; factor_co2_kg?: number },
    ]
    expect(calcularHuellaManufactura(composicion)).toBe(20)
  })

  it('redondea a 4 decimales, igual que el resto del sistema (co2.ts)', () => {
    const composicion = [{ peso_kg: 1, factor_co2_kg: 1 / 3 }]
    expect(calcularHuellaManufactura(composicion)).toBe(0.3333)
  })
})

describe('calcularMitigacionPorCiclos', () => {
  it('suma el transporte de todos los ciclos + la manufactura UNA sola vez', () => {
    const resultado = calcularMitigacionPorCiclos(50, [
      { co2_ciclo_kg: 3 },
      { co2_ciclo_kg: 2 },
      { co2_ciclo_kg: 4 },
    ])
    expect(resultado.co2_mitigado_total_kg).toBe(59)
    expect(resultado.desglose.manufactura_kg).toBe(50)
    expect(resultado.desglose.transporte_kg).toBe(9)
  })

  it('sin ciclos, el total es solo la manufactura', () => {
    const resultado = calcularMitigacionPorCiclos(50, [])
    expect(resultado.co2_mitigado_total_kg).toBe(50)
    expect(resultado.desglose.transporte_kg).toBe(0)
  })

  it('con manufactura en 0 (activo sin composicion_json todavía), solo cuenta transporte', () => {
    const resultado = calcularMitigacionPorCiclos(0, [{ co2_ciclo_kg: 5 }])
    expect(resultado.co2_mitigado_total_kg).toBe(5)
  })
})

describe('calcularAnalisisCicloVida', () => {
  it('desglosa el total por etapa, con porcentajes que suman 100', () => {
    const resultado = calcularAnalisisCicloVida(80, [
      { co2_ciclo_kg: 15 },
      { co2_ciclo_kg: 5 },
    ])
    expect(resultado.manufactura_kg).toBe(80)
    expect(resultado.transporte_kg).toBe(20)
    expect(resultado.total_kg).toBe(100)
    expect(resultado.manufactura_pct).toBe(80)
    expect(resultado.transporte_pct).toBe(20)
  })

  it('con total en 0, los porcentajes son 0 (nunca NaN ni división por cero)', () => {
    const resultado = calcularAnalisisCicloVida(0, [])
    expect(resultado.total_kg).toBe(0)
    expect(resultado.manufactura_pct).toBe(0)
    expect(resultado.transporte_pct).toBe(0)
  })
})
