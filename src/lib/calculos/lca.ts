// Metodología LCA "intermedia" aprobada por el usuario 2026-09-05 (ver
// conceptos/normativa-europea-dpp-y-reclamos-ambientales.md sección 4 del
// Vault del proyecto): asignación por peso (kg), reportado por ciclo de
// vida del activo, con la huella de manufactura original contada UNA SOLA
// VEZ en el primer ciclo. Nunca comunicar esto como "LCA certificado" ni
// "ISO 14067 certificado" — es una estimación estructurada siguiendo esos
// principios, regla de Objetividad de CLAUDE.md.

export interface MaterialComposicion {
  peso_kg: number
  factor_co2_kg?: number
}

/**
 * CO2 evitado por fabricar el activo con material reusado en vez de
 * virgen — se calcula UNA SOLA VEZ al crear el DPP, nunca en ciclos
 * posteriores.
 */
export function calcularHuellaManufactura(composicion: MaterialComposicion[]): number {
  const total = composicion.reduce(
    (sum, m) => sum + m.peso_kg * (m.factor_co2_kg ?? 0),
    0
  )
  return Math.round(total * 10000) / 10000
}

export interface CicloParaMitigacion {
  co2_ciclo_kg: number
}

export interface ResultadoMitigacion {
  co2_mitigado_total_kg: number
  desglose: {
    manufactura_kg: number
    transporte_kg: number
  }
}

/**
 * Cálculo #6 del catálogo: Mitigación acumulada por ciclos de vida.
 * La manufactura ya viene congelada (dpp_activos.co2_manufactura_kg) —
 * aquí solo se suma UNA vez, nunca por ciclo. El transporte sí se suma
 * por cada ciclo real registrado.
 */
export function calcularMitigacionPorCiclos(
  co2ManufacturaKg: number,
  ciclos: CicloParaMitigacion[]
): ResultadoMitigacion {
  const transporte_kg = Math.round(
    ciclos.reduce((sum, c) => sum + c.co2_ciclo_kg, 0) * 10000
  ) / 10000
  const co2_mitigado_total_kg = Math.round((co2ManufacturaKg + transporte_kg) * 10000) / 10000
  return {
    co2_mitigado_total_kg,
    desglose: { manufactura_kg: co2ManufacturaKg, transporte_kg },
  }
}

export interface ResultadoACV {
  manufactura_kg: number
  transporte_kg: number
  total_kg: number
  manufactura_pct: number
  transporte_pct: number
}

/**
 * Cálculo #10 del catálogo: Análisis de Ciclo de Vida (ACV). No es un
 * número único — es el desglose de dónde viene el impacto acumulado, por
 * etapa. Reusa la misma agregación que calcularMitigacionPorCiclos en vez
 * de recalcular la suma dos veces.
 */
export function calcularAnalisisCicloVida(
  co2ManufacturaKg: number,
  ciclos: CicloParaMitigacion[]
): ResultadoACV {
  const { co2_mitigado_total_kg: total_kg, desglose } = calcularMitigacionPorCiclos(co2ManufacturaKg, ciclos)
  const manufactura_pct = total_kg > 0 ? Math.round((desglose.manufactura_kg / total_kg) * 10000) / 100 : 0
  const transporte_pct = total_kg > 0 ? Math.round((desglose.transporte_kg / total_kg) * 10000) / 100 : 0
  return {
    manufactura_kg: desglose.manufactura_kg,
    transporte_kg: desglose.transporte_kg,
    total_kg,
    manufactura_pct,
    transporte_pct,
  }
}
