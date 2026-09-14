import { describe, it, expect } from 'vitest'
import { estimarPorcentajeReciclable, estimarResiduoReciclableKg } from './circularidad'

describe('estimarPorcentajeReciclable', () => {
  it('pondera el % reciclable por el peso de cada material', () => {
    const composicion = [
      { peso_kg: 6, porcentaje_reciclable: 90 },  // metal
      { peso_kg: 4, porcentaje_reciclable: 10 },  // espuma
    ]
    // (6*90 + 4*10) / 10 = 58
    expect(estimarPorcentajeReciclable(composicion)).toBe(58)
  })

  it('devuelve 0 si no hay materiales', () => {
    expect(estimarPorcentajeReciclable([])).toBe(0)
  })

  it('trata porcentaje_reciclable null/undefined como 0', () => {
    const composicion = [{ peso_kg: 10, porcentaje_reciclable: null }]
    expect(estimarPorcentajeReciclable(composicion)).toBe(0)
  })
})

describe('estimarResiduoReciclableKg', () => {
  it('aplica el % ponderado sobre el peso real del residuo', () => {
    const composicion = [
      { peso_kg: 6, porcentaje_reciclable: 90 },
      { peso_kg: 4, porcentaje_reciclable: 10 },
    ]
    // 58% de 20 kg de residuo = 11.6 kg
    expect(estimarResiduoReciclableKg(composicion, 20)).toBe(11.6)
  })
})
