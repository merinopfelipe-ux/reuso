import { describe, it, expect } from 'vitest'
import { calcularRentabilidad, type MuebleCotizadoRentabilidad } from './rentabilidad'

const SILLA: MuebleCotizadoRentabilidad = {
  id: 'silla-1',
  titulo: 'Silla comedor restaurada',
  cantidad: 4,
  precio_mercado_nuevo: 150_000,
  precio_mercado_estado: 'confirmado',
  total_servicios: 60_000,
  total_insumos: 40_000,
  asesor_nombre: 'Marco',
  cliente_nombre: 'Hotel Andino',
}

const MESA_SIN_PRECIO: MuebleCotizadoRentabilidad = {
  id: 'mesa-1',
  titulo: 'Mesa de centro',
  cantidad: 1,
  precio_mercado_nuevo: null,
  precio_mercado_estado: 'sin_resultado',
  total_servicios: 30_000,
  total_insumos: 10_000,
  asesor_nombre: 'Marco',
  cliente_nombre: 'Hotel Andino',
}

describe('calcularRentabilidad - silla con precio confirmado + mesa sin precio', () => {
  const res = calcularRentabilidad([SILLA, MESA_SIN_PRECIO])

  it('omite del cálculo los muebles sin precio de mercado', () => {
    expect(res.omitidos_sin_precio_mercado).toBe(1)
    expect(res.items).toHaveLength(1)
  })

  it('calcula el ahorro neto CAPEX: (150000*4) - (60000+40000) = 500000', () => {
    expect(res.ahorro_neto_total).toBe(500_000)
  })

  it('calcula el margen costo-beneficio: (150000*4) / 100000 = 6', () => {
    expect(res.margen_costo_beneficio_promedio).toBe(6)
  })

  it('desglosa servicios e insumos', () => {
    expect(res.total_servicios).toBe(60_000)
    expect(res.total_insumos).toBe(40_000)
  })

  it('agrupa por asesor', () => {
    expect(res.por_asesor).toEqual([{ asesor_nombre: 'Marco', ahorro_neto: 500_000, cantidad_muebles: 1 }])
  })
})

describe('calcularRentabilidad - lista vacía', () => {
  it('no rompe con cero muebles', () => {
    const res = calcularRentabilidad([])
    expect(res.ahorro_neto_total).toBe(0)
    expect(res.margen_costo_beneficio_promedio).toBeNull()
    expect(res.por_asesor).toEqual([])
  })
})
