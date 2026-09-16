import { describe, it, expect } from 'vitest'
import { parsearIcono, construirValorIcono } from './icono-nombre'

describe('parsearIcono', () => {
  it('sin prefijo es Lucide (formato original, compatible con todos los datos ya guardados)', () => {
    expect(parsearIcono('ShelvingUnit')).toEqual({ libreria: 'lucide', nombre: 'ShelvingUnit' })
  })

  it('con prefijo phosphor: es Phosphor', () => {
    expect(parsearIcono('phosphor:Anchor')).toEqual({ libreria: 'phosphor', nombre: 'Anchor' })
  })
})

describe('construirValorIcono', () => {
  it('Lucide se guarda sin prefijo', () => {
    expect(construirValorIcono('lucide', 'ShelvingUnit')).toBe('ShelvingUnit')
  })

  it('Phosphor se guarda con prefijo', () => {
    expect(construirValorIcono('phosphor', 'Anchor')).toBe('phosphor:Anchor')
  })

  it('ida y vuelta reproduce el mismo valor', () => {
    const valor = construirValorIcono('phosphor', 'Anchor')
    expect(parsearIcono(valor)).toEqual({ libreria: 'phosphor', nombre: 'Anchor' })
  })
})
