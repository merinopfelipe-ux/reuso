import { describe, it, expect } from 'vitest'
import { estimarPorcentajeReciclable, estimarResiduoReciclableKg, desglosarMasaCircular, type MaterialConCategoria } from './circularidad'

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

describe('desglosarMasaCircular', () => {
  it('separa renovable vs no renovable, y todo cuenta como secundario', () => {
    const composicion: MaterialConCategoria[] = [
      { peso_kg: 6, categoria_material: 'madera' },   // renovable
      { peso_kg: 4, categoria_material: 'metal' },     // no renovable
    ]
    const resultado = desglosarMasaCircular(composicion)
    expect(resultado.m_total_input_kg).toBe(10)
    expect(resultado.m_secundario_kg).toBe(10) // todo objeto reusado = 100% secundario
    expect(resultado.m_renovable_kg).toBe(6)
    expect(resultado.q_circular_kg).toBe(10)
  })
})
