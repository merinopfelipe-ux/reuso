// Metodología LCA "intermedia" aprobada por el usuario 2026-09-05 (ver
// conceptos/normativa-europea-dpp-y-reclamos-ambientales.md sección 4 del
// Vault del proyecto): asignación por peso (kg). Nunca comunicar esto como
// "LCA certificado" ni "ISO 14067 certificado" — es una estimación
// estructurada siguiendo esos principios, regla de Objetividad de
// CLAUDE.md.

export interface MaterialComposicion {
  peso_kg: number
  factor_co2_kg?: number
  rol_conservacion?: string
}

/**
 * CO2 evitado por fabricar el activo con material reusado en vez de
 * virgen — se calcula UNA SOLA VEZ al crear el DPP. Alimenta el cálculo
 * de "Huella de carbono" del catálogo.
 * Solo suma los materiales que efectivamente se conservan (evitando su
 * producción virgen). Lo que se reemplaza (nuevo) no aporta a la huella evitada.
 */
export function calcularHuellaManufactura(composicion: MaterialComposicion[]): number {
  const total = composicion.reduce(
    (sum, m) => {
      // Si el material explícitamente se reemplaza, es un impacto generado (nuevo), 
      // no evitado. Por lo tanto, no suma a la huella *evitada*.
      if (m.rol_conservacion === 'se_reemplaza') {
        return sum
      }
      return sum + m.peso_kg * (m.factor_co2_kg ?? 0)
    },
    0
  )
  return Math.round(total * 10000) / 10000
}
