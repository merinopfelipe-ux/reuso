import { describe, it, expect } from 'vitest'
import { calcularHuellaManufactura } from './lca'

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

  it('ignora los materiales cuyo rol_conservacion sea se_reemplaza', () => {
    const composicion = [
      { peso_kg: 10, factor_co2_kg: 2, rol_conservacion: 'se_conserva' },
      { peso_kg: 5, factor_co2_kg: 3, rol_conservacion: 'se_reemplaza' },
      { peso_kg: 2, factor_co2_kg: 1 }, // Sin rol, debe sumar por defecto
    ]
    // 10 * 2 = 20 (se_conserva)
    // 5 * 3 = 15 (ignorado)
    // 2 * 1 = 2 (sin rol especificado)
    // Total = 22
    expect(calcularHuellaManufactura(composicion)).toBe(22)
  })
})
