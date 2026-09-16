import type { SupabaseClient } from '@supabase/supabase-js'

export function normalizarNombreInsumo(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

interface PesoCacheado {
  peso_kg: number
  fuente_url: string | null
  confianza: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buscarEnCache(adminClient: SupabaseClient<any>, nombre: string, unidad: string): Promise<PesoCacheado | null> {
  const { data } = await adminClient
    .from('peso_insumos_referencia')
    .select('peso_kg, fuente_url, confianza')
    .eq('nombre_normalizado', normalizarNombreInsumo(nombre))
    .eq('unidad', unidad)
    .maybeSingle()
  return data ?? null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function guardarEnCache(adminClient: SupabaseClient<any>, nombre: string, unidad: string, pesoKg: number, fuenteUrl: string, confianza: string): Promise<void> {
  await adminClient
    .from('peso_insumos_referencia')
    .upsert(
      { nombre_normalizado: normalizarNombreInsumo(nombre), unidad, peso_kg: pesoKg, fuente_url: fuenteUrl, confianza },
      { onConflict: 'nombre_normalizado,unidad' }
    )
}
