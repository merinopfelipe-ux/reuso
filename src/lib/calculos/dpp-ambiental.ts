// src/lib/calculos/dpp-ambiental.ts
//
// Cálculos ambientales de un activo DPP, derivados directo de su
// composicion_json (ya en formato "peso total del material", a diferencia
// del modelo por unidad de co2.ts/ItemCalculo, pensado para la Calculadora
// y el Cotizador). Reusa PARAM_EQUIV de co2.ts para nunca tener dos
// versiones de la misma constante (árbol/ducha) en el sistema.
import { PARAM_EQUIV } from './co2'

export interface MaterialConAgua {
  peso_kg: number
  factor_agua_l_kg?: number
}

export function calcularHuellaHidrica(composicion: MaterialConAgua[]): number {
  const total = composicion.reduce(
    (sum, m) => sum + m.peso_kg * (m.factor_agua_l_kg ?? 0),
    0
  )
  return Math.round(total * 100) / 100
}

export interface EquivalenciasNarrativas {
  arboles: number
  duchas: number
}

/**
 * Mismas fórmulas y constantes que co2.ts (nunca duplicar el valor): árbol
 * absorbiendo su cuota diaria (anual/365), ducha estándar de 5 minutos.
 */
export function calcularEquivalenciasNarrativas(co2TotalKg: number, aguaTotalL: number): EquivalenciasNarrativas {
  return {
    arboles: Math.round(co2TotalKg / (PARAM_EQUIV.CO2_arbol_anual_kg / 365)),
    duchas: Math.round(aguaTotalL / PARAM_EQUIV.litros_ducha_5min),
  }
}
