import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan } from '@/types'
import type { ClaveMódulo } from '@/lib/permisos/modulos'

// Qué módulos incluye cada plan. Es el mapa por defecto que se aplica cuando
// el super_admin cambia el plan de una empresa desde /admin/empresas/[id].
// Después puede ajustar módulo por módulo a mano si esa empresa es un caso
// especial — este sync solo pone el punto de partida coherente con el plan.
const MODULOS_POR_PLAN: Record<Plan, ClaveMódulo[]> = {
  free:      ['calculo_ambiental'],
  lab:       ['calculo_ambiental', 'dpp'],
  impulso:   ['calculo_ambiental', 'dpp', 'cotizador_crm'],
  ilimitado: ['calculo_ambiental', 'dpp', 'cotizador_crm'],
}

/**
 * Activa/desactiva las filas de `modulos_empresas` de una empresa para que
 * coincidan con los módulos de su plan. No lanza: si falla, se registra y se
 * sigue (el cambio de plan en sí no debe romperse por esto).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sincronizarModulosSegunPlan(adminClient: SupabaseClient<any>, empresaId: string, plan: Plan): Promise<void> {
  try {
    const incluidos = new Set<string>(MODULOS_POR_PLAN[plan] ?? [])

    const { data: modulos } = await adminClient.from('modulos').select('id, clave')
    if (!modulos) return

    const filas = modulos.map((m: { id: string; clave: string }) => ({
      modulo_id: m.id,
      empresa_id: empresaId,
      activo: incluidos.has(m.clave),
    }))

    // upsert por (modulo_id, empresa_id) — deja intactas las restricciones
    // por usuario (modulos_usuarios), que son otra capa.
    await adminClient.from('modulos_empresas').upsert(filas, { onConflict: 'modulo_id,empresa_id' })
  } catch (err) {
    console.error('[sync-modulos-plan] no se pudieron sincronizar los módulos:', err instanceof Error ? err.message : err)
  }
}
