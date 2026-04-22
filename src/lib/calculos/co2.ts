export interface ItemCalculo {
  id: string
  nombre: string
  categoria: string
  /** Peso ingresado por el usuario en kg */
  peso_kg_input: number
  /** Factor de CO₂ por UNIDAD (de BD) */
  co2_por_unidad: number
  /** Peso de una unidad en kg (de BD) — usado para derivar co2/kg */
  peso_kg_unidad: number
}

export interface ResultadoCalculo {
  co2_total: number
  agua_total: number
  co2_por_item: Record<string, number>
  equivalencias: {
    arboles: number
    coches: number
    duchas: number
    litros: number
  }
}

const PARAM_EQUIV = {
  CO2_arbol_anual_kg: 8.0,
  litros_ducha_10min: 90,
  CO2_ducha_10min_kg: 2.0,
}

/** Calcula el factor CO₂/kg a partir de los campos de BD */
export function factorCo2PorKg(co2_por_unidad: number, peso_kg_unidad: number): number {
  if (peso_kg_unidad <= 0) return 0
  return co2_por_unidad / peso_kg_unidad
}

export function calcularImpacto(items: ItemCalculo[]): ResultadoCalculo {
  const co2_total = items.reduce((s, i) => {
    const factor = factorCo2PorKg(i.co2_por_unidad, i.peso_kg_unidad)
    return s + i.peso_kg_input * factor
  }, 0)

  const duchas = co2_total / PARAM_EQUIV.CO2_ducha_10min_kg
  const litros = duchas * PARAM_EQUIV.litros_ducha_10min
  const arboles = Math.round(co2_total / PARAM_EQUIV.CO2_arbol_anual_kg)
  const coches = parseFloat((co2_total / 4600).toFixed(3))

  const co2_por_item: Record<string, number> = {}
  for (const item of items) {
    const factor = factorCo2PorKg(item.co2_por_unidad, item.peso_kg_unidad)
    co2_por_item[item.id] = parseFloat((item.peso_kg_input * factor).toFixed(4))
  }

  return {
    co2_total: parseFloat(co2_total.toFixed(4)),
    agua_total: parseFloat(litros.toFixed(2)),
    co2_por_item,
    equivalencias: {
      arboles,
      coches,
      duchas: Math.round(duchas),
      litros: Math.round(litros),
    },
  }
}

export { PARAM_EQUIV }
