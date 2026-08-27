import { describe, it, expect } from 'vitest'
import { calcularCotizacion, calcularCotizacionPorItem } from './motor-cotizacion'
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
  it('sofá con tapicería y pintura', () => {
    const resultado = calcularCotizacion({
      oficios: { tapiceria: true, pintura: true, carpinteria_superficial: false },
      config: configSofa,
    })

    expect(resultado.precio_mueble).toBe(240000)
    expect(resultado.co2_evitado_kg).toBe(112.5)
    expect(resultado.agua_evitada_l).toBe(15750)
    expect(resultado.desglose).toHaveLength(2)
    expect(resultado.equivalencias.arboles).toBe(5) // 112.5 / 25 = 4.5 → 5
  })

  it('precio cero cuando no hay oficios activos', () => {
    const resultado = calcularCotizacion({
      oficios: { tapiceria: false, pintura: false, carpinteria_superficial: false },
      config: configSofa,
    })

    expect(resultado.precio_mueble).toBe(0)
    expect(resultado.desglose).toHaveLength(0)
  })

  it('incluye carpintería cuando está activa', () => {
    const resultado = calcularCotizacion({
      oficios: { tapiceria: true, pintura: false, carpinteria_superficial: true },
      config: configSofa,
    })

    expect(resultado.precio_mueble).toBe(270000)
    expect(resultado.desglose).toHaveLength(2)
  })
})

describe('calcularCotizacionPorItem', () => {
  // Datos reales del catálogo sembrado: "Mesa 4 puestos (Mesa con enchape de tapa)"
  const serviciosMesa = [
    { nombre: 'Pintor', precio: 490000 },
    { nombre: 'Carpintero', precio: 180000 },
  ]

  it('1 unidad: precio y CO2 iguales al valor por unidad', () => {
    const resultado = calcularCotizacionPorItem({
      servicios: serviciosMesa,
      insumos: [],
      cantidad: 1,
      factor_rentabilidad: 1,
      co2_evitado_kg_unidad: 154.73,
      agua_evitada_l_unidad: 0,
    })
    expect(resultado.precio_mueble).toBe(670000)
    expect(resultado.co2_evitado_kg).toBe(154.73)
    expect(resultado.desglose).toHaveLength(2)
  })

  it('4 unidades: multiplica el valor POR UNIDAD, no lo repite como líneas separadas', () => {
    const resultado = calcularCotizacionPorItem({
      servicios: [{ nombre: 'Tapicero', precio: 45000 }],
      insumos: [{ nombre: 'Tela', cantidad: 0.3, unidad: 'metros', precio_unitario: 80000 }],
      cantidad: 4,
      factor_rentabilidad: 1,
      co2_evitado_kg_unidad: 10,
      agua_evitada_l_unidad: 5,
    })
    // por unidad: 45000 (tapicero) + 0.3*80000 (tela) = 69000
    expect(resultado.desglose).toHaveLength(2)
    expect(resultado.precio_mueble).toBe(69000 * 4)
    expect(resultado.co2_evitado_kg).toBe(40)
    expect(resultado.agua_evitada_l).toBe(20)
  })

  it('insumos con cantidad×precio_unitario se suman correctamente al desglose', () => {
    const resultado = calcularCotizacionPorItem({
      servicios: [],
      insumos: [{ nombre: 'Tela', cantidad: 7, unidad: 'metros', precio_unitario: 80000 }],
      cantidad: 1,
      factor_rentabilidad: 1,
      co2_evitado_kg_unidad: 0,
      agua_evitada_l_unidad: 0,
    })
    expect(resultado.desglose[0].precio).toBe(560000)
    expect(resultado.precio_mueble).toBe(560000)
  })

  it('factor_rentabilidad multiplica el costo de servicios+insumos antes de la cantidad', () => {
    const resultado = calcularCotizacionPorItem({
      servicios: [{ nombre: 'Tapicero', precio: 100000 }],
      insumos: [],
      cantidad: 2,
      factor_rentabilidad: 2.5,
      co2_evitado_kg_unidad: 0,
      agua_evitada_l_unidad: 0,
    })
    // por unidad: 100000 costo × 2.5 rentabilidad = 250000, × 2 unidades
    expect(resultado.precio_mueble).toBe(500000)
  })
})
