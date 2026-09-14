// Técnica B (ver calculos/00-indice.md del Vault): estimaciones que se
// calculan con datos que el catálogo YA tiene, sin ninguna IA nueva —
// siempre un punto de partida editable por el humano, nunca un dato final
// impuesto sin revisión (Directriz 4 del CLAUDE.md).

export interface MaterialReciclable {
  peso_kg: number
  porcentaje_reciclable?: number | null
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

/** % reciclable ponderado por peso de toda la composición. */
export function estimarPorcentajeReciclable(composicion: MaterialReciclable[]): number {
  const pesoTotal = composicion.reduce((s, m) => s + m.peso_kg, 0)
  if (pesoTotal <= 0) return 0
  const ponderado = composicion.reduce(
    (s, m) => s + m.peso_kg * (m.porcentaje_reciclable ?? 0),
    0
  )
  return r2(ponderado / pesoTotal)
}

/** Aplica ese % ponderado sobre el peso real de residuo de un ciclo. */
export function estimarResiduoReciclableKg(
  composicion: MaterialReciclable[],
  pesoResiduoTotalKg: number
): number {
  const pct = estimarPorcentajeReciclable(composicion)
  return r2(pesoResiduoTotalKg * (pct / 100))
}

// Categorías consideradas "renovables" (origen biológico) para el Índice
// circular — confirmado con el usuario el 2026-09-13. Ajustar aquí si el
// negocio decide otra clasificación, es la única fuente de verdad.
const CATEGORIAS_RENOVABLES = new Set(['madera', 'textil', 'cuero', 'carton_papel'])

export interface MaterialConCategoria {
  peso_kg: number
  categoria_material?: string | null
}

export interface DesgloseCircular {
  m_total_input_kg: number
  m_secundario_kg: number
  m_renovable_kg: number
  q_circular_kg: number
}

/**
 * En el contexto de Reúso, todo el material que entra a un activo ya
 * recuperado cuenta como "secundario" por definición del negocio (nunca
 * es material virgen) — no hay ambigüedad ahí. Lo único que varía es qué
 * fracción, además, es renovable (origen biológico).
 */
export function desglosarMasaCircular(composicion: MaterialConCategoria[]): DesgloseCircular {
  const m_total_input_kg = r2(composicion.reduce((s, m) => s + m.peso_kg, 0))
  const m_renovable_kg = r2(
    composicion
      .filter(m => m.categoria_material && CATEGORIAS_RENOVABLES.has(m.categoria_material))
      .reduce((s, m) => s + m.peso_kg, 0)
  )
  return {
    m_total_input_kg,
    m_secundario_kg: m_total_input_kg,
    m_renovable_kg,
    q_circular_kg: m_total_input_kg,
  }
}
