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
