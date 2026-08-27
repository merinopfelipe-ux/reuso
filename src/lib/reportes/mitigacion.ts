// Reporte 2 — Declaración de Mitigación Ecológica GRI/ESG. Dominio (B) Cálculo
// Ambiental, leído a través de (A) para la fuente Cotizador. Ver skill
// `dominios-datos`: las dos fuentes (Calculadora general y Cotizador) se
// combinan aquí, no con un join ad hoc en el endpoint.

export type CategoriaMaterial =
  | 'madera' | 'metal' | 'textil' | 'cuero' | 'plastico'
  | 'vidrio' | 'espuma_relleno' | 'carton_papel' | 'otros'

export type NivelConfianza = 'alta' | 'media' | 'baja'

// GHG Protocol, escala confirmada con el usuario: alta = dato primario medido
// en sitio o EPD de proveedor; media = bases científicas oficiales
// (DEFRA/Ecoinvent/IPCC); baja = estimación por analogía/promedio sectorial.
export const VALOR_CONFIANZA: Record<NivelConfianza, number> = {
  alta: 100,
  media: 85,
  baja: 50,
}

/**
 * Un material ya resuelto a su peso REAL usado (no el peso de catálogo por
 * unidad) — quien arma este array decide cómo escalar según la fuente:
 * - Calculadora general: peso_kg del material × (peso_kg_input / peso_kg_unidad del ítem).
 * - Cotizador: peso_kg del material (ya es "por unidad") × cantidad cotizada.
 * Esta función nunca ve JSON crudo de ninguna tabla, solo el resultado ya escalado.
 */
export interface MaterialUsado {
  categoria_material: CategoriaMaterial
  peso_kg: number
  factor_co2_kg: number
  factor_agua_l_kg: number
  nivel_confianza: NivelConfianza | null
}

export interface DesgloseMaterial {
  categoria_material: CategoriaMaterial
  peso_kg_total: number
  co2_evitado_kg: number
  agua_evitada_l: number
}

export interface ResultadoMitigacion {
  peso_total_kg: number
  co2_total_kg: number
  agua_total_l: number
  icd_porcentaje: number
  desglose_por_material: DesgloseMaterial[]
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

export function calcularMitigacion(materiales: MaterialUsado[]): ResultadoMitigacion {
  const porCategoria = new Map<CategoriaMaterial, { peso_kg_total: number; co2_evitado_kg: number; agua_evitada_l: number }>()

  let peso_total_kg = 0
  let co2_total_kg = 0
  let agua_total_l = 0
  let sumaConfianzaPonderada = 0

  for (const m of materiales) {
    if (m.peso_kg <= 0) continue
    const co2 = m.peso_kg * m.factor_co2_kg
    const agua = m.peso_kg * m.factor_agua_l_kg
    const confianza = VALOR_CONFIANZA[m.nivel_confianza ?? 'baja']

    peso_total_kg += m.peso_kg
    co2_total_kg += co2
    agua_total_l += agua
    sumaConfianzaPonderada += m.peso_kg * confianza

    const prev = porCategoria.get(m.categoria_material) ?? { peso_kg_total: 0, co2_evitado_kg: 0, agua_evitada_l: 0 }
    porCategoria.set(m.categoria_material, {
      peso_kg_total: prev.peso_kg_total + m.peso_kg,
      co2_evitado_kg: prev.co2_evitado_kg + co2,
      agua_evitada_l: prev.agua_evitada_l + agua,
    })
  }

  const icd_porcentaje = peso_total_kg > 0 ? r2((sumaConfianzaPonderada / peso_total_kg)) : 0

  const desglose_por_material: DesgloseMaterial[] = Array.from(porCategoria.entries())
    .map(([categoria_material, v]) => ({
      categoria_material,
      peso_kg_total: r2(v.peso_kg_total),
      co2_evitado_kg: r2(v.co2_evitado_kg),
      agua_evitada_l: r2(v.agua_evitada_l),
    }))
    .sort((a, b) => b.co2_evitado_kg - a.co2_evitado_kg)

  return {
    peso_total_kg: r2(peso_total_kg),
    co2_total_kg: r2(co2_total_kg),
    agua_total_l: r2(agua_total_l),
    icd_porcentaje,
    desglose_por_material,
  }
}
