import { describe, it, expect } from 'vitest'
import { calcularCotizacion } from './motor-cotizacion'
import type { ConfigCostosMueble } from './motor-cotizacion'

const configSofa: ConfigCostosMueble = {
  tipo_mueble: 'Sofá 3 puestos',
  peso_estandar_kg: 45,
  precio_tapiceria: 180000,
  precio_pintura: 60000,
  precio_carpinteria: 90000,
  factor_co2_kg: 2.5,
  factor_agua_l: 350,
}

describe('calcularCotizacion', () => {
  it('sofá con tapicería y pintura, sin daños ocultos', () => {
    const resultado = calcularCotizacion({
      oficios: { tapiceria: true, pintura: true, carpinteria_superficial: false },
      ajustes_humanos: { danos_ocultos: false },
      config: configSofa,
    })

    expect(resultado.precio_mueble).toBe(240000)
    expect(resultado.co2_evitado_kg).toBe(112.5)
    expect(resultado.agua_evitada_l).toBe(15750)
    expect(resultado.desglose).toHaveLength(2)
    expect(resultado.equivalencias.arboles).toBe(14) // 112.5 / 8 = 14.06 → 14
  })

  it('aplica +20% con daños ocultos', () => {
    const resultado = calcularCotizacion({
      oficios: { tapiceria: true, pintura: false, carpinteria_superficial: false },
      ajustes_humanos: { danos_ocultos: true },
      config: configSofa,
    })

    expect(resultado.precio_mueble).toBe(216000) // 180000 * 1.2
  })

  it('precio cero cuando no hay oficios activos', () => {
    const resultado = calcularCotizacion({
      oficios: { tapiceria: false, pintura: false, carpinteria_superficial: false },
      ajustes_humanos: { danos_ocultos: false },
      config: configSofa,
    })

    expect(resultado.precio_mueble).toBe(0)
    expect(resultado.desglose).toHaveLength(0)
  })

  it('incluye carpintería cuando está activa', () => {
    const resultado = calcularCotizacion({
      oficios: { tapiceria: true, pintura: false, carpinteria_superficial: true },
      ajustes_humanos: { danos_ocultos: false },
      config: configSofa,
    })

    expect(resultado.precio_mueble).toBe(270000)
    expect(resultado.desglose).toHaveLength(2)
  })
})
