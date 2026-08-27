// Agregación y color de "Top ciudades" — una sola fuente de verdad
// compartida entre la card/popup (city-chart-card.tsx) y el editor
// "Agrupar ciudades" (sales-dashboard.tsx). Antes cada archivo tenía su
// propia copia: la card ordenaba por cotizaciones/monto real, pero el
// editor listaba los grupos en el orden crudo del objeto guardado (sin
// relación con cuál ciudad pesa más) y los coloreaba con una paleta fija
// por posición en ESE orden — con eso, un grupo con más cotizaciones podía
// aparecer segundo y en un color distinto al que ya tenía en la card (bug
// real reportado: "Medellín debe ser rosa, no entiendo por qué lo pusiste
// de café"). Con una sola función de orden y una sola de color, ambos
// lugares siempre coinciden.
import { capitalizarNombre } from './capitalizar-nombre'

export interface CotizacionParaCiudad {
  total: number
  crm_clientes?: { ciudad?: string | null } | null
}

export type ModoDesgloseCiudad = 'clientes' | 'monto'

// Agrupa cotizaciones por ciudad (o por área metropolitana si aplica),
// sumando `conteo` (1 por cotización) o `monto` (su total), y ordena de
// mayor a menor peso — el mismo orden que determina el ranking visual Y el
// color (ver colorPorPosicionCiudad).
export function agregarPorCiudad(
  cotizaciones: CotizacionParaCiudad[],
  agrupar: boolean,
  ciudadesAgrupadas: Record<string, string[]> | undefined,
  modo: ModoDesgloseCiudad
): { name: string; value: number }[] {
  const contadas: Record<string, number> = {}
  cotizaciones.forEach(c => {
    const ciudadReal = (c.crm_clientes?.ciudad || 'Sin definir').trim()
    const ciudadDisplay = ciudadReal === 'Sin definir' ? 'Sin definir' : capitalizarNombre(ciudadReal)
    const aporte = modo === 'monto' ? Number(c.total) || 0 : 1
    contadas[ciudadDisplay] = (contadas[ciudadDisplay] || 0) + aporte
  })

  const agrupadas: Record<string, number> = {}
  if (agrupar && ciudadesAgrupadas) {
    const mapaGrupos: Record<string, string> = {}
    for (const [grupo, lista] of Object.entries(ciudadesAgrupadas)) {
      const grupoTitle = capitalizarNombre(grupo)
      mapaGrupos[grupoTitle.toLowerCase()] = grupoTitle
      lista.forEach(c => mapaGrupos[c.toLowerCase().trim()] = grupoTitle)
    }
    for (const [ciudad, valor] of Object.entries(contadas)) {
      if (ciudad === 'Sin definir') {
        agrupadas['Sin definir'] = (agrupadas['Sin definir'] || 0) + valor
        continue
      }
      const grupo = mapaGrupos[ciudad.toLowerCase()]
      agrupadas[grupo ?? ciudad] = (agrupadas[grupo ?? ciudad] || 0) + valor
    }
  } else {
    Object.assign(agrupadas, contadas)
  }

  return Object.entries(agrupadas)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// Escala de rosas por POSICIÓN en el ranking (directriz explícita: rosa,
// nunca verde, para el ícono y las barras de "Top ciudades"). El #1 va al
// 100% de intensidad y baja 15% por puesto hasta un mínimo de 25% para que
// nunca desaparezca — "Otros" comparte el tono del último puesto visible
// en vez de quedar gris, para que siga leyéndose como parte del mismo
// ranking. "Sin definir" es la única excepción real (gris neutro, es un
// aviso de dato faltante, no un puesto del ranking).
export function colorPorPosicionCiudad(idx: number, nombre: string): string {
  if (nombre === 'Sin definir') return 'var(--text-placeholder)'
  const puesto = nombre === 'Otros' ? 3 : idx
  const opacidad = Math.max(25, 100 - (puesto * 15))
  return `color-mix(in srgb, var(--color-rosa) ${opacidad}%, transparent)`
}
