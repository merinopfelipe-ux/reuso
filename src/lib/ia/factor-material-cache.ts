import type { SupabaseClient } from '@supabase/supabase-js'

// El factor de CO2/agua de un material (ej. "Hierro") es casi una constante
// física — no varía por categoría ni por empresa, a diferencia del peso por
// ítem. Mismo patrón exacto que peso-insumo-cache.ts (migración 135), aquí
// para factores_material_referencia (migración 136).

export function normalizarNombreMaterial(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

interface FactorCacheado {
  factor_co2_kg: number
  factor_agua_l_kg: number | null
  fuente_url: string | null
  fuente_titulo: string | null
  confianza: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buscarEnCache(adminClient: SupabaseClient<any>, nombre: string): Promise<FactorCacheado | null> {
  const { data } = await adminClient
    .from('factores_material_referencia')
    .select('factor_co2_kg, factor_agua_l_kg, fuente_url, fuente_titulo, confianza')
    .eq('nombre_normalizado', normalizarNombreMaterial(nombre))
    .maybeSingle()
  return data ?? null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function guardarEnCache(adminClient: SupabaseClient<any>, nombre: string, valores: FactorCacheado): Promise<void> {
  await adminClient
    .from('factores_material_referencia')
    .upsert(
      { nombre_normalizado: normalizarNombreMaterial(nombre), ...valores },
      { onConflict: 'nombre_normalizado' }
    )
}

// Versión por lotes: un solo viaje a Supabase para varios materiales a la
// vez, en vez de un `for` con `await` uno por uno (cada material de una
// categoría hacía su propio round-trip HTTP independiente).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buscarEnCacheBatch(adminClient: SupabaseClient<any>, nombres: string[]): Promise<Map<string, FactorCacheado>> {
  const normalizados = nombres.map(normalizarNombreMaterial)
  const { data } = await adminClient
    .from('factores_material_referencia')
    .select('nombre_normalizado, factor_co2_kg, factor_agua_l_kg, fuente_url, fuente_titulo, confianza')
    .in('nombre_normalizado', normalizados)

  const mapa = new Map<string, FactorCacheado>()
  for (const fila of data ?? []) {
    mapa.set(fila.nombre_normalizado, fila)
  }
  return mapa
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function guardarEnCacheBatch(adminClient: SupabaseClient<any>, filas: { nombre: string; valores: FactorCacheado }[]): Promise<void> {
  if (filas.length === 0) return
  await adminClient
    .from('factores_material_referencia')
    .upsert(
      filas.map(f => ({ nombre_normalizado: normalizarNombreMaterial(f.nombre), ...f.valores })),
      { onConflict: 'nombre_normalizado' }
    )
}
