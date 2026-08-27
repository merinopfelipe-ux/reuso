import { describe, it, expect } from 'vitest'
import { calcularMitigacion, type MaterialUsado } from './mitigacion'

const ACERO_ALTA: MaterialUsado = {
  categoria_material: 'metal',
  peso_kg: 10,
  factor_co2_kg: 2.5,
  factor_agua_l_kg: 46,
  nivel_confianza: 'alta',
}

const MADERA_MEDIA: MaterialUsado = {
  categoria_material: 'madera',
  peso_kg: 5,
  factor_co2_kg: 0.4,
  factor_agua_l_kg: 625,
  nivel_confianza: 'media',
}

describe('calcularMitigacion - acero (alta) + madera (media)', () => {
  const res = calcularMitigacion([ACERO_ALTA, MADERA_MEDIA])

  it('suma el peso total: 10 + 5 = 15', () => {
    expect(res.peso_total_kg).toBe(15)
  })

  it('suma el CO2 total: (10*2.5) + (5*0.4) = 27', () => {
    expect(res.co2_total_kg).toBe(27)
  })

  it('suma el agua total: (10*46) + (5*625) = 3585', () => {
    expect(res.agua_total_l).toBe(3585)
  })

  it('calcula el ICD ponderado: (10*100 + 5*85) / 15 = 95', () => {
    expect(res.icd_porcentaje).toBe(95)
  })

  it('desglosa por categoria_material, dos filas', () => {
    expect(res.desglose_por_material).toHaveLength(2)
    const metal = res.desglose_por_material.find((d) => d.categoria_material === 'metal')
    expect(metal?.co2_evitado_kg).toBe(25)
  })
})

describe('calcularMitigacion - nivel_confianza null se trata como baja', () => {
  it('ICD usa el valor 50 cuando no hay nivel_confianza', () => {
    const res = calcularMitigacion([{ ...ACERO_ALTA, nivel_confianza: null }])
    expect(res.icd_porcentaje).toBe(50)
  })
})

describe('calcularMitigacion - lista vacía', () => {
  it('no rompe con cero materiales', () => {
    const res = calcularMitigacion([])
    expect(res.peso_total_kg).toBe(0)
    expect(res.icd_porcentaje).toBe(0)
    expect(res.desglose_por_material).toEqual([])
  })
})
