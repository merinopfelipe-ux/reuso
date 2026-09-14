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
