import { describe, it, expect } from 'vitest'
import { calcularMetricasFinancieras } from './financiero'

const SILLA_MADERA: Parameters<typeof calcularMetricasFinancieras>[0] = {
  p_virgin_usd_kg: 3.5,
  q_circular_kg: 8,
  c_adquisicion: 180_000,
  c_operacion: 20_000,
  c_mantenimiento: 15_000,
  c_disposicion: 25_000,
  v_reventa: 60_000,
  m_secundario_kg: 6,
  m_renovable_kg: 2,
  m_total_input_kg: 9,
  n_ciclos: 3,
  ahorro_operativo: 40_000,
  inversion_ce: 35_000,
  fp_ce: 12,
  fp_lineal: 30,
  c_impuesto_evitado: 5_000,
  moneda: 'COP',
}

describe('calcularMetricasFinancieras — silla de madera COP', () => {
  const res = calcularMetricasFinancieras(SILLA_MADERA)

  it('calcula TCO correctamente', () => {
    // 180000 + 20000 + 15000 + 25000 - 60000 = 180000
    expect(res.tco).toBe(180_000)
  })

  it('calcula TCO unitario por ciclo', () => {
    // 180000 / 3 = 60000
    expect(res.tco_unitario).toBe(60_000)
  })

  it('calcula costo evitado', () => {
    // (3.5 * 8) + 25000 + 5000 = 28 + 25000 + 5000 = 30028
    expect(res.costo_evitado).toBe(30_028)
  })

  it('calcula E-ROI mayor a 100%', () => {
    // ((40000 + 30028) / 35000) * 100 ≈ 200.08
    expect(res.e_roi).toBeGreaterThan(100)
  })

  it('calcula ICE negativo — mejora ambiental', () => {
    // ((12 - 30) / 30) * 100 = -60
    expect(res.ice_porcentaje).toBe(-60)
  })

  it('calcula inflow circular', () => {
    // ((6 + 2) / 9) * 100 ≈ 88.89
    expect(res.inflow_circular_pct).toBeCloseTo(88.89, 1)
  })

  it('genera narrativa en voz activa', () => {
    expect(res.narrativa).toBeTruthy()
    expect(res.narrativa.length).toBeGreaterThan(20)
    expect(res.narrativa).toContain('Evitaste')
  })

  it('snapshot contiene inputs originales y metadata', () => {
    expect(res.snapshot.n_ciclos).toBe(3)
    expect(res.snapshot.version).toBe('1.0.0')
    expect(res.snapshot.calculado_at).toBeTruthy()
    expect(res.snapshot.moneda).toBe('COP')
  })

  it('nunca divide por cero con n_ciclos=0', () => {
    const res0 = calcularMetricasFinancieras({ ...SILLA_MADERA, n_ciclos: 0 })
    expect(Number.isFinite(res0.tco_unitario)).toBe(true)
    expect(res0.tco_unitario).toBe(res0.tco)
  })

  it('e_roi es 0 cuando inversion_ce=0', () => {
    const res0 = calcularMetricasFinancieras({ ...SILLA_MADERA, inversion_ce: 0 })
    expect(res0.e_roi).toBe(0)
  })

  it('ice_porcentaje es 0 cuando fp_lineal=0', () => {
    const res0 = calcularMetricasFinancieras({ ...SILLA_MADERA, fp_lineal: 0 })
    expect(res0.ice_porcentaje).toBe(0)
  })

  it('inflow_circular_pct es 0 cuando m_total_input_kg=0', () => {
    const res0 = calcularMetricasFinancieras({ ...SILLA_MADERA, m_total_input_kg: 0 })
    expect(res0.inflow_circular_pct).toBe(0)
  })

  it('desglose costo_evitado suma correctamente', () => {
    const d = res.desglose.costo_evitado_desglose
    expect(d.ahorro_material).toBe(28)
    expect(d.ahorro_disposicion).toBe(25_000)
    expect(d.ahorro_impuesto).toBe(5_000)
    expect(d.ahorro_material + d.ahorro_disposicion + d.ahorro_impuesto).toBe(res.costo_evitado)
  })
})
