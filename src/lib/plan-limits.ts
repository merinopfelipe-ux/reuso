import { createAdminClient } from '@/lib/supabase/admin'
import type { Plan } from '@/types'

export const NOMBRES_PLAN: Record<Plan, string> = {
  free:     'Explora',
  lab:      'Circular Lab',
  impulso:  'Impulso Sostenible',
  ilimitado: 'Impacto Ilimitado',
}

// Fuente de verdad real de límites: tabla config_planes (editable por
// super_admin desde /admin/planes, ver sql/115). Si la empresa tiene su
// propia fila en empresas_negociaciones, esa SIEMPRE gana completa sobre
// el plan global — nunca se mezclan campo por campo, para que no haya
// ambigüedad sobre qué significa un límite en NULL en cada tabla (en las
// dos, NULL = ilimitado). Si algo falla al leer la base, se cae de vuelta
// a los límites históricos fijos para no dejar el sistema sin límite por
// un error de red.
const LIMITES_RESPALDO: Record<Plan, { empleados: number; calculos_mes: number; informes_mes: number }> = {
  free:     { empleados: 1,        calculos_mes: 10,       informes_mes: 0 },
  lab:      { empleados: 5,        calculos_mes: 200,      informes_mes: 5 },
  impulso:  { empleados: 10,       calculos_mes: 200,      informes_mes: 5 },
  ilimitado: { empleados: Infinity, calculos_mes: Infinity, informes_mes: Infinity },
}

interface LimitesEfectivos {
  empleados: number
  calculos_mes: number
  informes_mes: number
}

const aInfinito = (v: number | null | undefined): number => (v === null || v === undefined ? Infinity : v)

async function obtenerLimitesEfectivos(empresaId: string, plan: Plan): Promise<LimitesEfectivos> {
  try {
    const adminClient = await createAdminClient()
    const [{ data: negociacion }, { data: config }] = await Promise.all([
      adminClient.from('empresas_negociaciones').select('limite_empleados, limite_calculos_mes, limite_informes_mes').eq('empresa_id', empresaId).maybeSingle(),
      adminClient.from('config_planes').select('limite_empleados, limite_calculos_mes, limite_informes_mes').eq('id', plan).single(),
    ])
    const fuente = negociacion ?? config
    if (!fuente) return LIMITES_RESPALDO[plan]
    return {
      empleados: aInfinito(fuente.limite_empleados),
      calculos_mes: aInfinito(fuente.limite_calculos_mes),
      informes_mes: aInfinito(fuente.limite_informes_mes),
    }
  } catch {
    return LIMITES_RESPALDO[plan]
  }
}

function inicioYFinMesActual(): { inicioMes: string; finMes: string } {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1).toISOString()
  return { inicioMes, finMes }
}

export async function checkLimiteEmpleados(empresaId: string, plan: Plan): Promise<string | null> {
  const { empleados: limite } = await obtenerLimitesEfectivos(empresaId, plan)
  if (limite === Infinity) return null

  const adminClient = await createAdminClient()
  const { count } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)

  if ((count ?? 0) >= limite) {
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} empleado. Contacta a reuso.lurdes.co para ampliar tu plan.`
  }
  return null
}

export async function checkLimiteCalculos(empresaId: string, plan: Plan): Promise<string | null> {
  const { calculos_mes: limite } = await obtenerLimitesEfectivos(empresaId, plan)
  if (limite === Infinity) return null

  const { inicioMes, finMes } = inicioYFinMesActual()
  const adminClient = await createAdminClient()
  const { count } = await adminClient
    .from('calculos')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .gte('created_at', inicioMes)
    .lt('created_at', finMes)

  if ((count ?? 0) >= limite) {
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} cálculos por mes. Contacta a reuso.lurdes.co para ampliar tu plan.`
  }
  return null
}

export async function checkLimiteInformes(empresaId: string, plan: Plan): Promise<string | null> {
  const { informes_mes: limite } = await obtenerLimitesEfectivos(empresaId, plan)
  if (limite === Infinity) return null
  if (limite === 0) {
    return `El plan ${NOMBRES_PLAN[plan]} no incluye generación de informes. Contacta a reuso.lurdes.co para ampliar tu plan.`
  }

  const { inicioMes, finMes } = inicioYFinMesActual()
  const adminClient = await createAdminClient()
  const { count } = await adminClient
    .from('informes')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .gte('created_at', inicioMes)
    .lt('created_at', finMes)

  if ((count ?? 0) >= limite) {
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} informes por mes. Contacta a reuso.lurdes.co para ampliar tu plan.`
  }
  return null
}
