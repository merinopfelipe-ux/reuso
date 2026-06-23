import type { InputsFinancieros, ResultadosFinancieros } from '@/types'

export type { InputsFinancieros, ResultadosFinancieros }

const VERSION = '1.0.0'

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

function generarNarrativa(
  inputs: InputsFinancieros,
  res: Omit<ResultadosFinancieros, 'narrativa' | 'snapshot'>
): string {
  const moneda = inputs.moneda ?? 'COP'
  const fmt = (n: number) =>
    n.toLocaleString('es-CO', { style: 'currency', currency: moneda, maximumFractionDigits: 0 })

  const partes: string[] = []

  if (res.costo_evitado > 0) {
    partes.push(`Evitaste gastar ${fmt(res.costo_evitado)} al no comprar material virgen ni pagar disposición.`)
  }

  if (res.e_roi > 0) {
    if (res.e_roi >= 100) {
      partes.push(`Tu inversión en circularidad rinde ${r2(res.e_roi)}%. Cada peso que inviertes genera más de uno de retorno.`)
    } else {
      partes.push(`Tu inversión en circularidad rinde ${r2(res.e_roi)}%.`)
    }
  }

  if (res.inflow_circular_pct >= 50) {
    partes.push(`Reutilizaste ${r2(res.inflow_circular_pct)}% de materiales circulares en este activo.`)
  }

  if (res.ice_porcentaje < 0) {
    partes.push(`Tu huella ambiental bajó ${r2(Math.abs(res.ice_porcentaje))}% frente al modelo lineal.`)
  }

  if (res.tco_unitario > 0 && inputs.n_ciclos > 1) {
    partes.push(`El costo por ciclo de uso es ${fmt(res.tco_unitario)} en ${inputs.n_ciclos} ciclos.`)
  }

  if (partes.length === 0) {
    partes.push('Registra más datos para ver el análisis financiero completo de este activo.')
  }

  return partes.join(' ')
}

export function calcularMetricasFinancieras(inputs: InputsFinancieros): ResultadosFinancieros {
  const {
    p_virgin_usd_kg, q_circular_kg,
    c_adquisicion, c_operacion, c_mantenimiento, c_disposicion, v_reventa,
    m_secundario_kg, m_renovable_kg, m_total_input_kg,
    n_ciclos,
    ahorro_operativo = 0,
    inversion_ce = 0,
    fp_ce = 0,
    fp_lineal = 0,
    c_impuesto_evitado = 0,
  } = inputs

  // TCO = c_adquisicion + c_operacion + c_mantenimiento + c_disposicion - v_reventa
  const tco = r2(c_adquisicion + c_operacion + c_mantenimiento + c_disposicion - v_reventa)
  const ciclosEfectivos = Math.max(n_ciclos, 1)
  const tco_unitario = r2(tco / ciclosEfectivos)

  // Costo evitado = (p_virgin * q_circular) + c_disposicion + c_impuesto_evitado
  const ahorro_material = r2(p_virgin_usd_kg * q_circular_kg)
  const ahorro_disposicion = r2(c_disposicion)
  const ahorro_impuesto = r2(c_impuesto_evitado)
  const costo_evitado = r2(ahorro_material + ahorro_disposicion + ahorro_impuesto)

  // E-ROI = ((ahorro_operativo + costo_evitado) / inversion_ce) * 100
  const e_roi = inversion_ce > 0
    ? r2(((ahorro_operativo + costo_evitado) / inversion_ce) * 100)
    : 0

  // ICE = ((fp_ce - fp_lineal) / fp_lineal) * 100
  const ice_porcentaje = fp_lineal !== 0
    ? r2(((fp_ce - fp_lineal) / fp_lineal) * 100)
    : 0

  // Inflow circular = ((m_secundario + m_renovable) / m_total) * 100
  const inflow_circular_pct = m_total_input_kg > 0
    ? r2(((m_secundario_kg + m_renovable_kg) / m_total_input_kg) * 100)
    : 0

  const tco_formula = `TCO = ${c_adquisicion} + ${c_operacion} + ${c_mantenimiento} + ${c_disposicion} - ${v_reventa} = ${tco}`

  const parcial: Omit<ResultadosFinancieros, 'narrativa' | 'snapshot'> = {
    tco,
    tco_unitario,
    costo_evitado,
    e_roi,
    ice_porcentaje,
    inflow_circular_pct,
    desglose: {
      tco_formula,
      costo_evitado_desglose: { ahorro_material, ahorro_disposicion, ahorro_impuesto },
    },
  }

  const narrativa = generarNarrativa(inputs, parcial)

  return {
    ...parcial,
    narrativa,
    snapshot: {
      ...inputs,
      calculado_at: new Date().toISOString(),
      version: VERSION,
    },
  }
}
