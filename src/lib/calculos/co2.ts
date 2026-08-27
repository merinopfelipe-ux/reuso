export interface ItemCalculo {
  id: string
  nombre: string
  categoria: string
  /** Peso ingresado por el usuario en kg */
  peso_kg_input: number
  /** Factor de CO₂ por UNIDAD (de BD) */
  co2_por_unidad: number
  /** Peso de una unidad en kg (de BD) - usado para derivar co2/kg y agua/kg */
  peso_kg_unidad: number
  /** Factor de agua (litros) por UNIDAD (de BD) — rollup de item_materiales.factor_agua_l_kg */
  agua_por_unidad: number
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

// Litros de agua reales por material (item_materiales.factor_agua_l_kg) — nunca
// una aproximación derivada del CO2. Árbol = absorción anual real; la
// equivalencia narrativa es "cuántos árboles, absorbiendo un solo día,
// igualarían este CO2" (ver fórmula de `arboles` abajo). Ducha = ducha
// estándar de 5 minutos. Directriz explícita del usuario (2026-07-30): estos
// valores reemplazan los anteriores (8 kg CO2/año, ducha de 10 min derivada
// del CO2) en todo el sistema — no coexisten.
const PARAM_EQUIV = {
  CO2_arbol_anual_kg: 25.0,
  litros_ducha_5min: 100.0,
}

/** Calcula el factor CO₂/kg a partir de los campos de BD */
export function factorCo2PorKg(co2_por_unidad: number, peso_kg_unidad: number): number {
  if (peso_kg_unidad <= 0) return 0
  return co2_por_unidad / peso_kg_unidad
}

/** Calcula el factor de agua (L/kg) a partir de los campos de BD */
export function factorAguaPorKg(agua_por_unidad: number, peso_kg_unidad: number): number {
  if (peso_kg_unidad <= 0) return 0
  return agua_por_unidad / peso_kg_unidad
}

export function calcularImpacto(items: ItemCalculo[]): ResultadoCalculo {
  const co2_total = items.reduce((s, i) => {
    const factor = factorCo2PorKg(i.co2_por_unidad, i.peso_kg_unidad)
    return s + i.peso_kg_input * factor
  }, 0)

  const agua_total = items.reduce((s, i) => {
    const factor = factorAguaPorKg(i.agua_por_unidad, i.peso_kg_unidad)
    return s + i.peso_kg_input * factor
  }, 0)

  // "ESTO EQUIVALE A X ÁRBOLES ABSORBIENDO CO2 EN 1 DÍA": X árboles, cada uno
  // absorbiendo su cuota diaria (anual/365), igualan el CO2 total en un día.
  const arboles = Math.round(co2_total / (PARAM_EQUIV.CO2_arbol_anual_kg / 365))
  const duchas = Math.round(agua_total / PARAM_EQUIV.litros_ducha_5min)
  const coches = parseFloat((co2_total / 4600).toFixed(3))

  const co2_por_item: Record<string, number> = {}
  for (const item of items) {
    const factor = factorCo2PorKg(item.co2_por_unidad, item.peso_kg_unidad)
    co2_por_item[item.id] = parseFloat((item.peso_kg_input * factor).toFixed(4))
  }

  return {
    co2_total: parseFloat(co2_total.toFixed(4)),
    agua_total: parseFloat(agua_total.toFixed(2)),
    co2_por_item,
    equivalencias: {
      arboles,
      coches,
      duchas,
      litros: Math.round(agua_total),
    },
  }
}

export { PARAM_EQUIV }
